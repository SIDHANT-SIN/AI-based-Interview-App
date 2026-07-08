import os
import asyncio
import operator
import json 
from typing import Annotated, TypedDict
from dotenv import load_dotenv
from livekit.agents import JobContext, Agent, AgentSession
from livekit.plugins import deepgram
from livekit.plugins import langchain as lk_langchain
from langchain_core.messages import AIMessage
from langgraph.graph import StateGraph, START, END
from utils.evaluator import generate_evaluation
from livekit import rtc, api
from pydantic import BaseModel, Field
from graphs.graph import build_interview_graph
from graphs.state import InterviewState
from utils.api_client import get_hr_interview_data, update_room_status, fetch_room_state, save_room_state
from livekit.agents.voice.room_io.types import RoomOptions
load_dotenv()

class ChitChatEval(BaseModel):
    agent_speech: str = Field(description="The exact words Viral should say out loud naturally in the first person.")

# ─── 1. BACKGROUND TIMER ─────────────────────────────────────────────────────
async def interview_timer(session: AgentSession, ctx: JobContext, agent: Agent):
    print("⏱️ Timer Started.")
    
    await asyncio.sleep(80)
    print("⏳ Time warning.")
    try:
        session.interrupt()
        await session.say(
            "Excuse me, just a quick time check — we have two minutes left. Please wrap up your thoughts.",
            allow_interruptions=False
        )
    except Exception as e:
        print(f"Timer warning error: {e}")
        
    await asyncio.sleep(40)
    print("🛑 Ending interview.")
    try:
        session.interrupt()
        await session.say(
            "Alright, our time is up. Thank you so much for your time today. Goodbye!",
            allow_interruptions=False
        )
    except Exception as e:
        print(f"Timer end error: {e}")
        
    await asyncio.sleep(6)
    await update_room_status(ctx.room.name, "COMPLETED")
    transcript = getattr(agent, "full_transcript", "")
    await generate_evaluation(ctx.room.name, "hr_track", transcript)
    
    print("🧹 Deleting room...")
    lkapi = api.LiveKitAPI()
    await lkapi.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
    await lkapi.aclose()
    ctx.shutdown()

