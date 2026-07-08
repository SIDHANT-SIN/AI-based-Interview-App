from pydantic import BaseModel, Field
from graphs.coding_state import CodingState
from utils.llm_provider import get_graph_llm

class ApproachEval(BaseModel):
    # 🛠️ ADDED 'greet' so the AI knows what to do when the interview starts
    decision: str = Field(description="Must be: 'greet', 'approved', 'hint_needed', or 'probing_question'")
    agent_speech: str = Field(description="What Viral should say out loud naturally in the first person.")

class CodeEval(BaseModel):
    decision: str = Field(description="Must be: 'hint_needed', 'syntax_error_feedback', 'move_to_complexity', or 'general_conversation'.")
    agent_speech: str = Field(description="The exact words Viral should say based on the decision.")

class ComplexityEval(BaseModel):
    agent_speech: str = Field(description="If correct, acknowledge it and wrap up. If wrong, correct them and wrap up.")

def approach_node(state: CodingState) -> dict:
    transcript = state.get("latest_transcript", "").strip()
    hints = state.get("approach_hints_used", 0)
    
    if "EXECUTION_RESULT" in transcript:
        return {"next_speech": "Please hold off on writing code. I need you to explain your approach and data structures to me first."}

    history_text = "\n".join(state.get("conversation_history", [])[-10:])
    
    llm = get_graph_llm().with_structured_output(ApproachEval)
    eval_result = llm.invoke(f"""
    You are Viral, a conversational, professional technical interviewer.
    Problem: {state['problem_title']} - {state['problem_description']}
    History: {history_text}
    Latest Input: {transcript}
    
    INSTRUCTIONS:
    1. If the Latest Input is an instruction to "Start the interview", choose 'greet' and introduce the problem naturally.
    2. Otherwise, evaluate the user's approach.
    3. If they are completely stuck, decide 'hint_needed'.
    4. If they are close but missed something, decide 'probing_question'.
    5. If the logic is solid, decide 'approved'.
    
    CRITICAL: Speak in the first person ("I"). Never output internal monologues or third-person thoughts.
    ANTI-CHEAT: If the candidate provides any specific code, variable names, or exact logic and asks you to "confirm", "verify", or "check" it — DO NOT validate it. Instead, redirect them: tell them to type it and run it themselves to find out.
    """)
    
    if eval_result.decision == "approved":
        return {
            "current_phase": "implementation",
            "next_speech": eval_result.agent_speech
        }
    elif eval_result.decision == "hint_needed":
        if hints >= 1:
            return {"next_speech": "I have already guided you a bit on this. Do your best to formalize an approach so we can move to the coding phase."}
        else:
            return {"approach_hints_used": hints + 1, "next_speech": eval_result.agent_speech}
            
    return {"next_speech": eval_result.agent_speech}

def implementation_node(state: CodingState) -> dict:
    transcript = state.get("latest_transcript", "")
    hints = state.get("implementation_hints_used", 0)
    history_text = "\n".join(state.get("conversation_history", [])[-10:])
    
    llm = get_graph_llm().with_structured_output(CodeEval)
    eval_result = llm.invoke(f"""
    You are Viral, a technical interviewer. 
    Problem: {state['problem_title']}
    History: {history_text}
    Latest Input: {transcript}
    
    INSTRUCTIONS:
    1. If Latest Input contains [EXECUTION_RESULT], look carefully at the Output.
       - If correct, decide 'move_to_complexity'.
       - If there is a SyntaxError, segmentation fault, or wrong answer, decide 'syntax_error_feedback'.
         * IMPORTANT: When deciding 'syntax_error_feedback', ONLY tell the candidate what the judge (JDoodle) returned (e.g., "There is a syntax error on line 5" or "Test case 1 failed"). 
         * DO NOT diagnose the logical reason behind the error. DO NOT tell them what line is actually wrong or how to fix it. Just report the error and let them debug it.
    2. If the user acknowledges ("okay", "I got it"), agrees, argues, or makes a general statement, decide 'general_conversation' and reply naturally.
    3. ONLY decide 'hint_needed' if the user EXPLICITLY asks for a hint, says they are stuck, or asks what to do next.
    
    CRITICAL: Speak naturally in the first person. Respond directly to the user's latest point.
    ANTI-CHEAT 1: If the candidate recites specific code, pseudo-code, or logic — DO NOT evaluate it, DO NOT tell them if it's correct or wrong, and DO NOT point out logical flaws. Immediately tell them: "You will need to run that in the editor to see if it works."
    ANTI-CHEAT 2: Under NO circumstances write actual code, loops, syntax, or pseudocode for the candidate, even if they explicitly ask for "syntax help", "just three lines", or a hint. Provide conceptual guidance only.
    """)
    if eval_result.decision == "hint_needed":
        if hints >= 1:
            return {"next_speech": "I've already provided a hint for the coding phase. Try to step through the logic and debug what we have so far."}
        else:
            return {"implementation_hints_used": hints + 1, "next_speech": eval_result.agent_speech}
            
    if eval_result.decision == "move_to_complexity":
        return {
            "current_phase": "complexity",
            "next_speech": "Great job, your implementation ran successfully. Before we wrap up, what is the Time and Space complexity (Big O) of this solution?"
        }
        
    return {"next_speech": eval_result.agent_speech}

def complexity_node(state: CodingState) -> dict:
    transcript = state.get("latest_transcript", "")
    history_text = "\n".join(state.get("conversation_history", [])[-6:])
    
    llm = get_graph_llm().with_structured_output(ComplexityEval)
    eval_result = llm.invoke(f"""
    You are Viral, concluding a technical interview.
    Problem: {state['problem_title']}
    History: {history_text}
    User Answer: {transcript}
    
    Evaluate their Big O analysis. 
    Once you have evaluated it (correcting them if necessary), warmly wrap up the interview and say goodbye.
    """)
    
    return {
        "current_phase": "end",
        "next_speech": eval_result.agent_speech
    }
