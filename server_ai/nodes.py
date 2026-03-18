import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from state import InterviewState
from pydantic import BaseModel, Field
import json
load_dotenv()
class EvaluationResult(BaseModel):
    is_valid_answer: bool = Field(
        description="True if the user gave a substantive answer to the interview question. False if they are just saying hello, asking for clarification, or giving filler words."
    )


# Initialize the Director's Brain (Using Groq for blazing fast graph evaluations)
llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="openai/gpt-oss-120b", # Native Groq model name
    temperature=0.0
)

def evaluate_response_node(state: InterviewState):
    """
    Evaluates if the user actually answered the question or just made chat.
    If they answered it, increment the counter for the current phase.
    """
    print(f"🧠 [Director] Evaluating transcript: '{state['latest_transcript']}'")
    
    # In a production app, you would use LLM Tool Calling here to return a strict True/False.
    # For simplicity, we are simulating the LLM deciding the answer was substantial enough:
    # 3. Ask Groq to evaluate the transcript based on the current phase
    # NEW PROMPT: A strict rubric based on your exact routing logic
    prompt = f"""
    We are in the '{state['current_phase']}' phase of a technical interview. 
    Analyze the recent history to determine if we should move on to the NEXT interview question.

    Recent Conversation Context:
    {state['recent_context']}
    
    You must output `True` (move to next question) or `False` (stay on current question) based strictly on this rubric:
    
    RETURN TRUE (Move Forward) IF:
    1. The user answered correctly (fully or nearly).
    2. The user's answer is half correct and half incorrect.
    3. The user's answer is only half correct, but contains nothing wrong.
    4. The user's answer is completely wrong or they state they do not know. (We must move on to the next question rather than trapping them).
    5. The user responds with a question that is completely unrelated to the interview topic.

    RETURN FALSE (Stay on Current Question) IF:
    1. The user responds with a question that is a doubt or clarification regarding the original question (e.g., "Do you mean...", "Could you repeat that?", "Can I assume X is true?").
    
    Based on the rubric, should we return True to advance the interview?
    OUTPUT FORMAT:
    You must return ONLY a JSON object with a single key "is_valid_answer" (boolean).
    Example: {{"is_valid_answer": true}}
    """
    response = llm.invoke(prompt)
    
    # Parse the JSON manually (more robust for reasoning models)
    try:
        # Reasoning models sometimes wrap JSON in code blocks, we clean that up
        content = response.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        is_valid_answer = data.get("is_valid_answer", True)
    except Exception as e:
        print(f"⚠️ Failed to parse JSON, defaulting to True. Error: {e}")
    
    new_project_count = state['project_q_count']
    new_hr_count = state['hr_q_count']

    if is_valid_answer:
        if state['current_phase'] == "project":
            new_project_count += 1
            print(f"📊 [Director] Project Question {new_project_count}/2 Complete.")
        elif state['current_phase'] == "hr":
            new_hr_count += 1
            print(f"📊 [Director] HR Question {new_hr_count}/2 Complete.")

    return {"project_q_count": new_project_count, "hr_q_count": new_hr_count}

def phase_manager_node(state: InterviewState):
    """
    Checks the counters and moves the interview to the next phase if limits are reached.
    """
    current_phase = state['current_phase']
    
    if current_phase == "intro" and state['project_q_count'] == 0:
        # Move to project phase after the initial greeting is done
        current_phase = "project"
        print("🔄 [Director] Transitioning to PROJECT Phase.")
        
    elif current_phase == "project" and state['project_q_count'] >= 2:
        current_phase = "hr"
        print("🔄 [Director] Transitioning to HR Phase.")
        
    elif current_phase == "hr" and state['hr_q_count'] >= 2:
        current_phase = "wrap_up"
        print("🔄 [Director] Transitioning to WRAP UP Phase.")

    return {"current_phase": current_phase}

def prompt_generator_node(state: InterviewState):
    """
    Generates the exact system instructions for the LiveKit Actor based on the current phase.
    """
    phase = state['current_phase']
    # --- The Bulletproof Persona Rules ---
    base_prompt = """You are Viral,  strict, and professional technical interviewer. You are conducting an assessment, NOT a tutoring session. 
    Keep your responses professional.
    
    CRITICAL BEHAVIORAL RULES - YOU MUST OBEY THESE:
    1. NEVER BE HELPFUL: Do NOT act like a tutor, teacher, or helpful assistant. 
    2. NO EXPLANATIONS: If the user gives a wrong answer, says "I don't know," or struggles, DO NOT explain the correct answer. DO NOT comfort them. DO NOT say "We can learn together." 
    3. HOW TO PROCEED: If the user fails a question, simply say "Let's move on," and immediately ask your next objective.
    4. DODGING & NONSENSE: If the user asks you to write code, asks off-topic questions, or deflects, boldly refuse (e.g., "That is irrelevant to this assessment.") and proceed.
    5. REPETITION: Never repeat a question you have already asked.
    
    CURRENT OBJECTIVE: 
    """
    
    new_instruction = ""
    
    if phase == "intro":
        new_instruction = "Greet the user and ask them to briefly introduce themselves."
    elif phase == "project":
        new_instruction = f"Look at this resume summary: {state['resume_summary']}. Ask a specific technical question about one of their projects."
    elif phase == "hr":
        new_instruction = "Ask a behavioral question, such as how they handle tight deadlines or team conflicts."
    elif phase == "wrap_up":
        new_instruction = "The interview is over. Thank the user for their time and tell them the HR team will reach out soon. Do not ask any more questions."

    final_prompt = base_prompt + new_instruction
    print(f"📝 [Director] Generated new prompt for LiveKit.")
    
    return {"system_prompt": final_prompt}