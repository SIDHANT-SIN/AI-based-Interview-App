import os
import time
import json
import uuid
import traceback
from contextlib import asynccontextmanager
from typing import Optional

# Third-party imports
import jwt  # PyJWT for decoding the Clerk token
from jwt import PyJWKClient
from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from livekit.api import AccessToken, VideoGrants
from dotenv import load_dotenv

# Internal utilities and repositories
from utils.database import connect_to_mongo, close_mongo_connection, get_db
from utils.cache import connect_to_redis, close_redis_connection, get_redis
from utils.pdf_parser import parse_and_summarize_pdf, generate_interview_syllabus, generate_hr_questions
from utils.execution_engine import execute_code
from repositories import hr_repo, coding_repo, summary_repo
from repositories.summary_repo import get_user_history

# Load environment variables
load_dotenv()


# ───INITIALIZATION & LIFESPAN ──────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the startup and shutdown lifecycle of the FastAPI application.
    Establishes database connections before serving traffic and closes them safely on exit.
    """
    print("🚀 Booting up Interview Backend...")
    await connect_to_mongo()
    await connect_to_redis() 
    yield
    await close_mongo_connection()
    await close_redis_connection() 
    print("🛑 Backend shut down safely.")

app = FastAPI(lifespan=lifespan)

# HTTPBearer is used to extract the "Authorization: Bearer <token>" header from requests
security = HTTPBearer() 

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)


# Midllewares and dependencies


async def get_clerk_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = creds.credentials
    # Strip whitespace just in case there's an invisible space in your .env
    clerk_issuer = os.getenv("CLERK_ISSUER_URL", "").strip()
    
    print("\n" + "="*50)
    print("🕵️ DEBUG: CLERK AUTHENTICATION - EXACT MATCH CHECK")
    print("="*50)
    
    if not clerk_issuer:
        print("❌ ERROR: CLERK_ISSUER_URL is empty in .env!")
        raise HTTPException(status_code=500, detail="CLERK_ISSUER_URL missing in .env")

    try:
        # 1. Decode token without verification to peek at the 'iss' claim
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        token_issuer = unverified_payload.get('iss', '').strip()
        
        print("\n--- ISSUER MATCHING ANALYSIS ---")
        print(f"A. Expected (from .env) : '{clerk_issuer}'")
        print(f"B. Received (from token): '{token_issuer}'")
        
        # 2. Explicitly show what is being compared and if they match
        if clerk_issuer == token_issuer:
            print("✅ Match Result         : EXACT MATCH")
        else:
            print("❌ Match Result         : MISMATCH DETECTED")
            # Highlight exact differences
            if clerk_issuer.rstrip('/') == token_issuer.rstrip('/'):
                print("💡 Hint: The URLs are the same except for a trailing slash ('/').")
            elif clerk_issuer in token_issuer or token_issuer in clerk_issuer:
                print("💡 Hint: One URL is a substring of the other. Check for missing 'https://' or extra paths.")
            else:
                print("💡 Hint: These are completely different URLs. The frontend and backend are using different Clerk apps.")
        print("--------------------------------\n")

        # 3. Proceed with PyJWKClient verification
        jwks_url = f"{clerk_issuer.rstrip('/')}/.well-known/jwks.json"
        jwks_client = PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # PyJWT enforces the exact match here via the issuer parameter
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=clerk_issuer 
        )
        
        clerk_user_id = payload.get("sub") 
        print(f"✅ Auth Success! User ID: {clerk_user_id}")
        print("="*50 + "\n")
        
        return clerk_user_id
        
    except jwt.exceptions.InvalidIssuerError as e:
        # Catching the exact issuer mismatch error
        print("\n❌ CRITICAL: PyJWT rejected the token due to InvalidIssuerError!")
        print(f"Error Message: {str(e)}")
        print("="*50 + "\n")
        raise HTTPException(status_code=401, detail=f"Issuer Mismatch: {str(e)}")
        
    except jwt.ExpiredSignatureError:
        print("❌ ERROR: Token has expired.")
        raise HTTPException(status_code=401, detail="Clerk token expired. Please log in again.")
        
    except Exception as e:
        print(f"\n❌ AUTHENTICATION EXCEPTION: {type(e).__name__}")
        print(f"Message: {str(e)}")
        traceback.print_exc()
        print("="*50 + "\n")
        raise HTTPException(status_code=401, detail=f"Auth failed [{type(e).__name__}]: {str(e)}")

# async def get_clerk_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> str:
#     """
#     Extracts the JWT from the request headers, fetches Clerk's public cryptographic keys, 
#     and validates the token to ensure the user is genuinely logged into the application.
    
