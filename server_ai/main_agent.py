import os
from dotenv import load_dotenv
from livekit.agents import WorkerOptions, cli, JobContext, JobRequest

# 🛠️ 1. Import your track entrypoints
from agent import entrypoint as hr_entrypoint
from coding_agent import entrypoint as coding_entrypoint

load_dotenv()

# 🛠️ 2. THE ROUTER (The actual brain)
async def master_entrypoint(ctx: JobContext):
    """
    This is the master entrypoint. Instead of connecting blindly, 
    it decides which track's logic to execute.
    """
    room_name = ctx.room.name
    print(f"🏢 Master Entrypoint activated for room: {room_name}")

    if room_name.startswith("hr-room"):
        print("👔 Routing to HR logic...")
        # We simply pass the context to your existing HR entrypoint
        await hr_entrypoint(ctx) 
        
    elif room_name.startswith("coding-room"):
        print("💻 Routing to Coding logic...")
        # We simply pass the context to your existing Coding entrypoint
        await coding_entrypoint(ctx)
        
    else:
        print(f"❌ Unknown room prefix in '{room_name}'. Closing session.")

# 🛠️ 3. THE TRAFFIC COP (The door bouncer)
async def request_fnc(req: JobRequest) -> None:
    """Just checks if the room name is valid before letting them in."""
    if req.room.name.startswith(("hr-room", "coding-room")):
        print(f"✅ Master Dispatcher accepted request for: {req.room.name}")
        await req.accept() # Just accept; the router above handles the rest
    else:
        print(f"🛑 Rejecting unknown room: {req.room.name}")
        await req.reject()

if __name__ == "__main__":
    print("🚀 Master Factory Booting Up...")
    cli.run_app(WorkerOptions(
        entrypoint_fnc=master_entrypoint, # 👈 Point this to our router!
        request_fnc=request_fnc
    ))