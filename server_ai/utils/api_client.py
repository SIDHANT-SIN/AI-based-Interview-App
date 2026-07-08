import os
import httpx

INTERNAL_API_URL = os.getenv("INTERNAL_API_URL", "http://127.0.0.1:8000/api/internal")

async def get_hr_interview_data(room_name: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{INTERNAL_API_URL}/hr-data/{room_name}")
        response.raise_for_status()
        return response.json()

async def get_coding_interview_data(room_name: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{INTERNAL_API_URL}/coding-data/{room_name}")
        response.raise_for_status()
        return response.json()

async def update_room_status(room_name: str, new_status: str) -> bool:
    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{INTERNAL_API_URL}/room-status/{room_name}",
            json={"status": new_status}
        )
        response.raise_for_status()
        return response.json().get("status") == "success"

async def get_resume_summary(room_name: str) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{INTERNAL_API_URL}/resume-summary/{room_name}")
        response.raise_for_status()
        return response.json().get("resume", "No resume provided.")

async def get_execution_history(room_name: str) -> list:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{INTERNAL_API_URL}/executions/{room_name}")
        response.raise_for_status()
        return response.json().get("executions", [])

async def save_evaluation_report(room_name: str, status: str, report_data: str = None, transcript: str = None):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{INTERNAL_API_URL}/evaluation/{room_name}",
            json={
                "status": status,
                "report_data": report_data,
                "transcript": transcript
            }
        )
        response.raise_for_status()
        return response.json().get("status") == "success"

async def fetch_room_state(room_name: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{INTERNAL_API_URL}/state/{room_name}")
        response.raise_for_status()
        return response.json().get("state")

async def save_room_state(room_name: str, payload: dict):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{INTERNAL_API_URL}/state/{room_name}",
            json=payload
        )
        response.raise_for_status()
