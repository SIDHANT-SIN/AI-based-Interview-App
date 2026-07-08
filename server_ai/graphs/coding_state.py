from typing import TypedDict

class CodingState(TypedDict):
    # ─── INGESTED DATA ───
    problem_title: str
    problem_description: str
    
    # ─── INTERVIEW TRACKING ───
    current_phase: str             # "approach", "implementation", "complexity", "end"
    approach_hints_used: int       # 🛠️ Capped at 1 for Approach
    implementation_hints_used: int # 🛠️ Capped at 1 for Coding
    
    # ─── I/O ───
    latest_transcript: str       
    next_speech: str             
    conversation_history: list