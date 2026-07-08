import os
import asyncio
import json
import operator
from typing import Annotated, TypedDict 

from dotenv import load_dotenv

# LiveKit Imports
from livekit import rtc, api
from livekit.agents import JobContext, Agent, AgentSession
from livekit.plugins import deepgram, silero
from livekit.plugins import langchain as lk_langchain
from livekit.agents.voice.room_io.types import RoomOptions


# LangChain & LangGraph Imports
from langchain_core.messages import AIMessage
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field

# Local Utilities & Repositories
from utils.evaluator import generate_evaluation
from graphs.coding_graph import build_coding_graph
from graphs.coding_state import CodingState
from utils.api_client import get_coding_interview_data, update_room_status, fetch_room_state, save_room_state

load_dotenv()


class ChitChatEval(BaseModel):
    agent_speech: str = Field(description="The exact words Viral should say out loud naturally in the first person.")


async def interview_timer(session: AgentSession, ctx: JobContext, agent:Agent):
    await asyncio.sleep(600) # 10 Minutes
    print("🛑 Time up. Ending interview.")
    
    session.interrupt()
    await session.say("Our time is officially up. Thank you for your time today. Goodbye!", allow_interruptions=False)
    await asyncio.sleep(5)
    
    await update_room_status(ctx.room.name, "COMPLETED")
    await generate_evaluation(ctx.room.name, "coding_track", agent.full_transcript)
    
    lkapi = api.LiveKitAPI()
    await lkapi.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
    await lkapi.aclose()
    ctx.shutdown()