#     Returns:
#         str: The unique Clerk User ID.
#     """
#     token = creds.credentials
#     clerk_issuer = os.getenv("CLERK_ISSUER_URL") 
    
#     if not clerk_issuer:
#         raise HTTPException(status_code=500, detail="CLERK_ISSUER_URL missing in .env")

#     try:
#         # 1. Fetch and cache the public key from Clerk's JWKS endpoint
#         jwks_url = f"{clerk_issuer.rstrip('/')}/.well-known/jwks.json"
#         jwks_client = PyJWKClient(jwks_url)
#         signing_key = jwks_client.get_signing_key_from_jwt(token)

#         # 2. Decode the token cryptographically
#         payload = jwt.decode(
#             token,
#             signing_key.key,
#             algorithms=["RS256"],# Only accept tokens signed with RS256 algorithm
#             issuer=clerk_issuer # Prevents spoofing from other Clerk apps
#         )
        
#         clerk_user_id = payload.get("sub") 
#         if not clerk_user_id:
#             raise HTTPException(status_code=401, detail="Invalid Clerk token: No user ID.")
            
#         return clerk_user_id
        
#     except jwt.ExpiredSignatureError:
#         raise HTTPException(status_code=401, detail="Clerk token expired. Please log in again.")
#     except Exception as e:
#         raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


def verify_room_owner(room_name_param: str = "room_name"):
    """
    GUARD 2: The VIP Bouncer (Authorization).
    A factory function that creates a dependency to check if the authenticated user 
    actually owns the interview room they are trying to access.
    
    Args:
        room_name_param: The name of the parameter in the path or body to extract the room name from.
    """
    async def bouncer(
        request: Request, 
        current_user_id: str = Depends(get_clerk_user)
    ):
        # 1. Extract room_name from path params
        path_params = request.scope.get("path_params", {})
        room_name = path_params.get(room_name_param)

        # 2. If not in path, safely read the JSON body bytes without consuming the Pydantic stream
        if not room_name and request.method in ["POST", "PUT"]:
            try:
                body_bytes = await request.body() 
                if body_bytes:
                    body_json = json.loads(body_bytes)
                    room_name = body_json.get(room_name_param)
            except Exception as e:
                print(f"Bouncer failed to parse body: {e}")
                
        redis_client = get_redis()
        room_passport = None

        # 3. Check Redis FIRST for speed
        if redis_client:
            cached_room = await redis_client.get(f"passport:{room_name}")
            if cached_room:
                room_passport = json.loads(cached_room)

        # 4. Cache Miss? Fallback to querying MongoDB
        if not room_passport:
            db = get_db()
            # Fetch only the fields needed for security checks to save memory
            db_room = await db["rooms"].find_one(
                {"_id": room_name},
                {"clerk_user_id": 1, "status": 1, "created_at": 1} 
            )
            
            if not db_room:
                raise HTTPException(status_code=404, detail="Room not found.")

            room_passport = {
                "clerk_user_id": db_room.get("clerk_user_id"),
                "status": db_room.get("status"),
                "created_at": db_room.get("created_at", 0)
            }
            
            # Save it back to Redis for subsequent requests
            if redis_client:
                await redis_client.setex(f"passport:{room_name}", 1800, json.dumps(room_passport))

        # 5. Apply Business Logic & Security Rules
        if room_passport["clerk_user_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="You do not have permission to access this room.")
            
        if room_passport["status"] == "COMPLETED":
            raise HTTPException(status_code=403, detail="This interview has already concluded.")
            
        # Optional safeguard: Rooms expire 30 minutes after creation
        if time.time() - room_passport["created_at"] > 1800:
            raise HTTPException(status_code=403, detail="This room has expired.")

        return room_name 

    return bouncer


# ─── PYDANTIC MODELS FOR API REQUESTS ────────────────────────────────────────

class TokenRequest(BaseModel):
    room_name: str
    participant_name: str

class CodeExecutionRequest(BaseModel):
    source_code: str
    language: str


# ─── PART 3: THE SETUP APIs (Room Creation) ──────────────────────────────────

@app.post("/api/hr/setup")
async def setup_hr_room(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_clerk_user)
):
    """
    Initializes a new HR interview environment. 
    Parses an uploaded PDF resume, generates an AI syllabus, and writes the room schema to the database.
    """
    print(f"📥 Received resume setup request from user: {current_user_id}")
    room_name = f"hr-room-{uuid.uuid4().hex[:8]}"
    
    # Parse the PDF and generate interview content
    file_bytes = await file.read()
    summary = parse_and_summarize_pdf(file_bytes)
    syllabus = generate_interview_syllabus(summary)
    hr_questions = generate_hr_questions(summary)
    
    # Build and validate the MongoDB document via the repository
    await hr_repo.create_hr_room(
        room_name=room_name, 
        clerk_user_id=current_user_id,
        resume_summary=summary,
        syllabus=syllabus,
        hr_questions=hr_questions
    )
    return {"status": "success", "room_name": room_name}

