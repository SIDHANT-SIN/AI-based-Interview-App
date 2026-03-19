// src/pages/Setup.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // 🛠️ Import useNavigate
import FileUpload from "../components/ui/FileUpload";
import { uploadResumeToBackend } from "../services/api";

interface SetupProps {
  roomName: string;
}

// 🛠️ Removed onSetupComplete prop
export default function Setup({ roomName }: SetupProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate(); // 🛠️ Initialize router hook

  const handleStartInterview = async () => {
    if (!file) {
      setError("Please select a resume first.");
      return;
    }
    setIsUploading(true);
    setError(null);

    try {
      await uploadResumeToBackend(file, roomName);
      // 🛠️ THE FIX: Attach the roomName to the end of the URL!
      navigate(`/interview/hr/${roomName}`);
    } catch (err) {
      setError("Failed to process resume. Is your Python server running?");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="setup-page"
      style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}
    >
      <h2>Let's set up your Interview</h2>
      <p>
        Upload your resume so the AI can tailor the technical questions to your
        experience.
      </p>

      <FileUpload onFileSelect={setFile} selectedFile={file} />

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button
        onClick={handleStartInterview}
        disabled={!file || isUploading}
        className="btn-primary"
        style={{
          padding: "1rem 2rem",
          fontSize: "1.1rem",
          marginTop: "1rem",
          width: "100%",
        }}
      >
        {isUploading ? "Analyzing Resume..." : "Start Interview"}
      </button>
    </div>
  );
}
