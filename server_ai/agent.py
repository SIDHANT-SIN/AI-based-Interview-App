import os
import asyncio
import json
from dotenv import load_dotenv
from livekit.agents import JobContext, WorkerOptions, cli, Agent, AgentSession, llm 
from livekit.plugins import deepgram, openai, silero
from evaluator import generate_evaluation # 🛠️ ADD THIS
from livekit import rtc, api
from graph import build_interview_graph
from state import InterviewState
from livekit.agents import JobRequest

load_dotenv()

# --- 1. The Background Timer Task ---
# 🛠️ Added agent parameter
async def interview_timer(session: AgentSession, ctx: JobContext, agent: 'InterviewerAgent'):
    print("⏱️ 10-Minute Timer Started.")
    
    await asyncio.sleep(80) # Adjust to your desired warning time
    print("⏳ Time warning. Injecting warning.")
    
    # 🛠️ Forcefully interrupt the AI
    session.interrupt()
    await session.say(
        "Excuse me, I just want to give a quick time check. We have exactly two minutes left. Please wrap up your final thoughts.", 
        allow_interruptions=False
    )
    
    await asyncio.sleep(40) # Adjust to your desired end time
    print("🛑 Time up. Ending interview.")
    
    # 🛠️ Forcefully interrupt for the goodbye
    session.interrupt()
    await session.say(
        "Alright, our time is officially up. Thank you so much for your time today, I'll be ending the session now. Goodbye!",
        allow_interruptions=False
    )
    
    # Wait for Viral to finish speaking
    await asyncio.sleep(6) 
    
    print("📝 Sending transcript to the Evaluator...")
    # 🛠️ Added "hr_track"
    await generate_evaluation(ctx.room.name, "hr_track", agent.full_transcript)
    print("🧹 Backend Authority: Deleting room and kicking user...")
    lkapi = api.LiveKitAPI()
    await lkapi.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
    await lkapi.aclose()
    
    ctx.shutdown()
# ------------------------------------# ------------------------------------

# --- 2. The Persona (Powered by the Graph) ---
class InterviewerAgent(Agent):
    def __init__(self, graph_app,resume_text: str):
        # Start with a generic placeholder. The Graph will immediately overwrite this.
        super().__init__(instructions="You are Alex. Wait for the user to speak.")
        
        # Give the Agent its own copy of the Graph and State
        self.app_graph = graph_app
        self.full_transcript = ""
        self.current_state: InterviewState = {
            "current_phase": "intro",
            "resume_summary": resume_text,
            "latest_transcript": "",
            "recent_context": "",
            "project_q_count": 0,
            "hr_q_count": 0,
            "system_prompt": ""
        }

    # THIS IS THE MAGIC 1.4.6 HOOK! 
    async def llm_node(self, chat_ctx: llm.ChatContext, *args, **kwargs):
        # Safely handle the LiveKit 1.4+ messages method
        messages_list = chat_ctx.messages() if callable(chat_ctx.messages) else chat_ctx.messages
        
        last_message = messages_list[-1]
        
        # Only run the graph if the user actually spoke
        if last_message.role == "user" and last_message.content:
            user_text = last_message.content
            if isinstance(user_text, list):
                user_text = " ".join([str(c) for c in user_text])
                
            print(f"\n🗣️ User Said: {user_text}")
            self.full_transcript += f"User: {user_text}\n"
            recent_messages = messages_list[-7:]
            formatted_script = ""
            
            for msg in recent_messages:
                # We skip the system prompt so we don't confuse the evaluator
                if msg.role == "system":
                    continue
                    
                # Clean up the text just in case LiveKit wrapped it in a list
                msg_content = msg.content
                if isinstance(msg_content, list):
                    msg_content = " ".join([str(c) for c in msg_content])
                
                # Label who is speaking
                speaker = "Interviewer" if msg.role == "assistant" else "User"
                formatted_script += f"{speaker}: {msg_content}\n"
                
            self.current_state["recent_context"] = formatted_script.strip()
            # ----------------------------------------------------
            
            # 1. Update State & Run the Graph (The Puppet Master)
            self.current_state["latest_transcript"] = user_text
            new_state = self.app_graph.invoke(self.current_state)
            self.current_state.update(new_state)
            
            # 2. Hot-Swap the System Prompt
            if messages_list[0].role == "system":
                messages_list[0].content = self.current_state["system_prompt"]
                print(f"🔄 Brain Hot-Swapped! Phase: {self.current_state['current_phase']}")
        elif last_message.role == "assistant" and last_message.content:
            viral_text = last_message.content
            if isinstance(viral_text, list):
                viral_text = " ".join([str(c) for c in viral_text])
            self.full_transcript += f"Viral: {viral_text}\n"       
        # 3. FIX: Return the stream directly. No 'await' allowed here!
        return super().llm_node(chat_ctx, *args, **kwargs)
    #--------------------------------------------

async def entrypoint(ctx: JobContext):
    await ctx.connect()
    print("✅ Agent joined the room.")

    room_name = ctx.room.name
    dynamic_resume = "Software Engineer candidate." # A safe fallback just in case
    
    try:
        with open("database.json", "r") as f:
            db = json.load(f)
            # 🛠️ Look specifically inside the hr_track bucket!
            if room_name in db and "hr_track" in db[room_name] and "resume_text" in db[room_name]["hr_track"]:
                dynamic_resume = db[room_name]["hr_track"]["resume_text"]
                print(f"📄 Found dynamic resume for room: {room_name}")
            else:
                print(f"⚠️ No resume found for {room_name}, using default.")
    except FileNotFoundError:
        print("⚠️ database.json not found yet, using default resume.")
    
    groq_llm = openai.LLM(
        base_url="https://api.groq.com/openai/v1",
        api_key=os.getenv("GROQ_API_KEY"),
        model="openai/gpt-oss-120b",
        temperature=0.0
    )

    session = AgentSession(
        vad=silero.VAD.load(),                     
        stt=deepgram.STT(),                        
        llm=groq_llm,                              
        tts=deepgram.TTS(model="aura-asteria-en"), 
    )

    # Build the graph and inject it directly into our custom Agent
    app_graph = build_interview_graph()
    
    hr_agent = InterviewerAgent(graph_app=app_graph, resume_text=dynamic_resume)
    
    await session.start(
        room=ctx.room, 
        agent=hr_agent
    )
    # 🛠️ ADD THIS: Listen for the user closing the tab or clicking End Interview
    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant):
        print("🚪 User disconnected! Generating summary before shutting down...")
        
        # Create a quick wrap-up task so it doesn't shut down before Groq finishes
        async def wrap_up():
            # NOTE: Use "coding_track" for the coding_agent.py file!
            await generate_evaluation(ctx.room.name, "hr_track", hr_agent.full_transcript)
            ctx.shutdown()
            
        asyncio.create_task(wrap_up())
    
    # 🛠️ Pass the agent into the timer!
    asyncio.create_task(interview_timer(session, ctx, hr_agent))

    await session.generate_reply(
        instructions="Greet the user warmly, introduce yourself as Viral, and ask them to briefly introduce themselves."
    )

