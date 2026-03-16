import asyncio
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, stt
from livekit.plugins import deepgram
from livekit import rtc
from brain import AIBrain
from voice import AIVoice

load_dotenv()

async def entrypoint(ctx: JobContext):
    # 1. Join Room & Setup AI Plugins
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    print("✅ Agent joined the room.")
    
    stt_provider = deepgram.STT()
    brain = AIBrain()
    voice = AIVoice()
    
    # FIX 1: Dynamically match Deepgram's exact sample rate to prevent distortion/crashing
    source = rtc.AudioSource(voice.tts.sample_rate, voice.tts.num_channels) 
    track = rtc.LocalAudioTrack.create_audio_track("ai-voice", source)
    
    # FIX 2: You MUST use the exact LiveKit TrackSource Enum, not a string
    options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
    
    publication = await ctx.room.local_participant.publish_track(track, options)
    print("📢 AI Voice published to room.")
    
    # 2. Listen for User Microphones
    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track, publication, participant):
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            print(f"🎤 Subscribed to {participant.identity}'s microphone.")
            asyncio.create_task(transcribe_track(stt_provider, track, participant, brain, voice, source))

# 3. The Audio processing pipeline
async def transcribe_track(stt_provider, track, participant, brain, voice, source):
    stt_stream = stt_provider.stream()
    rtc_audio_stream = rtc.AudioStream(track)

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
                
                # Send text to Groq/Llama
                ai_response = await brain.generate_reply(transcript)
                print(f"🤖 AI: {ai_response}\n")
                
                # Convert Llama's text into Deepgram Audio
                audio_stream = voice.synthesize(ai_response)
                
                # C: Push the audio frames back to the React frontend!
                async for audio_event in audio_stream:
                    await source.capture_frame(audio_event.frame)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))