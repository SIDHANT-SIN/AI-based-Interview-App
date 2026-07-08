from typing import TypedDict, List, Dict

class InterviewState(TypedDict):
    # ─── INGESTED DATA ───
    resume_summary: str
    tech_questions: List[Dict[str, str]] # List of {"question": "...", "expected_answer": "..."}
    hr_questions: List[Dict[str, str]]   # List of {"question": "...", "expected_answer": "..."}
    
    # ─── INTERVIEW TRACKING ───
    current_phase: str           # "intro", "tech", "hr", "end"
    tech_index: int              # Which of the 5 tech questions
    hr_index: int                # Which of the 2 HR questions
    
    # ─── I/O ───
    latest_transcript: str       # Input: What the user just said (from Deepgram STT)
    next_speech: str             # Output: What Viral should say next (sent to Deepgram TTS)
    conversation_history: list