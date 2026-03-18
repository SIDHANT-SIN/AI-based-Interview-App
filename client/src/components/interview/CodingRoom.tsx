// src/components/interview/CodingRoom.tsx
import React, { useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import CodeEditor from "../ui/CodeEditor";
import TerminalOutput, { type TerminalStatus } from "../ui/TerminalOutput";
import { executeUserCode } from "../../services/api";

interface CodingRoomProps {
  url: string;
  token: string;
  problem: any;
  roomName: string;
}

// --- THE INNER WORKSPACE (Has access to LiveKit hooks) ---
function CodingWorkspace({
  problem,
  roomName,
}: {
  problem: any;
  roomName: string;
}) {
  const { localParticipant } = useLocalParticipant();
  const [code, setCode] = useState(problem.starter_code?.python || "");
  const [language, setLanguage] = useState("python");
  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus>("idle");
  const [terminalOutput, setTerminalOutput] = useState("");

  const runCodeLogic = async (isSubmit: boolean) => {
    setTerminalStatus("running");
    try {
      // 1. Send code to FastAPI -> Judge0
      const result = await executeUserCode(code, language, roomName);

      const newStatus = result.status === "success" ? "success" : "error";
      setTerminalStatus(newStatus);
      setTerminalOutput(result.output || "No output returned.");

      // 2. The Hidden Whisper (Only if they clicked "Submit")
      // 2. The Hidden Whisper (Only if they clicked "Submit")
      if (isSubmit && localParticipant) {
        // Create a JSON payload containing the identifier, the user's code, and the output
        const payload = JSON.stringify({
          type: "EXECUTION_RESULT",
          code: code, // This grabs the current code from your React state
          output: result.output || "No output returned.",
        });

        const encoder = new TextEncoder();
        // Send the JSON packet directly to Viral over LiveKit
        localParticipant.publishData(encoder.encode(payload), {
          reliable: true,
        });
        console.log(
          "🤫 Sent hidden JSON whisper to Viral with code and output!",
        );
      }
    } catch (error) {
      setTerminalStatus("error");
      setTerminalOutput("Failed to connect to execution server.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "85vh",
        width: "100%",
        gap: "1rem",
        padding: "1rem",
        backgroundColor: "#f5f5f5",
      }}
    >
      {/* LEFT PANE: Problem Description & Video */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div
          style={{
            flex: 1,
            backgroundColor: "white",
            color: "#1a1a1a", // 🛠️ Added: Ensures text is not white
            padding: "1.5rem",
            borderRadius: "8px",
            overflowY: "auto",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          {/* 🛠️ Added '?' safety checks below */}
          <h2 style={{ color: "#000" }}>
            {problem?.title || "Loading Title..."}
          </h2>
          <span
            style={{
              padding: "4px 8px",
              backgroundColor: "#e0e0e0",
              color: "#333",
              borderRadius: "4px",
              fontSize: "0.8rem",
              fontWeight: "bold",
            }}
          >
            {problem?.difficulty || "Medium"}
          </span>
          <p style={{ marginTop: "1rem", lineHeight: "1.6", color: "#444" }}>
            {problem?.description || "Loading problem description..."}
          </p>
        </div>

        {/* LiveKit Video Widget */}
        <div
          style={{
            height: "40%",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <VideoConference />
        </div>
      </div>

      {/* RIGHT PANE: Code Editor & Terminal */}
      <div
        style={{
          flex: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            backgroundColor: "white",
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <select
            value={language}
            onChange={(e) => {
              const lang = e.target.value;
              setLanguage(lang);
              // 🛠️ Added safety check for starter_code
              setCode(problem?.starter_code?.[lang] || "");
            }}
            style={{
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #ccc",
              color: "#000",
            }}
          >
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="c">C</option>
          </select>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => runCodeLogic(false)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#e0e0e0",
                color: "#000",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Run (Silent)
            </button>
            <button
              onClick={() => runCodeLogic(true)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Submit & Ask AI
            </button>
          </div>
        </div>

        <div style={{ flex: 2 }}>
          <CodeEditor
            code={code}
            language={language}
            onChange={(val) => setCode(val || "")}
          />
        </div>

        <div style={{ flex: 1 }}>
          <TerminalOutput status={terminalStatus} output={terminalOutput} />
        </div>
      </div>
    </div>
  );
}

// --- THE OUTER WRAPPER ---
export default function CodingRoom({
  url,
  token,
  problem,
  roomName,
}: CodingRoomProps) {
  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={url}
      data-lk-theme="default"
      style={{ height: "100%", width: "100%" }}
    >
      <CodingWorkspace problem={problem} roomName={roomName} />
    </LiveKitRoom>
  );
}
