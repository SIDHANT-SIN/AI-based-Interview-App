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
# 🛠️ Updated to take 'track_type' and point to unified database.json
def update_evaluation_db(room_name: str, track_type: str, status: str, report_data=None):
    db_path = "database.json" 
    try:
        with open(db_path, "r") as f:
            db = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        db = {}
        
    # Ensure the room and buckets exist
    if room_name not in db or not isinstance(db[room_name], dict):
        db[room_name] = {"hr_track": {}, "coding_track": {}}
    elif track_type not in db[room_name]:
        db[room_name][track_type] = {}
        
    # Save the status and report into the specific track bucket
    db[room_name][track_type]["summary_status"] = status
    if report_data:
        db[room_name][track_type]["summary_report"] = report_data
        
    with open(db_path, "w") as f:
        json.dump(db, f, indent=4)

# 🛠️ Added track_type parameter
async def generate_evaluation(room_name: str, track_type: str, transcript: str):
    print(f"🧠 Grader AI starting evaluation for {room_name} ({track_type})...")
    
    # Update the DB to tell the frontend we are "thinking"
    update_evaluation_db(room_name, track_type, "processing")
    
    # 🛠️ Reverted to STRICT JSON format to fix the React crash!
    prompt = f"""You are a strict Senior Software Engineer evaluating a candidate's technical interview.
    Based on the following transcript, provide a detailed and honest evaluation.
    
    TRANSCRIPT:
    {transcript}
    
    You MUST respond ONLY with a valid JSON object. Do not include markdown formatting or backticks. Use this exact structure:
    {{
        "overall_score": 85,
        "communication": "Brief review of how clearly they explained their thought process.",
        "strengths": ["string", "string"],
        "improvements": ["string", "string"],
        "technical_feedback": "Review of their code logic, efficiency, and debugging."
    }}
    """
    try:
        response = await client.chat.completions.create(
            model="openai/gpt-oss-120b", # 🛠️ Kept your preferred model!
            messages=[{"role": "system", "content": prompt}],
            temperature=0.3 # Slightly higher temperature for better prose formatting
        )
        
        # Extract the raw Markdown text directly
        result_text = response.choices[0].message.content
        
        # 🛠️ Save the text directly to the new bucket (no JSON parsing!)
        update_evaluation_db(room_name, track_type, "completed", result_text)
        print(f"✅ Evaluation successfully generated and saved for {room_name}!")
        
    except Exception as e:
        print(f"❌ Grader Error: {e}")
        update_evaluation_db(room_name, track_type, "error")