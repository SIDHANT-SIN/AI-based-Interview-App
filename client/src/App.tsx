// src/App.tsx
import React, { useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";
import Setup from "./pages/Setup";
import LiveRoom from "./components/interview/LiveRoom";
import CodingInterview from "./pages/CodingInterview";
import "./App.css";

// ----------------------------------------------------
// ⚠️ TEMP: Your existing credentials
// ----------------------------------------------------
const LIVEKIT_URL = "wss://aiinterviewer-w2x9nsez.livekit.cloud";
const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzUwNDQ3MTYsImlkZW50aXR5IjoiVGVzdFVzZXIiLCJpc3MiOiJBUElINm5yYVQ1OHluQ3AiLCJuYmYiOjE3NzAwNDQ3MDIsInN1YiI6IlRlc3RVc2VyIiwidmlkZW8iOnsiY2FuUHVibGlzaCI6dHJ1ZSwiY2FuUHVibGlzaERhdGEiOnRydWUsImNhblN1YnNjcmliZSI6dHJ1ZSwicm9vbSI6InRlc3Qtcm9vbSIsInJvb21Kb2luIjp0cnVlfX0.71xke7pRYqj67t75WSlDkLU1Gn_xrYM32LfpYmD-Xqo";
const HARDCODED_ROOM_NAME = "test-room"; // Matches your token's room access
// ----------------------------------------------------

export default function App() {
  const [selectedTrack, setSelectedTrack] = useState<"none" | "hr" | "coding">(
    "none",
  );
  const [isReady, setIsReady] = useState(false);

  return (
    <div className="app-shell">
      <header
        className="app-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "1rem",
          borderBottom: "1px solid #eaeaea",
        }}
      >
        <div className="header-brand">
          <span
            className="brand-name"
            style={{ fontWeight: "bold", fontSize: "1.2rem" }}
          >
            🎙 InterviewAI
          </span>
        </div>
        <div className="header-right">
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </header>

      <main className="app-main">
        <SignedOut>
          <div style={{ textAlign: "center", marginTop: "10vh" }}>
            <h2>Welcome to AI-Powered Interviews</h2>
            <SignInButton mode="modal">
              <button className="btn-primary">Sign in to start</button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          {/* Step 1: Track Selection */}
          {selectedTrack === "none" && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "2rem",
                marginTop: "10vh",
              }}
            >
              <button
                onClick={() => setSelectedTrack("hr")}
                style={{
                  padding: "2rem",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                👔 Start HR/Behavioral Track
              </button>
              <button
                onClick={() => setSelectedTrack("coding")}
                style={{
                  padding: "2rem",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                💻 Start Coding Track
              </button>
            </div>
          )}

          {/* Step 2: Render the chosen track */}
          {selectedTrack === "hr" && !isReady && (
            <Setup
              roomName={HARDCODED_ROOM_NAME}
              onSetupComplete={() => setIsReady(true)}
            />
          )}
          {selectedTrack === "hr" && isReady && (
            <LiveRoom url={LIVEKIT_URL} token={TOKEN} />
          )}

          {selectedTrack === "coding" && (
            <CodingInterview
              url={LIVEKIT_URL}
              token={TOKEN}
              roomName={HARDCODED_ROOM_NAME}
            />
          )}
        </SignedIn>
      </main>
    </div>
  );
}