# ─── 2. ENTRYPOINT ───────────────────────────────────────────────────────────
async def entrypoint(ctx: JobContext):
    main_loop = asyncio.get_running_loop()
    await ctx.connect()
    print("✅ Agent joined the room.")

    room_name = ctx.room.name
    await update_room_status(room_name, "IN_PROGRESS")
    agent_data = await get_hr_interview_data(room_name)

    vad = ctx.proc.userdata["vad"]

    # 1. Initialize the LiveKit Agent
    hr_agent = Agent(
        instructions="You are Viral, a strict professional interviewer.",
        min_endpointing_delay=1.5,
        allow_interruptions=True,
    )
    hr_agent.full_transcript = ""
    is_intentional_end = False
    disconnect_timer_task = None

    cached_payload = await fetch_room_state(room_name)
    if cached_payload:
        print(f"🔄 Recovered state from Redis for {room_name}")
        initial_state = cached_payload.get("state")
        hr_agent.full_transcript = cached_payload.get("transcript", "")
        is_intentional_end = cached_payload.get("is_intentional_end", False)
    else:
        # 2. Build the Initial State Dictionary for YOUR Graph
        initial_state: InterviewState = {
            "resume_summary": agent_data["dynamic_resume"],
            "tech_questions": agent_data["tech_q_list"],
            "hr_questions": agent_data["hr_q_list"],
            "current_phase": "intro",
            "tech_index": 0,
            "hr_index": 0,
            "latest_transcript": "",
            "next_speech": "",
            "conversation_history": []
        }

    app_graph = build_interview_graph()

    # We create a tiny LangGraph here to satisfy LLMAdapter's strict requirements
    class WrapperState(TypedDict):
        messages: Annotated[list, operator.add]

    async def bridge_node(state: WrapperState):
        messages = state.get("messages", [])
        if not messages:
            return {"messages": []}
            
        last_msg = messages[-1]
        
        # Check if it's the startup instruction or a user speaking
        is_startup = last_msg.type == "system" and "Start the interview" in str(last_msg.content)
        
        # Check if the interview is already over
        is_post_interview = initial_state.get("current_phase") == "end"

        if last_msg.type == "human" or is_startup:
            if last_msg.type == "human":
                user_text = last_msg.content
                initial_state["latest_transcript"] = user_text
                
                if is_post_interview:
                    # ── 1. CHIT CHAT MODE (Bypass Graph & Transcript) ──
                    print("💬 Post-interview chit-chat — bypassing graph.")
                    
                    # Save user text to memory so it doesn't forget context
                    initial_state["conversation_history"].append(f"Candidate: {user_text}")
                    history_text = "\n".join(initial_state.get("conversation_history", [])[-6:])
                    
                    from utils.llm_provider import get_graph_llm
                    llm = get_graph_llm().with_structured_output(ChitChatEval)
                    
                    # Simple, cheap LLM call (AWAIT AND AINVOKE)
                    chat_response = await llm.ainvoke(f"""
                    You are Viral, a friendly HR interviewer. The formal interview has already ended, and you are now making polite, casual small talk with the candidate before they leave.
                    
                    Here is the recent conversation history (including the candidate's latest message):
                    {history_text}
                    
                    Based on this history, respond warmly and naturally to the candidate's latest message in 1-2 sentences.
                    Acknowledge what you were just talking about. Do not ask new interview questions.
                    """)
                    next_speech = chat_response.agent_speech.strip()
                    
                    # Save AI response to memory
                    initial_state["conversation_history"].append(f"Viral: {next_speech}")
                    
                    # Return immediately! Do not run the graph.
                    return {"messages": [AIMessage(content=next_speech)]}
                else:
                    # ── 2. NORMAL INTERVIEW MODE ──
                    # Only record to transcript if we are still interviewing
                    initial_state["conversation_history"].append(f"Candidate: {user_text}")
                    hr_agent.full_transcript += f"Candidate: {user_text}\n"
            else:
                initial_state["latest_transcript"] = ""

            new_state = await app_graph.ainvoke(initial_state)
            initial_state.update(new_state)

            next_speech = initial_state.get("next_speech", "")
            if next_speech:
                initial_state["conversation_history"].append(f"Viral: {next_speech}")
                hr_agent.full_transcript += f"Viral: {next_speech}\n"
                
            # Snapshot to Redis!
            await save_room_state(room_name, {
                "state": initial_state,
                "transcript": hr_agent.full_transcript,
                "is_intentional_end": is_intentional_end
            })

            return {"messages": [AIMessage(content=next_speech)]}
        
        return {"messages": []}

    wrapper_builder = StateGraph(WrapperState)
    wrapper_builder.add_node("bridge", bridge_node)
    wrapper_builder.add_edge(START, "bridge")
    wrapper_builder.add_edge("bridge", END)
    compiled_wrapper = wrapper_builder.compile()
    # ─────────────────────────────────────────────────────────────────────────

    # 3. Pass the compiled wrapper to the adapter (Fixes the TypeError)
    graph_llm = lk_langchain.LLMAdapter(graph=compiled_wrapper)

    session = AgentSession(
        vad=vad,
        stt=deepgram.STT(),
        llm=graph_llm, 
        tts=deepgram.TTS(model="aura-asteria-en"),
    )

    await session.start(
        room=ctx.room, 
        agent=hr_agent,
        room_options=RoomOptions(close_on_disconnect=False)
    )

    @ctx.room.on("data_received")
    def on_data_received(data_packet: rtc.DataPacket):
        nonlocal is_intentional_end
        try:
            payload = json.loads(data_packet.data.decode("utf-8"))
            if payload.get("type") == "PROCTOR_ALERT":
                msg = payload.get("message")
                print(f"⚠️ PROCTOR ALERT: {msg}")
                hr_agent.full_transcript += f"\n[SYSTEM FLAG: {msg}]\n"
                
            elif payload.get("type") == "INTENTIONAL_END":
                print("🛑 Intentional end received!")
                is_intentional_end = True
                async def immediate_wrap_up():
                    try:
                        await update_room_status(ctx.room.name, "COMPLETED")
                        await generate_evaluation(ctx.room.name, "hr_track", hr_agent.full_transcript)
                        ctx.shutdown()
                    except Exception as e:
                        import traceback
                        print(f"❌ FATAL ERROR in immediate_wrap_up: {e}")
                        traceback.print_exc()
                asyncio.run_coroutine_threadsafe(immediate_wrap_up(), main_loop)
        except Exception:
            pass

    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant):
        nonlocal disconnect_timer_task
        if is_intentional_end:
            return 
            
        print("🚪 Dropped unexpectedly. Starting 5-minute timer...")
        async def delayed_wrap_up():
            try:
                await asyncio.sleep(300)
                await update_room_status(ctx.room.name, "COMPLETED")
                await generate_evaluation(ctx.room.name, "hr_track", hr_agent.full_transcript)
                ctx.shutdown()
            except asyncio.CancelledError:
                print("✅ Grace period successfully cancelled.")
                
        disconnect_timer_task = asyncio.create_task(delayed_wrap_up())

    @ctx.room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        nonlocal disconnect_timer_task
        if disconnect_timer_task:
            disconnect_timer_task.cancel()
            disconnect_timer_task = None
            
            last_response = initial_state.get("next_speech", "Are you ready to continue?")
            if not last_response: last_response = "Are you ready to continue?"
            
            session.say(f"Welcome back! As I was saying: {last_response}", allow_interruptions=True)

    asyncio.create_task(interview_timer(session, ctx, hr_agent))

    # Trigger the first greeting
    await session.generate_reply(
        instructions="Start the interview by greeting the user and asking for their name and degree."
    )