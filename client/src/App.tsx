// src/App.tsx
import React from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom"; // 🛠️ Added useParams
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import Setup from "./pages/Setup";
import LiveRoom from "./components/interview/LiveRoom";
import CodingInterview from "./pages/CodingInterview";
import InterviewSummary from "./pages/InterviewSummary";
import "./App.css";
import { fetchLiveKitToken } from "./services/api";
const LIVEKIT_URL = "wss://aiinterviewer-w2x9nsez.livekit.cloud";
const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzUwNDQ3MTYsImlkZW50aXR5IjoiVGVzdFVzZXIiLCJpc3MiOiJBUElINm5yYVQ1OHluQ3AiLCJuYmYiOjE3NzAwNDQ3MDIsInN1YiI6IlRlc3RVc2VyIiwidmlkZW8iOnsiY2FuUHVibGlzaCI6dHJ1ZSwiY2FuUHVibGlzaERhdGEiOnRydWUsImNhblN1YnNjcmliZSI6dHJ1ZSwicm9vbSI6InRlc3Qtcm9vbSIsInJvb21Kb2luIjp0cnVlfX0.71xke7pRYqj67t75WSlDkLU1Gn_xrYM32LfpYmD-Xqo";

// 🛠️ 1. Helper function to generate a unique 6-character room ID
// 🛠️ Updated to accept a prefix
const generateRoomId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).substring(2, 8)}`;

// 🛠️ 2. Main Menu now generates IDs before navigating
function MainMenu() {
  const navigate = useNavigate();

  const startHR = () => {
    const uniqueId = generateRoomId("hr-room");
    navigate(`/setup/hr/${uniqueId}`);
  };

  const startCoding = () => {
    const uniqueId = generateRoomId("coding-room");
    navigate(`/interview/coding/${uniqueId}`);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "2rem",
        marginTop: "10vh",
      }}
    >
      <button
        onClick={startHR}
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
        onClick={startCoding}
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
  );
}

// 🛠️ 3. Wrapper Components: These grab the ID from the URL and pass it to your existing pages
function SetupWrapper() {
  const { roomName } = useParams<{ roomName: string }>();
  return <Setup roomName={roomName!} />;
}

// 🛠️ Updated LiveRoomWrapper
function LiveRoomWrapper() {
  const { roomName } = useParams<{ roomName: string }>();
  const { user } = useUser(); // Grab the logged-in user's name
  const [connection, setConnection] = useState<{
    url: string;
    token: string;
  } | null>(null);

  useEffect(() => {
    const getToken = async () => {
      const name = user?.firstName || "Candidate";
      const data = await fetchLiveKitToken(roomName!, name);
      setConnection(data);
    };
    getToken();
  }, [roomName, user]);

  if (!connection)
    return (
      <div style={{ textAlign: "center", marginTop: "20vh" }}>
        <h2>Connecting to secure room...</h2>
      </div>
    );

  return (
    <LiveRoom
      url={connection.url}
      token={connection.token}
      roomName={roomName!}
    />
  );
}

// 🛠️ Updated CodingWrapper
function CodingWrapper() {
  const { roomName } = useParams<{ roomName: string }>();
  const { user } = useUser();
  const [connection, setConnection] = useState<{
    url: string;
    token: string;
  } | null>(null);

  useEffect(() => {
    const getToken = async () => {
      const name = user?.firstName || "Candidate";
      const data = await fetchLiveKitToken(roomName!, name);
      setConnection(data);
    };
    getToken();
  }, [roomName, user]);

  if (!connection)
    return (
      <div style={{ textAlign: "center", marginTop: "20vh" }}>
        <h2>Connecting to secure code environment...</h2>
      </div>
    );

  return (
    <CodingInterview
      url={connection.url}
      token={connection.token}
      roomName={roomName!}
    />
  );
}

export default function App() {
  const navigate = useNavigate();

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
            style={{
              fontWeight: "bold",
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
            onClick={() => navigate("/")}
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
          <Routes>
            <Route path="/" element={<MainMenu />} />
            <Route path="/setup/hr/:roomName" element={<SetupWrapper />} />
            <Route
              path="/interview/hr/:roomName"
              element={<LiveRoomWrapper />}
            />
            <Route
              path="/interview/coding/:roomName"
              element={<CodingWrapper />}
            />
            <Route path="/summary/:roomName" element={<InterviewSummary />} />
          </Routes>
        </SignedIn>
      </main>
    </div>
  );
}