# ─── 3. ENTRYPOINT ───────────────────────────────────────────────────────────
async def entrypoint(ctx: JobContext):
    main_loop = asyncio.get_running_loop()
    await ctx.connect()
    print("✅ Coding Agent joined the room.")
    
    room_name = ctx.room.name
    await update_room_status(room_name, "IN_PROGRESS")
    agent_data = await get_coding_interview_data(room_name)
    
    coding_agent = Agent(
        instructions="You are Viral, a strict technical interviewer.",
        min_endpointing_delay=1.5,
        allow_interruptions=True,
    )
    coding_agent.full_transcript = ""
    is_intentional_end = False
    disconnect_timer_task = None
    cached_payload = await fetch_room_state(room_name)
    if cached_payload:
        print(f"🔄 Recovered state from Redis for {room_name}")
        initial_state = cached_payload.get("state")
        coding_agent.full_transcript = cached_payload.get("transcript", "")
        is_intentional_end = cached_payload.get("is_intentional_end", False)
    else:
        initial_state: CodingState = {
            "problem_title": agent_data.get("problem_title", "Unknown"),
            "problem_description": agent_data.get("problem_description", "No description."),
            "current_phase": "approach",
            "approach_hints_used": 0,
            "implementation_hints_used": 0,
            "latest_transcript": "",
            "next_speech": "",
            "conversation_history": []
        }


    app_graph = build_coding_graph()

    class WrapperState(TypedDict):
        messages: Annotated[list, operator.add]

    async def bridge_node(state: WrapperState):
        messages = state.get("messages", [])
        if not messages: return {"messages": []}
            
        last_msg = messages[-1]
        first_msg = messages[0] # 🛠️ FIX 2: Check the first message for system instructions!
        
        is_startup = first_msg.type == "system" and "Start the interview" in str(first_msg.content)
        is_execution = first_msg.type == "system" and "[EXECUTION_RESULT]" in str(first_msg.content)
        
        is_post_interview = initial_state.get("current_phase") == "end"

        if last_msg.type == "human" or is_startup or is_execution:
            
            # ── 1. CHIT CHAT MODE (Human speaks after interview) ──
            if is_post_interview and last_msg.type == "human":
                user_text = last_msg.content
                print("💬 Post-interview chit-chat — bypassing graph.")
                
                initial_state["conversation_history"].append(f"Candidate: {user_text}")
                history_text = "\n".join(initial_state.get("conversation_history", [])[-6:])
                
                from utils.llm_provider import get_graph_llm
                llm = get_graph_llm().with_structured_output(ChitChatEval)
                
                chat_response = await llm.ainvoke(f"""
                You are Viral, a friendly technical interviewer. The formal coding interview has already ended, and you are now making polite, casual small talk with the candidate before they leave.
                
                Here is the recent conversation history (including the candidate's latest message):
                {history_text}
                
                Based on this history, respond warmly and naturally to the candidate's latest message in 1-2 sentences. 
                Acknowledge what you were just talking about. Do not evaluate their past code.
                """)
                next_speech = chat_response.agent_speech.strip()
                
                initial_state["conversation_history"].append(f"Viral: {next_speech}")
                return {"messages": [AIMessage(content=next_speech)]}

            # ── 2. NORMAL INTERVIEW MODE ──
            if is_execution:
                exec_text = first_msg.content
                initial_state["latest_transcript"] = exec_text
                initial_state["conversation_history"].append(exec_text)
                
                if not is_post_interview:
                    coding_agent.full_transcript += f"{exec_text}\n"
                    
            elif last_msg.type == "human":
                user_text = last_msg.content
                initial_state["latest_transcript"] = user_text
                initial_state["conversation_history"].append(f"Candidate: {user_text}")
                
                if not is_post_interview:
                    coding_agent.full_transcript += f"Candidate: {user_text}\n"
            else:
                initial_state["latest_transcript"] = ""

            # Only invoke the graph if it's NOT a post-interview human message
            new_state = await app_graph.ainvoke(initial_state)
            initial_state.update(new_state)

            next_speech = initial_state.get("next_speech", "")
            if next_speech:
                initial_state["conversation_history"].append(f"Viral: {next_speech}")
                
                if not is_post_interview:
                    coding_agent.full_transcript += f"Viral: {next_speech}\n"
            
            # Snapshot to Redis!
            await save_room_state(room_name, {
                "state": initial_state,
                "transcript": coding_agent.full_transcript,
                "is_intentional_end": is_intentional_end
            })

            return {"messages": [AIMessage(content=next_speech)]}

        return {"messages": []}

    wrapper_builder = StateGraph(WrapperState)
    wrapper_builder.add_node("bridge", bridge_node)
    wrapper_builder.add_edge(START, "bridge")
    wrapper_builder.add_edge("bridge", END)
    compiled_wrapper = wrapper_builder.compile()

    graph_llm = lk_langchain.LLMAdapter(graph=compiled_wrapper)
    vad = ctx.proc.userdata["vad"]
    session = AgentSession(
        vad=vad,
        stt=deepgram.STT(),
        llm=graph_llm, 
        tts=deepgram.TTS(model="aura-asteria-en"),
    )
    await session.start(
        room=ctx.room, 
        agent=coding_agent,
        room_options=RoomOptions(close_on_disconnect=False)
    )


        # ─── WEBHOOKS ───
    @ctx.room.on("data_received")
    def on_data_received(data_packet: rtc.DataPacket):
        nonlocal is_intentional_end
        try:
            payload = json.loads(data_packet.data.decode("utf-8"))
            msg_type = payload.get("type")
            
            if msg_type == "PROCTOR_ALERT":
                msg = payload.get("message")
                print(f"⚠️ PROCTOR ALERT: {msg}")
                coding_agent.full_transcript += f"\n[SYSTEM FLAG: {msg}]\n"
                return

            if msg_type == "INTENTIONAL_END":
                print("🛑 Intentional end received!")
                is_intentional_end = True
                async def immediate_wrap_up():
                    try:
                        await update_room_status(ctx.room.name, "COMPLETED")
                        await generate_evaluation(ctx.room.name, "coding_track", coding_agent.full_transcript)
                        ctx.shutdown()
                    except Exception as e:
                        import traceback
                        print(f"❌ FATAL ERROR in immediate_wrap_up: {e}")
                        traceback.print_exc()
                asyncio.run_coroutine_threadsafe(immediate_wrap_up(), main_loop)
                return

            if msg_type == "EXECUTION_RESULT":
                code = payload.get("code", "")
                output = payload.get("output", "")
                simulated_msg = f"[EXECUTION_RESULT] Code:\n{code}\nOutput:\n{output}"
                asyncio.create_task(session.generate_reply(instructions=simulated_msg))
                
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
                await generate_evaluation(ctx.room.name, "coding_track", coding_agent.full_transcript)
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
            
            # Wrapped the async session.say() in create_task as required by LiveKit
            session.say(f"Welcome back! As I was saying: {last_response}", allow_interruptions=True)
            


    asyncio.create_task(interview_timer(session, ctx, coding_agent))

    await session.generate_reply(
        instructions="Start the interview by greeting the candidate and introducing the problem."
    )