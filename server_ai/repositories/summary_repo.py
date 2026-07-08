import json
from utils.database import get_db
from utils.cache import get_redis

import json

async def get_summary_status(room_name: str) -> dict:
    db = get_db()
    try:
        room = await db["rooms"].find_one(
            {"_id": room_name},
            {
                "clerk_user_id": 1, 
                "summary_status": 1, 
                "summary_report": 1, 
                "transcript": 1
            }
        )
        return room if room else {}
    except Exception as e:
        print(f"⚠️ Could not fetch summary status: {e}")
        return {}


async def save_evaluation_report(room_name: str, status: str, report_data: str = None, transcript: str = None):
    """
    Safely parses the AI's string into a JSON object and saves it to MongoDB.
    """
    redis = get_redis()
    if redis:
        # Delete the passport key so the frontend cannot retrieve it again
        await redis.delete(f"passport:{room_name}") 
    db = get_db()
    update_fields = {"summary_status": status}

    
    if report_data:
        try:
            update_fields["summary_report"] = json.loads(report_data)
        except json.JSONDecodeError:
            update_fields["summary_report"] = {"error": "Failed to parse AI output", "raw": report_data}

    if transcript:
        update_fields["transcript"] = transcript

    
    unset_fields = {
        "resume_summary": "",
        "syllabus": "",
        "hr_questions": "",
        "problem": ""   # Deletes the giant problem object, but we keep problem_title!
    }

    await db["rooms"].update_one(
        {"_id": room_name},
        {
            "$set": update_fields,
            "$unset": unset_fields
        }
    )


# In repositories/summary_repo.py (or a new history_repo.py)

async def get_user_history(clerk_user_id: str) -> list:
    """
    Fetches all rooms belonging to a specific user, sorted by newest first.
    Returns only the fields needed for a list view to save bandwidth.
    """
    db = get_db()
    
    # 1. Fetch from DB, sort by created_at descending (-1)
    cursor = db["rooms"].find(
        {"clerk_user_id": clerk_user_id},
        # 2. Projection: Only return fields needed for the dashboard cards
        {
            "_id": 1, 
            "interview_type": 1, 
            "status": 1, 
            "created_at": 1, 
            "summary_status": 1,
        }
    ).sort("created_at", -1)
    
    rooms = await cursor.to_list(length=100)
    
    # 3. Clean up the _id field for the frontend
    for room in rooms:
        room["room_name"] = room.pop("_id")
        
    return rooms