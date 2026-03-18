from typing import TypedDict

# We use TypedDict to enforce a strict structure for our Graph's memory
class InterviewState(TypedDict):
    current_phase: str          # "intro", "project", "hr", or "wrap_up"
    resume_summary: str    
    recent_context: str     # The text summary of the user's PDF
    latest_transcript: str      # The last thing the user just said
    project_q_count: int        # How many project questions asked (Goal: 10)
    hr_q_count: int             # How many HR questions asked (Goal: 5)
    system_prompt: str          # The output: The new instructions for LiveKit