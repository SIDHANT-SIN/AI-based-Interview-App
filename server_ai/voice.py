# server-ai/voice.py
from livekit.plugins import deepgram

class AIVoice:
    def __init__(self):
        # Initialize Deepgram's TTS engine
        # You can choose different voices like 'asteria', 'luna', 'stella', 'orion'
        self.tts = deepgram.TTS(model="aura-asteria-en")

    def synthesize(self, text: str):
        """Takes text and returns a TTS stream."""
        print("🔊 [Synthesizing voice...]")
        # This creates a stream of audio frames
        return self.tts.synthesize(text)