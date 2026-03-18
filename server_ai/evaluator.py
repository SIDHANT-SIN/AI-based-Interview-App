import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

# We use the standard OpenAI client pointed at Groq's insanely fast endpoints
client = AsyncOpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY")
)

# A simple helper to manage our temporary evaluations database
def update_evaluation_db(room_name: str, data: dict):
    db_path = "evaluations.json"
    db = {}
    if os.path.exists(db_path):
        with open(db_path, "r") as f:
            try:
                db = json.load(f)
            except json.JSONDecodeError:
                db = {}
                
    db[room_name] = data
    
    with open(db_path, "w") as f:
        json.dump(db, f, indent=4)

async def generate_evaluation(room_name: str, transcript: str):
    """Sends the transcript to Groq and asks for a detailed summary report."""
    print(f"🧠 Grader AI starting evaluation for {room_name}...")
    
    # We update the DB to tell the frontend we are "thinking"
    update_evaluation_db(room_name, {"status": "processing"})
    
    # Updated prompt for a standard text/Markdown summary instead of strict JSON
    prompt = f"""You are a strict Senior Software Engineer evaluating a candidate's technical interview.
    Based on the following transcript, provide a detailed and honest evaluation.
    
    TRANSCRIPT:
    {transcript}
    
    Please provide a well-structured summary including:
    - Overall Score (out of 100)
    - Communication Skills: How clearly they explained their thought process.
    - Strengths: Key positive points.
    - Areas for Improvement: Where they struggled.
    - Technical Feedback: Review of their code logic, efficiency, and debugging.
    
    Format your response clearly using Markdown headings and bullet points. Do not include introductory pleasantries, just the report.
    """
    
    try:
        response = await client.chat.completions.create(
            model="openai/gpt-oss-120b", # Swapped back to your default model
            messages=[{"role": "system", "content": prompt}],
            temperature=0.3 # Slightly higher temperature for better prose formatting
        )
        
        # Extract the raw text response directly
        result_text = response.choices[0].message.content
        
        # Save the text directly to the database (no JSON parsing needed)
        update_evaluation_db(room_name, {"status": "completed", "report": result_text})
        print(f"✅ Evaluation successfully generated and saved for {room_name}!")
        
    except Exception as e:
        print(f"❌ Grader Error: {e}")
        update_evaluation_db(room_name, {"status": "error", "message": "Failed to generate evaluation."})