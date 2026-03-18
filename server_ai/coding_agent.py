import os
import asyncio
import json
from dotenv import load_dotenv

from evaluator import generate_evaluation
from livekit import rtc, api 
from livekit.agents import JobContext, WorkerOptions, cli, Agent, AgentSession, llm 
from livekit.plugins import deepgram, openai, silero

# Import our new graph!
from coding_graph import build_coding_graph, CodingState

load_dotenv()

# --- 1. The Background Timer Task (Modeled after HR track) ---
async def interview_timer(session: AgentSession, ctx: JobContext, agent: 'CodingInterviewerAgent'):
    print("⏱️ Timer Started.")
    
    await asyncio.sleep(30) 
    print("⏳ Time warning. Injecting warning.")
    
    # 1. Forcefully stop the AI if it is currently in the middle of a sentence
    session.interrupt()
    
    # 2. Use .say() instead of .generate_reply() to bypass the LLM and speak IMMEDIATELY.
    # allow_interruptions=False means the user cannot talk over this specific warning.
    await session.say(
        "Excuse me, I just want to give a quick time check. We have exactly two minutes left. Please wrap up your final thoughts.", 
        allow_interruptions=False
    )
    
    await asyncio.sleep(30)
    print("🛑 Time up. Ending interview.")
    
    # 3. Stop the AI again
    session.interrupt()
    
    # 4. Force the final goodbye
    await session.say(
        "Alright, our time is officially up. Thank you so much for your time today, I'll be ending the session now. Goodbye!",
        allow_interruptions=False
    )
    
    # Wait for Viral to finish speaking
    await asyncio.sleep(6) 
    
    print("📝 Sending transcript to the Evaluator...")
    # 🛠️ Notice we removed asyncio.create_task here for a clean await
    await generate_evaluation(ctx.room.name, agent.full_transcript)
    
    print("🧹 Backend Authority: Deleting room and kicking user...")
    lkapi = api.LiveKitAPI()
    await lkapi.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
    await lkapi.aclose()
    
    ctx.shutdown()
# ------------------------------------
# --- 2. The Persona (Powered by the Graph) ---
class CodingInterviewerAgent(Agent):
    def __init__(self, graph_app, problem_title: str, problem_description: str):
        # Placeholder prompt, graph overwrites this immediately
        super().__init__(instructions="You are Viral. Wait for the user to speak.")
        
        self.app_graph = graph_app
        self.full_transcript = "" # Tracker for the Grader!
        
        # Initialize the state exactly like the HR agent
        self.current_state: CodingState = {
            "problem_title": problem_title,
            "problem_description": problem_description,
            "system_prompt": ""
        }

    # The Magic Hook!
    async def llm_node(self, chat_ctx: llm.ChatContext, *args, **kwargs):
        messages_list = chat_ctx.messages() if callable(chat_ctx.messages) else chat_ctx.messages
        last_message = messages_list[-1]
        
        # Only run the graph if the user actually spoke
        if last_message.role == "user" and last_message.content:
            user_text = last_message.content
            if isinstance(user_text, list):
                user_text = " ".join([str(c) for c in user_text])
                
            print(f"\n🗣️ User Said: {user_text}")
            self.full_transcript += f"User: {user_text}\n"
            
            # 1. Update State & Run the Graph (The Puppet Master)
            new_state = self.app_graph.invoke(self.current_state)
            self.current_state.update(new_state)
            
            # 2. Hot-Swap the System Prompt
            if messages_list[0].role == "system":
                messages_list[0].content = self.current_state["system_prompt"]
                
        # Also track what Viral says for the final report
        elif last_message.role == "assistant" and last_message.content:
            viral_text = last_message.content
            if isinstance(viral_text, list):
                viral_text = " ".join([str(c) for c in viral_text])
            self.full_transcript += f"Viral: {viral_text}\n"

        return super().llm_node(chat_ctx, *args, **kwargs)
# --------------------------------------------

async def entrypoint(ctx: JobContext):
    await ctx.connect()
    print("✅ Coding Agent joined the room.")

    room_name = ctx.room.name
    
    # Default problem fallback
    problem_title = "Two Sum"
    problem_description = "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`."
    
    # Check the database
    try:
        with open("database.json", "r") as f:
            db = json.load(f)
            if room_name in db and "problem" in db[room_name]:
                problem_title = db[room_name]["problem"].get("title", problem_title)
                problem_description = db[room_name]["problem"].get("description", problem_description)
    except FileNotFoundError:
        print("⚠️ database.json not found yet, using default Two Sum problem.")
    
    # Initialize LLM
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
    app_graph = build_coding_graph()
    
    coding_agent = CodingInterviewerAgent(
        graph_app=app_graph, 
        problem_title=problem_title, 
        problem_description=problem_description
    )
    
    await session.start(
        room=ctx.room, 
        agent=coding_agent
    )
    
    # --- 3. THE HIDDEN WHISPER (Data Channel Listener) ---
    @ctx.room.on("data_received")
    def on_data_received(data_packet: rtc.DataPacket):
        message = data_packet.data.decode('utf-8')
        try:
            payload = json.loads(message)
            if payload.get("type") == "EXECUTION_RESULT":
                print(f"📥 Received code and execution result! Waking up Viral...")
                user_code = payload.get("code", "No code provided.")
                terminal_output = payload.get("output", "No output.")
                
                prompt = f"""The user just ran their code. 
                Here is the code they wrote:
                {user_code}
                Here is the terminal execution output:
                {terminal_output}
                Review their code and the output, and give brief, 1-2 sentence feedback out loud."""
                
                session.generate_reply(instructions=prompt)
                
        except json.JSONDecodeError:
            if "[EXECUTION_RESULT]" in message:
                prompt = f"The user just ran their code. Terminal output: {message}. Give brief feedback out loud."
                session.generate_reply(instructions=prompt)
    # ------------------------------------------------------

    # Start the timer!
    asyncio.create_task(interview_timer(session, ctx, coding_agent))

    # Kick off the conversation
    await session.generate_reply(
        instructions="Greet the user as Viral, introduce the problem to them, and ask them to explain their approach."
    )

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))