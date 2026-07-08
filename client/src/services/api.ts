// src/services/api.ts

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── 1. SETUP APIs (Called BEFORE joining the interview) ────────────────────

export const setupHrRoom = async (file: File, token: string) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/hr/setup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error("Failed to setup HR room");
    return await response.json(); // Returns { status: "success", room_name: "hr-room-xyz" }
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

export const setupCodingRoom = async (token: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/coding/setup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to setup Coding room");
    return await response.json(); // Returns { status: "success", room_name: "coding-room-xyz", problem: {...} }
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// ─── 2. HANDSHAKE API (Called when the interview page loads) ────────────────

export const fetchLiveKitToken = async (
  roomName: string,
  participantName: string = "Candidate",
  token: string,
) => {
  const response = await fetch(`${API_BASE_URL}/api/get-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    // Note: We removed interviewType because the backend already knows what type it is!
    body: JSON.stringify({
      room_name: roomName,
      participant_name: participantName,
    }),
  });

  if (!response.ok) throw new Error("Failed to fetch LiveKit token");
  return response.json();
};

// ─── 3. IN-INTERVIEW & POST-INTERVIEW APIs ──────────────────────────────────
export const executeUserCode = async (
  sourceCode: string,
  language: string,
  roomName: string,
  token: string,
) => {
  try {
    // 🛠️ CHANGE 1: Inject roomName directly into the URL path
    const response = await fetch(`${API_BASE_URL}/api/execute/${roomName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        // 🛠️ CHANGE 2: Removed room_name from the body payload
        source_code: sourceCode,
        language: language,
      }),
    });

    if (!response.ok) throw new Error("Execution request failed");
    return await response.json();
  } catch (error) {
    console.error("Error executing code:", error);
    throw error;
  }
};
export const fetchSummary = async (roomName: string, token: string) => {
  const response = await fetch(`${API_BASE_URL}/api/summary/${roomName}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok)
    throw new Error(`Failed to fetch summary: ${response.status}`);
  return await response.json();
};

// Add this to your api.ts file

export const fetchCodingProblem = async (roomName: string, token: string) => {
  const response = await fetch(`${API_BASE_URL}/api/coding/room/${roomName}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch problem data");
  }

  return await response.json();
};

export const fetchHistory = async (token: string) => {
  const response = await fetch("http://localhost:8000/api/history", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch history");
  }

  return response.json();
};
