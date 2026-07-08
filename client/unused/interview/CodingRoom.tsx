// src/components/interview/CodingRoom.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // 🛠️ 1. Import Router navigation

// WITH this:
import {
  LiveKitRoom,
  VideoConference,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  ParticipantTile,
} from "@livekit/components-react";
import { Track } from "livekit-client";
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
// PIP-style self-view — just the raw video tile, no control bar
function SelfVideoTile() {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);
  const localTrack = tracks.find((t) => t.participant.isLocal);

  if (!localTrack)
    return (
      <div className="pip-placeholder">
        <span>📷</span>
        <p>Camera off</p>
      </div>
    );

  return (
    <ParticipantTile
      trackRef={localTrack}
      style={{
        height: "100%",
        width: "100%",
        borderRadius: "var(--radius-lg)",
      }}
    />
  );
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
  const room = useRoomContext(); // 🛠️ Grab the current room instance
  const navigate = useNavigate(); // 🛠️ Initialize navigate

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
      if (isSubmit && localParticipant) {
        const payload = JSON.stringify({
          type: "EXECUTION_RESULT",
          code: code,
          output: result.output || "No output returned.",
        });

        const encoder = new TextEncoder();
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

  // 🛠️ 3. The End Interview Logic
  const handleEndInterview = async () => {
    // Tell LiveKit to drop the connection. This triggers the backend listener!
    await room.disconnect();
    // Instantly navigate to the loading/summary screen
    navigate(`/summary/${roomName}`);
  };

  return (
    <div className="coding-room">
      {/* Top bar */}
      <div className="coding-room-bar">
        <div className="coding-room-bar-left">
          <span className="badge badge-neutral">🧩 Coding Interview</span>
          {problem?.difficulty && (
            <span
              className={`badge ${
                problem.difficulty === "Easy"
                  ? "badge-green"
                  : problem.difficulty === "Medium"
                    ? "badge-amber"
                    : "badge-red"
              }`}
            >
              {problem.difficulty}
            </span>
          )}
        </div>

        <div className="coding-room-bar-right">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => {
              const lang = e.target.value;
              setLanguage(lang);
              setCode(problem?.starter_code?.[lang] || "");
            }}
            className="coding-lang-select"
          >
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="c">C</option>
          </select>

          <button
            onClick={() => runCodeLogic(false)}
            className="btn btn-secondary btn-sm"
          >
            ▶ Run
          </button>

          <button
            onClick={() => runCodeLogic(true)}
            className="btn btn-primary btn-sm"
          >
            ✦ Submit & Ask AI
          </button>

          <button
            onClick={handleEndInterview}
            className="btn btn-danger btn-sm"
          >
            End Interview
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="coding-room-body">
        {/* LEFT: Problem + Video */}
        <div className="coding-room-left">
          {/* Problem description */}
          <div className="card coding-problem-card">
            <h2 className="coding-problem-title">
              {problem?.title || "Loading..."}
            </h2>
            <p className="coding-problem-desc">
              {problem?.description || "Loading problem description..."}
            </p>
          </div>
          <div className="coding-video-outer">
            <div className="coding-video-inner">
              <SelfVideoTile />
            </div>
          </div>
        </div>

        {/* RIGHT: Editor + Terminal */}
        <div className="coding-room-right">
          <div className="coding-editor-panel">
            <CodeEditor
              code={code}
              language={language}
              onChange={(val) => setCode(val || "")}
            />
          </div>

          <div className="coding-terminal-panel">
            <TerminalOutput status={terminalStatus} output={terminalOutput} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- THE OUTER WRAPPER ---
// 🛠️ 5. Added the onDisconnected hook here too, just in case they click the built-in red phone button inside <VideoConference />
export default function CodingRoom({
  url,
  token,
  problem,
  roomName,
}: CodingRoomProps) {
  const navigate = useNavigate();

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={url}
      data-lk-theme="default"
      style={{ height: "100%", width: "100%" }}
      onDisconnected={() => navigate(`/summary/${roomName}`)}
    >
      <CodingWorkspace problem={problem} roomName={roomName} />
    </LiveKitRoom>
  );
}
