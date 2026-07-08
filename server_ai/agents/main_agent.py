import os
import utils.llm_provider  # Registers LiveKit plugins on the main thread — must be first
from dotenv import load_dotenv
from livekit.agents import WorkerOptions, cli, JobContext, JobRequest, JobProcess
from livekit.plugins import silero
from agents.agent import entrypoint as hr_entrypoint
from agents.coding_agent import entrypoint as coding_entrypoint
load_dotenv()

def prewarm(proc: JobProcess):
    """
    Runs once per worker process before any jobs start.
    Loads the VAD model into memory. Database connections must NOT happen here
    to avoid event loop conflicts.
    """
    print("🔄 Prewarming worker...")
    # Load VAD model into memory once — expensive operation
    proc.userdata["vad"] = silero.VAD.load(
        min_silence_duration=1.2,   # Wait 1.2s of silence before ending turn
        activation_threshold=0.6, 
        force_cpu=False 
    )
    print("✅ Worker prewarmed: VAD loaded.")

async def master_entrypoint(ctx: JobContext):
    room_name = ctx.room.name
    print(f"🏢 Master Entrypoint activated for room: {room_name}")
    if room_name.startswith("hr-room"):
        print("👔 Routing to HR logic...")
        await hr_entrypoint(ctx)
    elif room_name.startswith("coding-room"):
        print("💻 Routing to Coding logic...")
        await coding_entrypoint(ctx)
    else:
        print(f"❌ Unknown room prefix in '{room_name}'. Closing session.")
        ctx.shutdown()

async def request_fnc(req: JobRequest) -> None:
    if req.room.name.startswith(("hr-room", "coding-room")):
        print(f"✅ Accepted: {req.room.name}")
        await req.accept()
    else:
        print(f"🛑 Rejecting: {req.room.name}")
        await req.reject()

if __name__ == "__main__":
    print("🚀 Master Factory Booting Up...")
    cli.run_app(WorkerOptions(
        entrypoint_fnc=master_entrypoint,
        request_fnc=request_fnc,
        prewarm_fnc=prewarm,
    ))