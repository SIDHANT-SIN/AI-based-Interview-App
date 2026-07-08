from utils.database import get_db
from pydantic import TypeAdapter
from models.schemas import RoomDocument,HRRedisPayload
from utils.cache import get_redis

# Initialize the validator once so it can be used efficiently
room_validator = TypeAdapter(RoomDocument)


# ─── 1. WRITE OPERATIONS (Schema Enforced) ───────────────────────────────────


async def create_hr_room(room_name: str, clerk_user_id: str, resume_summary: str, syllabus: dict, hr_questions: list) -> dict:
    db = get_db()
    raw_data = {
        "_id": room_name,
        "clerk_user_id": clerk_user_id,
        "interview_type": "hr"
    }
    
    validated_room = room_validator.validate_python(raw_data)
    safe_db_payload = validated_room.model_dump(by_alias=True, exclude_none=True)
    await db["rooms"].insert_one(safe_db_payload)
    
    redis_client = get_redis()
    if redis_client:
        safe_redis_object = HRRedisPayload(
            resume_summary=resume_summary,
            syllabus=syllabus,
            hr_questions=hr_questions
        )
        await redis_client.setex(f"syllabus:{room_name}", 3600, safe_redis_object.model_dump_json())
        
    return safe_db_payload

async def update_room_status(room_name: str, new_status: str) -> bool:
    """
    Updates the status of the room (e.g., to "COMPLETED" when the timer ends).
    """
    db = get_db()
    result = await db["rooms"].update_one(
        {"_id": room_name},
        {"$set": {"status": new_status}}
    )
    redis = get_redis()
    if redis:
        await redis.delete(f"passport:{room_name}")
    return result.modified_count > 0


# ─── 2. READ OPERATIONS (No schema validation strictly needed here) ──────────

async def get_hr_interview_data(room_name: str) -> dict:
    """
    Fetches the HR room data from MongoDB and formats it perfectly
    for the LangGraph initial state.
    """
    
    # 1. Setup absolute fallback defaults
    result = {
        "dynamic_resume": "Software Engineer candidate.",
        "tech_q_list": [{"question": "DUMMY", "expected_answer": "DUMMY"}],
        "hr_q_list": [{"question": "DUMMY", "expected_answer": "DUMMY"}]
    }

    import json

    try:
        redis_client = get_redis()
        redis_payload = {}
        if redis_client:
            cached_json = await redis_client.get(f"syllabus:{room_name}")
            if cached_json:
                redis_payload = json.loads(cached_json)

        if redis_payload:
            result["dynamic_resume"] = redis_payload.get("resume_summary", result["dynamic_resume"])
            
            syllabus_dict = redis_payload.get("syllabus", {})
            if isinstance(syllabus_dict, dict):
                raw_tech = syllabus_dict.get("target_project", {}).get("technical_questions", [])
                if raw_tech:
                    result["tech_q_list"] = [{"question": q["question"], "expected_answer": ", ".join(q.get("expected_criteria") or ["substantive answer"])} for q in raw_tech]
            
            if redis_payload.get("hr_questions"):
                result["hr_q_list"] = [{"question": q["question"], "expected_answer": ", ".join(q.get("what_to_listen_for") or ["good answer"])} for q in redis_payload["hr_questions"]]
        
    except Exception as e:
        print(f"⚠️ Could not fetch from MongoDB: {e}")

    return result

async def get_resume_summary(room_name: str) -> str:
    import json
    redis_client = get_redis()
    fallback = "No resume provided."
    if not redis_client: 
        return fallback
        
    cached_json = await redis_client.get(f"syllabus:{room_name}")
    if cached_json:
        return json.loads(cached_json).get("resume_summary", fallback)
        
    return fallback
