import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import "./App.css";

// ----------------------------------------------------
// ⚠️ TEMP: Paste your credentials here for testing
// ----------------------------------------------------
const LIVEKIT_URL = "wss://aiinterviewer-w2x9nsez.livekit.cloud";
const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzUwNDQ3MTYsImlkZW50aXR5IjoiVGVzdFVzZXIiLCJpc3MiOiJBUElINm5yYVQ1OHluQ3AiLCJuYmYiOjE3NzAwNDQ3MDIsInN1YiI6IlRlc3RVc2VyIiwidmlkZW8iOnsiY2FuUHVibGlzaCI6dHJ1ZSwiY2FuUHVibGlzaERhdGEiOnRydWUsImNhblN1YnNjcmliZSI6dHJ1ZSwicm9vbSI6InRlc3Qtcm9vbSIsInJvb21Kb2luIjp0cnVlfX0.71xke7pRYqj67t75WSlDkLU1Gn_xrYM32LfpYmD-Xqo";
// ----------------------------------------------------

export default function App() {
  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">🎙</div>
          <span className="brand-name">InterviewAI</span>
          <span className="brand-badge">Beta</span>
        </div>

        <div className="header-right">
          <SignedIn>
            <span className="status-dot">Live</span>
            <UserButton />
          </SignedIn>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-main">

        {/* — Signed-out: Welcome screen — */}
        <SignedOut>
          <div className="welcome-screen">
            <div className="welcome-card">
              <div className="welcome-icon">🤖</div>
              <h2 className="welcome-title">AI-Powered Interviews</h2>
              <p className="welcome-subtitle">
                Practice technical and behavioural interviews with an AI agent
                that joins your video call in real time.
              </p>

              <div className="welcome-features">
                <div className="feature-row">
                  <span className="feature-icon">📹</span>
                  Live video with AI interviewer
                </div>
                <div className="feature-row">
                  <span className="feature-icon">💬</span>
                  Real-time voice &amp; feedback
                </div>
                <div className="feature-row">
                  <span className="feature-icon">📊</span>
                  Performance analysis after session
                </div>
              </div>

              <div className="divider" />

              <SignInButton mode="modal">
                <button className="btn-primary">
                  <span>→</span> Sign in to start
                </button>
              </SignInButton>
            </div>
          </div>
        </SignedOut>

        {/* — Signed-in: Interview room — */}
        <SignedIn>
          <div className="interview-room">
            {/* Info bar */}
            <div className="interview-bar">
              <div className="bar-item">
                Session <strong>#T-001</strong>
              </div>
              <div className="bar-sep" />
              <div className="bar-item">
                Role <strong>Software Engineer</strong>
              </div>
              <div className="bar-sep" />
              <div className="bar-item">
                Round <strong>Technical</strong>
              </div>
              <div className="recording-badge">REC</div>
            </div>

            {/* LiveKit video */}
            <div className="livekit-wrapper">
              <LiveKitRoom
                video={true}
                audio={true}
                token={TOKEN}
                serverUrl={LIVEKIT_URL}
                data-lk-theme="default"
                style={{ height: "100%", width: "100%" }}
              >
                <VideoConference />
              </LiveKitRoom>
            </div>
          </div>
        </SignedIn>

      </main>
    </div>
  );
}
