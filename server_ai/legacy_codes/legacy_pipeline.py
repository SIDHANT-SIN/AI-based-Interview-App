import asyncio
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, stt
from livekit.plugins import deepgram
from livekit.rtc import TrackKind, AudioStream

load_dotenv()

async def entrypoint(ctx: JobContext):
    # 1. Join Room & Setup AI Plugins
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    print("✅ Agent joined the room.")
    
    stt_provider = deepgram.STT()

    # 2. Listen for User Microphones
    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track, publication, participant):
        if track.kind == TrackKind.KIND_AUDIO:
            print(f"🎤 Subscribed to {participant.identity}'s microphone.")
            asyncio.create_task(transcribe_track(stt_provider, track, participant))

# 3. The Audio processing pipeline
async def transcribe_track(stt_provider, track, participant):
    stt_stream = stt_provider.stream()
    rtc_audio_stream = AudioStream(track)

    # A: Push audio from the room into Deepgram
    async def forward_audio():
        async for audio_event in rtc_audio_stream:
            stt_stream.push_frame(audio_event.frame)
            
    asyncio.create_task(forward_audio())

    # B: Pull text from Deepgram and print it
    async for event in stt_stream:
        if event.type == stt.SpeechEventType.FINAL_TRANSCRIPT:
            transcript = event.alternatives[0].text
            if transcript:
                print(f"📝 {participant.identity}: {transcript}")

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))