# ─── PART 4: THE HANDSHAKE API (LiveKit Token) ───────────────────────────────

@app.post("/api/get-token")
async def get_token(
    request: TokenRequest,
    verified_room_name: str = Depends(verify_room_owner("room_name"))
):
    """
    CLEANED: Generates the LiveKit WebRTC access token. 
    Does not fetch problem data anymore.
    """
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    if not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="LiveKit keys are missing.")

    
    # Generate the LiveKit JWT
    grant = VideoGrants(room_join=True, room=verified_room_name)
    access_token = AccessToken(api_key, api_secret)
    access_token.with_identity(request.participant_name)
    access_token.with_name(request.participant_name)
    access_token.with_grants(grant)
    
    
    return {
        "url": os.getenv("LIVEKIT_URL"),
        "token": access_token.to_jwt()
    }

# ─── THE SETUP APIs (Room Creation) ──────────────────────────────────

@app.post("/api/coding/setup")
async def setup_coding_room(current_user_id: str = Depends(get_clerk_user)):
    """
    Initializes a new Coding interview environment.
    Fetches a random technical problem and writes the room schema to the database.
    """
    print(f"💻 Received coding setup request from user: {current_user_id}")
    room_name = f"coding-room-{uuid.uuid4().hex[:8]}"
    
    # Fetch a problem and write it to the database
    selected_problem = await coding_repo.get_random_problem()
    await coding_repo.create_coding_room(
        room_name=room_name,
        clerk_user_id=current_user_id,
        problem_data=selected_problem
    )
    return {"status": "success", "room_name": room_name}

@app.get("/api/coding/room/{room_name}")
async def get_coding_room_data(
    room_name: str,
    verified_room_name: str = Depends(verify_room_owner("room_name"))
):
    """
    Dedicated endpoint to fetch the problem details for the IDE.
    Survives page refreshes.
    """
    room_data = await coding_repo.get_coding_interview_data(verified_room_name)
    
    return {
        "title": room_data.get("problem_title"),
        "description": room_data.get("problem_description"),
        "starter_code": room_data.get("starter_code"),
        "difficulty": room_data.get("difficulty")
    }
# ─── PART 5: MID-INTERVIEW & POST-INTERVIEW APIs ─────────────────────────────

