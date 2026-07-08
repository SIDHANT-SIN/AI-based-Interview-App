from pydantic import BaseModel, Field
from graphs.state import InterviewState
from utils.llm_provider import get_graph_llm

# ─── STRUCTURED OUTPUT SCHEMAS ───
class IntroEval(BaseModel):
    has_name: bool = Field(description="True if the user has provided their name at ANY point in the conversation history.")
    has_degree: bool = Field(description="True if the user has provided their degree/branch at ANY point in the conversation history.")

class AnswerEval(BaseModel):
    decision: str = Field(description="Must be exactly: 'move_on' (answered correctly), 'skip' (user doesn't know, forgot, or gives up), or 'follow_up' (attempted but incomplete).")
    missing_piece: str = Field(description="If decision is 'follow_up', what specific 1-3 words are missing? Otherwise empty.")

# ─── NODE 1: INTRO ───
def intro_node(state: InterviewState) -> dict:
    transcript = state.get("latest_transcript", "").strip()
    
    if not transcript:
        return {
            "next_speech": "Hello, I am Viral. Thank you for joining me today. Let's start with a brief introduction. Could you tell me your full name and the degree you are pursuing?"
        }

    history = state.get("conversation_history", [])
    history_text = "\n".join(history[-12:])

    llm = get_graph_llm().with_structured_output(IntroEval)
    eval_result = llm.invoke(f"""
    Recent Conversation History:
    {history_text}
    
    Based on the ENTIRE conversation history above, did the user provide BOTH their name and degree?
    """)
    
    if eval_result.has_name and eval_result.has_degree:
        first_q = state["tech_questions"][0]["question"]
        return {
            "current_phase": "tech",
            "next_speech": f"Nice to meet you. Let's jump straight into the technical round. {first_q}"
        }
    else:
        missing = []
        if not eval_result.has_name: missing.append("name")
        if not eval_result.has_degree: missing.append("degree program")
        missing_str = " and ".join(missing)
        
        return {
            "next_speech": f"I didn't quite catch your {missing_str}. Could you provide that for me?"
        }

# ─── NODE 2: TECH ───
def tech_node(state: InterviewState) -> dict:
    idx = state.get("tech_index", 0)
    questions = state["tech_questions"]
    current_q = questions[idx]
    transcript = state.get("latest_transcript", "")
    
    history = state.get("conversation_history", [])
    history_text = "\n".join(history[-12:])
    
    llm = get_graph_llm().with_structured_output(AnswerEval)
    eval_result = llm.invoke(f"""
    Recent Conversation Context:
    {history_text}

    Question asked: {current_q['question']}
    Expected criteria: {current_q['expected_answer']}
    User's Latest Answer: {transcript}
    
    Evaluate the user's latest answer. If they explicitly state they don't know or don't remember, output 'skip'.
    """)
    
    if eval_result.decision in ["move_on", "skip"]:
        next_idx = idx + 1
        
        # Decide how to transition based on if they got it right or skipped
        transition_text = "No problem, let's move on." if eval_result.decision == "skip" else "Understood."
        
        if next_idx >= len(questions):
            first_hr = state["hr_questions"][0]["question"]
            return {
                "current_phase": "hr",
                "tech_index": next_idx,
                "next_speech": f"{transition_text} That concludes the technical portion. Let's move to the HR round. {first_hr}"
            }
        else:
            next_q = questions[next_idx]["question"]
            return {
                "tech_index": next_idx,
                "next_speech": f"{transition_text} Next question: {next_q}"
            }
    else:
        # Decision was "follow_up"
        return {
            "next_speech": f"Could you elaborate a bit more specifically on the {eval_result.missing_piece}?"
        }

# ─── NODE 3: HR ───
def hr_node(state: InterviewState) -> dict:
    idx = state.get("hr_index", 0)
    questions = state["hr_questions"]
    current_q = questions[idx]
    transcript = state.get("latest_transcript", "")
    
    history = state.get("conversation_history", [])
    history_text = "\n".join(history[-12:])
    
    llm = get_graph_llm().with_structured_output(AnswerEval)
    eval_result = llm.invoke(f"""
    Recent Conversation Context:
    {history_text}

    Question asked: {current_q['question']}
    Expected criteria: {current_q['expected_answer']}
    User's Latest Answer: {transcript}
    
    Evaluate the user's latest answer. If they explicitly state they don't know or don't remember, output 'skip'.
    """)
    
    if eval_result.decision in ["move_on", "skip"]:
        next_idx = idx + 1
        transition_text = "Alright." if eval_result.decision == "skip" else "Thank you."
        
        if next_idx >= len(questions):
            return {
                "current_phase": "end",
                "hr_index": next_idx,
                "next_speech": f"{transition_text} I have everything I need. The HR team will be in touch with you shortly. Have a great day! You may disconnect now."
            }
        else:
            next_q = questions[next_idx]["question"]
            return {
                "hr_index": next_idx,
                "next_speech": f"{transition_text} Now, {next_q}"
            }
    else:
        return {
            "next_speech": "Could you provide a slightly more specific example for that?"
        }