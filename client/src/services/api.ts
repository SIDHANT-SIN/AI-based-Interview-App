// src/services/api.ts

export const uploadResumeToBackend = async (file: File, roomName: string) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("room_name", roomName);

  try {
    const response = await fetch("http://localhost:8000/api/upload-resume", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload resume");
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

export const fetchCodingProblem = async () => {
  try {
    const response = await fetch("http://localhost:8000/api/get-problem");
    if (!response.ok) throw new Error("Failed to fetch problem");
    const data = await response.json();
    return data.problem;
  } catch (error) {
    console.error("Error fetching problem:", error);
    throw error;
  }
};

export const executeUserCode = async (
  sourceCode: string,
  language: string,
  roomName: string,
) => {
  try {
    const response = await fetch("http://localhost:8000/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: sourceCode,
        language: language,
        room_name: roomName,
      }),
    });

    if (!response.ok) throw new Error("Execution request failed");
    return await response.json();
  } catch (error) {
    console.error("Error executing code:", error);
    throw error;
  }
};
