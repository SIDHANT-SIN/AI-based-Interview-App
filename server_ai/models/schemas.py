from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Literal, Union
from typing_extensions import Annotated
import time

# ─── 1. THE FOUNDATION ───────────────────────────────────────────────────────
class BaseRoom(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(..., alias="_id")  
    clerk_user_id: str
    interview_type: str
    status: Literal["PENDING", "IN_PROGRESS", "COMPLETED"] = "PENDING"
    created_at: float = Field(default_factory=time.time)
    
    summary_status: Optional[Literal["processing", "completed"]] = None
    summary_report: Optional[Dict] = None
    transcript: Optional[str] = None

# ─── 2. THE HR ROOM ──────────────────────────────────────────────────────────
class HRRoom(BaseRoom):
    interview_type: Literal["hr"] 
    # Notice: Resume, syllabus, and hr_questions are completely GONE.

# ─── 3. THE CODING ROOM ──────────────────────────────────────────────────────
class CodingRoom(BaseRoom):
    interview_type: Literal["coding"] 
    
# ─── 4. THE DISCRIMINATOR ────────────────────────────────────────────────────
RoomDocument = Annotated[Union[HRRoom, CodingRoom], Field(discriminator="interview_type")]

# ─── 5. REDIS CACHE SCHEMAS (The Guardians of the Cache) ─────────────────────
class HRRedisPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    resume_summary: str
    syllabus: Dict
    hr_questions: List[Dict]

class CodingRedisPayload(BaseModel):
    model_config = ConfigDict(extra="allow") 
    title: str
    description: str
    starter_code: Optional[Dict] = None
    difficulty: Optional[str] = "Easy"

class ExecutionRedisPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str
    result: Union[str,Dict]
