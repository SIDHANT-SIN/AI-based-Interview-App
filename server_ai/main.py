from fastapi import FastAPI, UploadFile, File, Form, HTTPException
import json
import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pdf_parser import parse_and_summarize_pdf # (This is the script from my previous message)
from pydantic import BaseModel
import random
from execution_engine import execute_code
from livekit.api import AccessToken, VideoGrants

# --- New Pydantic Model for the Execution Request ---
class CodeExecutionRequest(BaseModel):
    source_code: str
    language: str
    room_name: str
class TokenRequest(BaseModel):
    room_name: str
    participant_name: str

app = FastAPI()

# Allow your React frontend to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/upload-resume")
async def upload_resume(
    room_name: str = Form(...), # The frontend tells us which room this resume belongs to
    file: UploadFile = File(...)
):
    print(f"📥 Received resume for room: {room_name}")
    
    # 1. Read and summarize the PDF
    file_bytes = await file.read()
    summary = parse_and_summarize_pdf(file_bytes)

    # 2. Save the summary to our makeshift JSON database
    try:
        with open("database.json", "r") as f:
            db = json.load(f)
    except FileNotFoundError:
        db = {}

    if room_name not in db or not isinstance(db[room_name], dict):
        db[room_name] = {"hr_track": {}, "coding_track": {}}
    elif "hr_track" not in db[room_name]:
        db[room_name]["hr_track"] = {}

    # 2. Save the resume strictly inside the HR bucket
    db[room_name]["hr_track"]["resume_text"] = summary

    with open("database.json", "w") as f:
        json.dump(db, f, indent=4)

    return {
        "status": "success",
        "message": "Resume parsed and linked to room."
    }

@app.get("/api/get-problem")
async def get_problem():
    """Fetches a random problem from the database."""
    try:
        with open("problems.json", "r") as f:
            problems = json.load(f)
        # For now, just grab the first one (Two Sum)
        selected_problem = random.choice(problems)
        return {"status": "success", "problem": selected_problem}
    except FileNotFoundError:
        return {"status": "error", "message": "problems.json not found."}

# --- NEW ROUTE 2: Execute Code ---
@app.post("/api/execute")
async def execute_user_code(request: CodeExecutionRequest):
    """Receives code from React, runs it via Judge0, and saves output for Viral."""
    
    print(f"💻 Received {request.language} execution request for room {request.room_name}")
    
    # Run the code
    result = execute_code(request.source_code, request.language)
    
    # Keep a record of the last execution in our database.json so Viral can see it!
    try:
        with open("database.json", "r") as f:
            db = json.load(f)
    except FileNotFoundError:
        db = {}
        
    # 1. Initialize the bucket structure if the room is new (or if it's corrupted old string data)
    if request.room_name not in db or not isinstance(db[request.room_name], dict):
        db[request.room_name] = {"hr_track": {}, "coding_track": {}}
    elif "coding_track" not in db[request.room_name]:
        db[request.room_name]["coding_track"] = {}
        
    # 2. Save the execution strictly inside the Coding bucket
    db[request.room_name]["coding_track"]["latest_code_execution"] = {
        "code": request.source_code,
        "result": result
    }
    
    with open("database.json", "w") as f:
        json.dump(db, f, indent=4)

    return result


# 🛠️ Small update in main.py to handle the new buckets
@app.get("/api/summary/{room_name}")
async def get_summary(room_name: str):
    db_path = "database.json" # 🛠️ Point to the unified db
    
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Evaluations database not found.")
        
    with open(db_path, "r") as f:
        db = json.load(f)
        
    if room_name not in db:
        raise HTTPException(status_code=404, detail="Summary not found for this room.")
        
    room_data = db[room_name]
    
    # Check if HR just finished
    if "hr_track" in room_data and "summary_status" in room_data["hr_track"]:
        track_data = room_data["hr_track"]
    # Otherwise check if Coding just finished
    elif "coding_track" in room_data and "summary_status" in room_data["coding_track"]:
        track_data = room_data["coding_track"]
    else:
        raise HTTPException(status_code=404, detail="No summary status found in any track.")
    
    if track_data.get("summary_status") == "processing":
        return {"status": "processing"}
        
    return {"status": "completed", "report": track_data.get("summary_report")}


# --- NEW ROUTE 3: Generate LiveKit Tokens dynamically ---
@app.post("/api/get-token")
async def get_token(request: TokenRequest):
    """Generates a dynamic LiveKit token for a specific room."""
    
    # Grab the master keys from your .env file
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    if not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="LiveKit keys are missing on the backend.")

    # 1. Define what permissions this token has (only joining this specific room)
    grant = VideoGrants(room_join=True, room=request.room_name)
    
    # 2. Stamp the new token with your secret keys
    access_token = AccessToken(api_key, api_secret)
    access_token.with_identity(request.participant_name)
    access_token.with_name(request.participant_name)
    access_token.with_grants(grant)
    
    # 3. Convert it into that long gibberish string for the frontend
    jwt_token = access_token.to_jwt()
    
    return {
        "token": jwt_token, 
        "url": os.getenv("LIVEKIT_URL", "wss://aiinterviewer-w2x9nsez.livekit.cloud")
    }