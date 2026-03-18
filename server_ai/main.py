from http.client import HTTPException
import json
import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pdf_parser import parse_and_summarize_pdf # (This is the script from my previous message)
from pydantic import BaseModel
import random
from execution_engine import execute_code

# --- New Pydantic Model for the Execution Request ---
class CodeExecutionRequest(BaseModel):
    source_code: str
    language: str
    room_name: str
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

    db[room_name] = summary

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
        
    if request.room_name not in db:
        db[request.room_name] = {}
        
    db[request.room_name]["latest_code_execution"] = {
        "code": request.source_code,
        "result": result
    }
    
    with open("database.json", "w") as f:
        json.dump(db, f, indent=4)

    return result


@app.get("/api/summary/{room_name}")
async def get_summary(room_name: str):
    """
    The frontend will poll this endpoint. It returns 'processing' while 
    the LLM thinks, and the final JSON report when it's done.
    """
    db_path = "evaluations.json"
    
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Evaluations database not found.")
        
    with open(db_path, "r") as f:
        db = json.load(f)
        
    if room_name not in db:
        raise HTTPException(status_code=404, detail="Summary not found for this room.")
        
    data = db[room_name]
    
    if data.get("status") == "processing":
        return {"status": "processing"}
        
    return {"status": "completed", "report": data.get("report")}