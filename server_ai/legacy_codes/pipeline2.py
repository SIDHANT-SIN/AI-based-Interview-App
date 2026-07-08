import asyncio
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, stt
from livekit.plugins import deepgram
from livekit import rtc
from brain import AIBrain
from voice import AIVoice

load_dotenv()

async def entrypoint(ctx: JobContext):
    # 1. INITIALIZE AI PLUGINS FIRST
    stt_provider = deepgram.STT()
    brain = AIBrain()
    voice = AIVoice()
    
    # EXPLICIT INITIALIZATION FIX: Use 24000 instead of voice.tts.sample_rate
    source = rtc.AudioSource(sample_rate=24000, num_channels=1) 
    track = rtc.LocalAudioTrack.create_audio_track("ai-voice", source)

    # 2. DEFINE THE DIAGNOSTIC EVENT LISTENERS
    @ctx.room.on("participant_connected")
    def on_participant_connected(participant):
        print(f"👀 [STEP 1] Participant joined: {participant.identity}")

    @ctx.room.on("track_published")
    def on_track_published(publication, participant):
        print(f"📡 [STEP 2] Track published by {participant.identity} (Type: {publication.kind})")

    @ctx.room.on("track_subscription_failed")
    def on_track_subscription_failed(participant, track_sid, error):
        print(f"❌ [ERROR] Failed to subscribe to {participant.identity}. Reason: {error}")

    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track, publication, participant):
        print(f"✅ [STEP 3] Track SUBSCRIBED from {participant.identity} (Kind: {track.kind})")
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            print(f"🎤 Audio pipe open! Sending to Deepgram...")
            asyncio.create_task(transcribe_track(stt_provider, track, participant, brain, voice, source))
        else:
            print(f"⚠️ Ignored non-audio track.")

    # 3. NOW CONNECT THE AGENT
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    print("✅ Agent joined the room.")
    
    # 4. PUBLISH THE AI's VOICE
    options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
    publication = await ctx.room.local_participant.publish_track(track, options)
    print("📢 AI Voice published to room.")


# --- The Audio processing pipeline ---
async def transcribe_track(stt_provider, track, participant, brain, voice, source):
    stt_stream = stt_provider.stream()
    rtc_audio_stream = rtc.AudioStream(track)

    # A: Push audio from the room into Deepgram
    async def forward_audio():
        async for audio_event in rtc_audio_stream:
            stt_stream.push_frame(audio_event.frame)
            
    asyncio.create_task(forward_audio())

    # B: Pull text from Deepgram and process it
    async for event in stt_stream:
        if event.type == stt.SpeechEventType.FINAL_TRANSCRIPT:
            transcript = event.alternatives[0].text
            if transcript:
                print(f"\n🗣️ User: {transcript}")
                
                # 1. Open the Deepgram TTS pipe
                tts_stream = voice.stream()
                
                # 2. CREATE TASK A: Constantly pull audio from Deepgram and push to the room
                async def play_audio():
                    try:
                        async for audio_event in tts_stream:
                            await source.capture_frame(audio_event.frame)
                            # YIELD FIX: Let LiveKit process the frame
                            await asyncio.sleep(0) 
                    except Exception as e:
                        print(f"❌ Error playing audio: {e}")
                        
                audio_task = asyncio.create_task(play_audio())
                
                # 3. CREATE TASK B: Pull text from Groq and push into Deepgram
                print("🤖 AI: ", end="")
                async for text_chunk in brain.stream_reply(transcript):
                    print(text_chunk, end="", flush=True) 
                    tts_stream.push_text(text_chunk)      
                    
                print("\n") 
                
                # 4. END_INPUT FIX: Tell Deepgram to close the pipe instead of flushing
                tts_stream.end_input() 
                await audio_task 

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))