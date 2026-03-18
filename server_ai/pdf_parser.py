import io
import os
from PyPDF2 import PdfReader
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()
def parse_and_summarize_pdf(file_bytes: bytes) -> str:
    print("📄 Extracting text from PDF...")
    
    # 1. Read the raw text from the PDF bytes
    reader = PdfReader(io.BytesIO(file_bytes))
    raw_text = ""
    for page in reader.pages:
        raw_text += page.extract_text() + "\n"

    print("🧠 Sending raw text to Groq for summarization...")
    
    # 2. Use the fast 8B model to summarize the resume
    llm = ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model="llama-3.1-8b-instant",
        temperature=0.0
    )

    prompt = f"""
    Extract the key technical skills, recent projects, and education from the following resume text.
    Create a concise, 3-sentence summary that an interviewer can use to ask technical questions.
    Do not include fluff, just the facts.

    RESUME TEXT:
    {raw_text[:4000]} 
    """

    response = llm.invoke(prompt)
    summary = response.content.strip()
    
    print(f"✅ Summary generated: {summary}")
    return summary