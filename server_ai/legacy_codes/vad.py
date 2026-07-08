# --- ADD THIS BLOCK FOR INTERRUPTIONS ---
        if event.type == stt.SpeechEventType.INTERIM_TRANSCRIPT and event.alternatives[0].text:
            # If you speak, and the AI is currently talking...
            if active_audio_task and not active_audio_task.done():
                print("🛑 [BARGE-IN] You interrupted! Stopping AI...")
                active_audio_task.cancel() # Kill the audio stream instantly!
        # ----------------------------------------