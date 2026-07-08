import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List

from utils.llm_provider import get_graph_llm
from utils.api_client import save_evaluation_report, get_execution_history, get_resume_summary

load_dotenv()

# Pydantic Models for Structured Output
class CodeReview(BaseModel):
    efficiency: str = Field(description="Analysis of their time/space complexity and if it was the most optimal approach.")
    cleanliness: str = Field(description="Review of their variable naming, modularity, and overall code readability.")
    execution_analysis: str = Field(description="Review of their code submissions, including any syntax errors, infinite loops, or incorrect attempts before getting it right and give tips on that.")

class CodingEvaluation(BaseModel):
    feedback: str = Field(description="A comprehensive 2-3 sentence overview of their overall performance.")
    strengths: List[str] = Field(description="List of strengths, e.g., ['Clear communication', 'Good grasp of arrays']")
    areas_for_improvement: List[str] = Field(description="List of areas to improve, e.g., ['Forgot edge cases']")
    code_review: CodeReview

class HREvaluation(BaseModel):
    feedback: str = Field(description="A comprehensive 2-3 sentence overview of their overall performance.")
    strengths: List[str] = Field(description="List of strengths, e.g., ['Strong leadership examples']")
    areas_for_improvement: List[str] = Field(description="List of areas to improve, e.g., ['Answers were a bit lengthy']")

async def generate_evaluation(room_name: str, track_type: str, transcript: str):
    print(f"🧠 Grader AI starting evaluation for {room_name} ({track_type})...")
    
    # Save the transcript immediately, even before we get the AI response
    await save_evaluation_report(room_name, "processing", transcript=transcript) 
    
    extra_context = ""
    llm = get_graph_llm()
    
    if track_type == "coding_track":
        executions = await get_execution_history(room_name)
        if executions:
            extra_context = f"\n--- CODE EXECUTION HISTORY ---\n{json.dumps(executions, indent=2)}\n"
        else:
            extra_context = "\n--- CODE EXECUTION HISTORY ---\nThe candidate did not write or execute any code.\n"   
        persona = "strict Senior Software Engineer evaluating a technical coding interview"
        evaluator_llm = llm.with_structured_output(CodingEvaluation)
        
    elif track_type == "hr_track":
        resume = await get_resume_summary(room_name)
        extra_context = f"\n--- CANDIDATE RESUME SUMMARY ---\n{resume}\n"        
        persona = "strict Hiring Manager evaluating a behavioral HR interview"
        evaluator_llm = llm.with_structured_output(HREvaluation)

    prompt = f"""You are a {persona}.
    Based on the following conversation transcript AND the provided context, provide a detailed and honest evaluation.
    
    --- TRANSCRIPT ---
    {transcript}
    {extra_context}
    
    INSTRUCTIONS:
    1. Do NOT assign any numerical scores. Focus purely on qualitative feedback.
    2. Be specific based on the transcript and context.
    3. If the candidate demonstrated NO obvious strengths, leave the "strengths" array completely empty []. Do not invent strengths.
    4. If the candidate performed flawlessly, leave the "areas_for_improvement" array completely empty [].
    """
    
    try:
        # Use LangChain's structured output invoke
        result = await evaluator_llm.ainvoke(prompt)
        
        # Convert the Pydantic object to JSON string matching original format
        result_text = result.model_dump_json()
        
        # Save the final text via the Repo
        await save_evaluation_report(room_name, "completed", result_text, transcript)
        print(f"✅ Evaluation successfully generated and saved for {room_name}!")
        return result_text
        
    except Exception as e:
        print(f"❌ Grader Error: {e}")
        await save_evaluation_report(room_name, "error")