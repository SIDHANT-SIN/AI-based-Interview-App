import io
import os
from pydantic import BaseModel, Field
from typing import List
from PyPDF2 import PdfReader
from dotenv import load_dotenv
from utils.llm_provider import get_graph_llm

load_dotenv()

# ─── PYDANTIC SCHEMAS FOR STRUCTURED OUTPUT ──────────────────────────────────
class TechQuestion(BaseModel):
    id: int = Field(description="A unique sequential integer ID starting from 1.")
    question: str = Field(description="The exact text of the technical interview question to ask the candidate.")
    expected_criteria: List[str] = Field(description="A list of 2-3 specific technical keywords, concepts, or problem-solving approaches the interviewer should listen for in a good answer.")

class TargetProject(BaseModel):
    project_name: str = Field(description="The name of the most technically complex project listed on the candidate's resume.")
    project_summary: str = Field(description="A brief 2-sentence summary of what the project is and the technologies used.")
    technical_questions: List[TechQuestion] = Field(description="Exactly 5 technical interview questions strictly tailored to this project's architecture and challenges.")

class Syllabus(BaseModel):
    candidate_name: str = Field(description="The full name of the candidate extracted from the resume.")
    target_project: TargetProject = Field(description="The project selected for the deep-dive technical interview.")

class HRQuestion(BaseModel):
    id: int = Field(description="A unique sequential integer ID starting from 1.")
    question: str = Field(description="The exact text of the behavioural or HR question to ask the candidate.")
    what_to_listen_for: List[str] = Field(description="A list of 2-3 soft skills or traits (e.g., 'prioritization', 'teamwork', 'accountability') to listen for in a good answer.")

class HRQuestionList(BaseModel):
    questions: List[HRQuestion] = Field(description="Exactly 3 behavioural/HR questions tailored to the candidate's experience level.")
# ─────────────────────────────────────────────────────────────────────────────

def parse_and_summarize_pdf(file_bytes: bytes) -> str:
    print("📄 Extracting text from PDF...")
    reader = PdfReader(io.BytesIO(file_bytes))
    raw_text = "".join([page.extract_text() + "\n" for page in reader.pages])

    print("🧠 Summarizing resume...")
    llm = get_graph_llm() 
    
    prompt = f"""
    Extract the key technical skills, recent projects, and education from the following resume text.
    Create a concise, 5-sentence summary that an interviewer can use to ask technical questions.
    Do not include fluff, just the facts.

    RESUME TEXT:
    {raw_text[:4000]}
    """
    response = llm.invoke(prompt)
    summary = response.content.strip()
    print(f"✅ Summary generated.")
    return summary

def generate_interview_syllabus(resume_summary: str) -> dict:
    """Generates 5 specific technical questions with grading criteria."""
   
    llm = get_graph_llm().with_structured_output(Syllabus)

    prompt = f"""
    You are an expert technical interviewer. Based on the resume summary below,
    generate a structured interview syllabus. Generate exactly 5 technical questions.
    Make them specific to their actual project, not generic.

    Resume Summary:
    {resume_summary}
    """
    try:
        syllabus_obj = llm.invoke(prompt)
        syllabus = syllabus_obj.model_dump()
        return syllabus
    except Exception as e:
        print(f"⚠️ Syllabus parse failed: {e}. Using fallback.")
        return {
            "candidate_name": "Unknown",
            "target_project": {
                "project_name": "your main project",
                "project_summary": "as described in resume",
                "technical_questions": [
                    {"id": i, "question": q, "expected_criteria": ["gave a substantive answer"], "is_open_ended": True}
                    for i, q in enumerate([
                        "Walk me through the architecture of your main project.",
                        "What was the biggest technical challenge you faced and how did you solve it?",
                        "How did you handle data storage and retrieval?",
                        "How did you approach testing and debugging?",
                        "If you could rebuild this project, what would you do differently?"
                    ], 1)
                ]
            }
        }

def generate_hr_questions(resume_summary: str) -> list:
    """Generates 3 HR/behavioural questions tailored to the candidate's resume."""
    llm = get_graph_llm().with_structured_output(HRQuestionList)

    prompt = f"""
    You are a senior HR interviewer. Based on this candidate's resume summary,
    generate 3 behavioural interview questions that are relevant to their background.
    Make the questions specific to their experience level and domain, not generic.

    Resume Summary:
    {resume_summary}
    """
    try:
        hr_obj = llm.invoke(prompt)
        questions = hr_obj.model_dump()["questions"]
        print(f"✅ {len(questions)} HR questions generated.")
        return questions
    except Exception as e:
        print(f"⚠️ HR questions parse failed: {e}. Using fallback.")
        return [
            {"id": 1, "question": "Tell me about a time you faced a difficult technical problem. How did you approach it?", "what_to_listen_for": ["structured thinking", "persistence"]},
            {"id": 2, "question": "Describe a situation where you had to work under pressure to meet a deadline.", "what_to_listen_for": ["prioritisation", "communication"]},
            {"id": 3, "question": "Where do you see yourself professionally in the next 2-3 years?", "what_to_listen_for": ["clarity of goals", "alignment with role"]},
        ]