from utils.database import get_db
from pydantic import TypeAdapter
from models.schemas import RoomDocument, CodingRedisPayload, ExecutionRedisPayload
from utils.cache import get_redis

# Initialize the validator once
room_validator = TypeAdapter(RoomDocument)

# ─── 1. WRITE OPERATIONS (Schema Enforced) ───────────────────────────────────

async def create_coding_room(room_name: str, clerk_user_id: str, problem_data: dict) -> dict:
    """
    Creates a new Coding room. 
    Strictly validates the data against the CodingRoom schema before writing.
    """
    db = get_db()
    
    # 1. Build the raw dictionary required for a brand new Coding room
    raw_data = {
        "_id": room_name,
        "clerk_user_id": clerk_user_id,
        "interview_type": "coding",
    }
    
    # 2. THE ENFORCER: Validates against models/schemas.py! 
    validated_room = room_validator.validate_python(raw_data)
    
    # 3. Convert to a safe dictionary and insert into MongoDB
    safe_db_payload = validated_room.model_dump(by_alias=True, exclude_none=True)
    await db["rooms"].insert_one(safe_db_payload)
    
    # 4. Heavy Redis Payload
    redis_client = get_redis()
    if redis_client:
        safe_redis_object = CodingRedisPayload(**problem_data)
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


async def save_code_execution(room_name: str, code: str, result: str) -> bool:
    redis_client = get_redis()
    if redis_client:
        # 1. Pydantic validation before touching Redis!
        safe_payload = ExecutionRedisPayload(code=code, result=result)
        
        # 2. Native Redis List Push
        await redis_client.rpush(f"executions:{room_name}", safe_payload.model_dump_json())
        
        # 3. Keep the memory clean! Expire in 1 hour.
        await redis_client.expire(f"executions:{room_name}", 3600)
        return True
    return False


# ─── 2. READ OPERATIONS (For the LiveKit Agent) ──────────────────────────────

async def get_coding_interview_data(room_name: str) -> dict:
    """
    Called by coding_agent.py.
    Fetches the problem data so the LangGraph state knows what the user is solving.
    """
    
    # 1. Setup absolute fallback defaults
    result = {
        "problem_title": "Two Sum",
        "problem_description": "Given an array of integers nums and an integer target...",
        "starter_code": {},
        "difficulty": "Easy"
    }

    try:
        import json
        redis_client = get_redis()
        nested_problem = {}
        if redis_client:
            cached_json = await redis_client.get(f"syllabus:{room_name}")
            if cached_json:
                nested_problem = json.loads(cached_json)
                print(f"⚡ Fetched problem data from Redis for {room_name}")

        if nested_problem:
            result["problem_title"] = nested_problem.get("title", result["problem_title"])
            result["problem_description"] = nested_problem.get("description", result["problem_description"])
            result["starter_code"] = nested_problem.get("starter_code", {})
            result["difficulty"] = nested_problem.get("difficulty", "Easy")
        else:
            print(f"⚠️ No data in Redis for {room_name}, using default problem.")
            
    except Exception as e:
        print(f"⚠️ Could not fetch from MongoDB: {e}")

    return result


async def get_random_problem() -> dict:
    """Fetches a random problem from the 'problems' collection."""
    db = get_db()
    try:
        cursor = db["problems"].aggregate([{"$sample": {"size": 1}}])
        problems_list = await cursor.to_list(length=1)
        if problems_list:
            selected = problems_list[0]
            selected.pop("_id", None) # Remove the Mongo ID so it's clean
            return selected
    except Exception as e:
        print(f"DB Error fetching problem: {e}")
        
    return {"title": "Two Sum", "description": "Given an array..."}


async def get_execution_history(room_name: str) -> list:
    import json
    redis_client = get_redis()
    if not redis_client: 
        return []
        
    # lrange fetches every item saved in the Redis List from index 0 to -1 (the end)
    raw_list = await redis_client.lrange(f"executions:{room_name}", 0, -1)
    return [json.loads(item) for item in raw_list]