@app.post("/api/execute/{room_name}")
async def execute_user_code(
    room_name: str,
    request: CodeExecutionRequest,
    verified_room_name: str = Depends(verify_room_owner("room_name")) 
):
    """
    Accepts code from the frontend Monaco editor, runs it securely, and stores the history in MongoDB.
    The room_name is passed in the URL to avoid consuming the Pydantic JSON body stream during Bouncer checks.
    """
    if len(request.source_code) > 15000:
        raise HTTPException(status_code=413, detail="Payload too large.")

    print(f"💻 Executing {request.language} for room {verified_room_name}")
    
    # Run the code (via JDoodle or internal engine)
    result = execute_code(request.source_code, request.language)
    await coding_repo.save_code_execution(verified_room_name, request.source_code, result)
    return result

    
@app.get("/api/summary/{room_name}")
async def get_summary(
    room_name: str,
    current_user_id: str = Depends(get_clerk_user) 
):
    room_data = await summary_repo.get_summary_status(room_name)
    if not room_data or room_data.get("clerk_user_id") != current_user_id:
        raise HTTPException(status_code=404, detail="Summary not found or unauthorized.")

    status = room_data.get("summary_status")
    
    # Tell the frontend to treat it as "processing" so it triggers your polling loop!
    if not status or status == "processing":
        return {"status": "processing"}
        
    print(f"📊 Summary status for {room_name}:", room_data.get("transcript"))
    
    # If it is completed, return the final report!
    return {
        "status": "completed",
        "report": room_data.get("summary_report"),
        "transcript": room_data.get("transcript")
    }


@app.get("/api/history")
async def get_history(current_user_id: str = Depends(get_clerk_user)):
    """
    Returns a list of all past interviews for the authenticated user.
    """
    history = await get_user_history(current_user_id)
    return {"status": "success", "history": history}

# ─── PART 6: INTERNAL MICROSERVICE APIs ──────────────────────────────────────

class RoomStatusUpdate(BaseModel):
    status: str

class EvaluationPayload(BaseModel):
    status: str
    report_data: Optional[str] = None
    transcript: Optional[str] = None

@app.get("/api/internal/hr-data/{room_name}")
async def internal_hr_data(room_name: str):
    return await hr_repo.get_hr_interview_data(room_name)

@app.get("/api/internal/coding-data/{room_name}")
async def internal_coding_data(room_name: str):
    return await coding_repo.get_coding_interview_data(room_name)

@app.put("/api/internal/room-status/{room_name}")
async def internal_room_status(room_name: str, payload: RoomStatusUpdate):
    await hr_repo.update_room_status(room_name, payload.status)
    return {"status": "success"}

@app.get("/api/internal/resume-summary/{room_name}")
async def internal_resume_summary(room_name: str):
    return {"resume": await hr_repo.get_resume_summary(room_name)}

@app.get("/api/internal/executions/{room_name}")
async def internal_executions(room_name: str):
    return {"executions": await coding_repo.get_execution_history(room_name)}

@app.post("/api/internal/evaluation/{room_name}")
async def internal_save_evaluation(room_name: str, payload: EvaluationPayload):
    await summary_repo.save_evaluation_report(
        room_name=room_name,
        status=payload.status,
        report_data=payload.report_data,
        transcript=payload.transcript
    )
    return {"status": "success"}

@app.get("/api/internal/state/{room_name}")
async def get_internal_state(room_name: str):
    redis_client = get_redis()
    if not redis_client:
        return {"state": None}
    cached_state = await redis_client.get(f"state:{room_name}")
    if cached_state:
        return {"state": json.loads(cached_state)}
    return {"state": None}

@app.post("/api/internal/state/{room_name}")
async def post_internal_state(room_name: str, request: Request):
    state_payload = await request.json()
    redis_client = get_redis()
    if redis_client:
        await redis_client.setex(f"state:{room_name}", 3600, json.dumps(state_payload))
    return {"status": "success"}