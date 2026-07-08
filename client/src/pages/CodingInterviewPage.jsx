// src/pages/CodingInterviewPage.jsx
// Requires: npm install react-resizable-panels
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import {
  LiveKitRoom,
  useLocalParticipant,
  useRoomContext,
  RoomAudioRenderer,
  useRemoteParticipants,
} from "@livekit/components-react";
import { Panel, PanelGroup } from "react-resizable-panels";
import "@livekit/components-styles";

import { fetchLiveKitToken, executeUserCode, fetchCodingProblem } from "../services/api";
import { useProctoring } from "../hooks/useProctoring";

// UI Components
import PanelHeader from "../components/UI/PanelHeader";
import ResizeHandle from "../components/UI/ResizeHandle";
// Video Components
import LocalVideoFeed from "../components/Video/LocalVideoFeed";
import AIVideoFeed from "../components/Video/AIVideoFeed";
// Coding Components
import TopBar from "../components/Coding/TopBar";
import ProblemStatement from "../components/Coding/ProblemStatement";
import EditorBlock from "../components/Coding/EditorBlock";
import TerminalConsole from "../components/Coding/TerminalConsole";

/* ── MOBILE HOOK ────────────────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 840 : false,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 840);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

/* ── OUTER PAGE ─────────────────────────────────────────────── */
export default function CodingInterviewPage() {
  const { roomName } = useParams();
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [connection, setConnection] = useState(null);
  const [problem, setProblem] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (connection) return;
    const init = async () => {
      if (!user) return;
      const name = user.firstName || "Candidate";
      const clerkToken = await getToken();
      if (!clerkToken) {
        console.error("User not authenticated");
        navigate("/");
        return;
      }
      try {
        const tokenData = await fetchLiveKitToken(roomName, name, clerkToken);
        setConnection({ url: tokenData.url, token: tokenData.token });
        const problemData = await fetchCodingProblem(roomName, clerkToken);
        setProblem(problemData);
      } catch (err) {
        console.error("Failed to initialize room:", err);
        setError("Unauthorized, or this interview room has expired.");
      }
    };
    init();
  }, [roomName, user, connection, getToken, navigate]);

  if (error) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-6 bg-transparent text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-app-coral/10 border border-app-coral/30 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(255,79,106,0.2)]">
          🛑
        </div>
        <div className="flex flex-col gap-2 max-w-md">
          <h2 className="font-orbitron text-2xl font-black text-white uppercase tracking-wide m-0">
            Access Denied
          </h2>
          <p className="font-dm text-sm text-white/50 m-0">{error}</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 mt-4 font-orbitron text-[10px] font-bold tracking-widest uppercase text-white bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.98]"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!connection || !problem) {
    return (
      <div className="flex-1 w-full flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-5 text-center w-[90%] max-w-[400px] bg-white/[0.02] border border-white/10 rounded-2xl p-8 sm:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
          <div className="w-12 h-12 rounded-full border-[3px] border-app-lime/20 border-t-app-lime animate-spin shadow-[0_0_20px_rgba(163,255,60,0.2)]" />
          <div className="flex flex-col gap-1.5">
            <h2 className="font-orbitron text-lg font-black tracking-widest uppercase text-white m-0">
              Initializing IDE
            </h2>
            <p className="font-dm text-xs text-white/40 m-0">
              Preparing secure coding workspace & pulling problem constraints…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={connection.token}
      serverUrl={connection.url}
      data-lk-theme="default"
      className="lk-room-container"
      style={{
        position: "fixed",
        top: 64, // ← change to 0 if no navbar sits above this page
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      onDisconnected={() => navigate(`/summary/${roomName}`)}
    >
      <CodingWorkspace
        roomName={roomName}
        problem={problem}
      />
    </LiveKitRoom>
  );
}

/* ── INNER WORKSPACE ────────────────────────────────────────── */
function CodingWorkspace({ roomName, problem }) {
  const navigate = useNavigate();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const isMobile = useIsMobile();
  const remoteParticipants = useRemoteParticipants();
  const aiAgent = remoteParticipants[0];
  const { getToken } = useAuth();

  const [code, setCode] = useState(problem.starter_code?.python || "");
  const [language, setLanguage] = useState("python");
  const [terminalStatus, setTerminalStatus] = useState("idle");
  const [terminalOutput, setTerminalOutput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false); 

  // 🛡️ Start Client-Side Video Proctoring
  useProctoring(isCameraOff);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCode(problem?.starter_code?.[lang] || "");
  };

  const runCode = async (isSubmit) => {
    setTerminalStatus("running");
    try {
      const clerkToken = await getToken();
      if (!clerkToken) {
        setTerminalStatus("error");
        setTerminalOutput("Authentication error: Missing Clerk token.");
        return;
      }
      const result = await executeUserCode(
        code,
        language,
        roomName,
        clerkToken,
      );
      const newStatus = result.status === "success" ? "success" : "error";
      setTerminalStatus(newStatus);
      setTerminalOutput(result.output || "No output returned.");
      if (isSubmit && localParticipant) {
        const payload = JSON.stringify({
          type: "EXECUTION_RESULT",
          code,
          output: result.output || "No output returned.",
        });
        localParticipant.publishData(new TextEncoder().encode(payload), {
          reliable: true,
        });
      }
    } catch {
      setTerminalStatus("error");
      setTerminalOutput("Failed to connect to execution server.");
    }
  };

  const handleToggleMic = () => {
    localParticipant.setMicrophoneEnabled(isMuted);
    setIsMuted(!isMuted);
  };

  const handleEndInterview = async () => {
    if (localParticipant) {
      const payload = JSON.stringify({ type: "INTENTIONAL_END" });
      await localParticipant.publishData(new TextEncoder().encode(payload), {
        reliable: true,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    await room.disconnect();
    navigate(`/summary/${roomName}`);
  };

  const terminalLabel =
    terminalStatus === "idle"
      ? "Console"
      : terminalStatus === "running"
        ? "Running…"
        : terminalStatus === "success"
          ? "Passed"
          : "Error";

  const terminalColor =
    terminalStatus === "running"
      ? "text-amber-400"
      : terminalStatus === "success"
        ? "text-app-lime"
        : terminalStatus === "error"
          ? "text-app-coral"
          : "text-white/40";

  /* ── Shared video block ── */
  const VideoBlock = (
    <div className="flex-1 flex items-center justify-center bg-[#05070a] overflow-hidden min-h-0 relative">
      <div className="w-full h-full overflow-hidden flex flex-col">
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
          <div
            className={`flex-1 relative ${aiAgent ? "border-r border-white/10" : ""}`}
          >
            <LocalVideoFeed isCameraOff={isCameraOff} />
          </div>
          <AIVideoFeed aiAgent={aiAgent} isCodingPage={true} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        /* ── Scrollbar styling ── */
        .coding-root {
          scrollbar-width: thin;
          scrollbar-color: rgba(163,255,60,0.35) transparent;
        }
        .coding-root::-webkit-scrollbar { width: 6px; height: 6px; }
        .coding-root::-webkit-scrollbar-track { background: transparent; }
        .coding-root::-webkit-scrollbar-thumb {
          background: rgba(163,255,60,0.35);
          border-radius: 999px;
        }
        .coding-root::-webkit-scrollbar-thumb:hover {
          background: rgba(163,255,60,0.6);
        }

        /* LiveKit wrapper fix */
        .lk-room-container {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          min-height: 0 !important;
        }
        .lk-room-container > div:first-child {
          flex: 1 1 0 !important;
          min-height: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }
      `}</style>

      <div
        className={`coding-root w-full bg-transparent box-border flex flex-col ${isMobile ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"
          }`}
        style={{ flex: "1 1 0", minHeight: 0 }}
      >
        <RoomAudioRenderer />
        <RoomAudioRenderer />

        {/* ── FRONTEND CURTAIN ── */}
        {!aiAgent && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 backdrop-blur-xl">
            <div className="w-16 h-16 rounded-full border-[4px] border-app-lime/20 border-t-app-lime animate-spin shadow-[0_0_30px_rgba(163,255,60,0.3)] mb-6" />
            <h2 className="font-orbitron text-2xl font-black tracking-widest uppercase text-white mb-2">
              Connecting to Viral
            </h2>
            <p className="font-dm text-sm text-zinc-400">
              Please wait while your AI Interviewer joins the room...
            </p>
          </div>
        )}

        <TopBar
          problem={problem}
          aiAgent={aiAgent}
          language={language}
          handleLanguageChange={handleLanguageChange}
          runCode={runCode}
          isMuted={isMuted}
          handleToggleMic={handleToggleMic}
          handleEndInterview={handleEndInterview}
        />

        {/* ── MOBILE layout ── */}
        {isMobile && (
          <div className="flex flex-col w-full pb-8">
            <div className="flex flex-col w-full bg-white/[0.02] backdrop-blur-md border-b border-white/10 overflow-hidden h-[220px]">
              <PanelHeader dots label="Camera Feeds" badge="video" />
              {VideoBlock}
            </div>

            <div className="flex flex-col w-full bg-white/[0.02] backdrop-blur-md border-b border-white/10 overflow-hidden">
              <PanelHeader dots label={problem.title || "Problem Statement"} badge="mission" />
              <ProblemStatement problem={problem} />
            </div>

            <div className="flex flex-col w-full bg-[#05070a]/80 backdrop-blur-md border-b border-white/10 overflow-hidden h-[400px]">
              <PanelHeader dots label={language.toUpperCase()} badge="editor" />
              <EditorBlock code={code} setCode={setCode} language={language} />
            </div>

            <div className="flex flex-col w-full bg-[#05070a]/90 backdrop-blur-md overflow-hidden min-h-[200px]">
              <PanelHeader dots label={terminalLabel} badge="output" statusColorClass={terminalColor} />
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                <TerminalConsole status={terminalStatus} output={terminalOutput} />
              </div>
            </div>
          </div>
        )}

        {/* ── DESKTOP layout ── */}
        {!isMobile && (
          <div
            className="w-full p-4 box-border flex flex-col"
            style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}
          >
            <div
              className="w-full rounded-xl flex flex-col overflow-hidden border border-white/10 bg-white/[0.02] backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
              style={{ flex: "1 1 0", minHeight: 0 }}
            >
              <PanelGroup
                direction="horizontal"
                autoSaveId="hiregraph-coding-layout"
                style={{ flex: "1 1 0", minHeight: 0 }}
              >
                {/* LEFT column */}
                <Panel defaultSize={38} minSize={22}>
                  <PanelGroup direction="vertical">
                    <Panel defaultSize={52} minSize={20}>
                      <div className="flex flex-col h-full w-full bg-transparent overflow-hidden">
                        <PanelHeader dots label={problem.title || "Problem Statement"} badge="mission" />
                        <ProblemStatement problem={problem} />
                      </div>
                    </Panel>

                    <ResizeHandle />

                    <Panel defaultSize={48} minSize={18}>
                      <div className="flex flex-col h-full w-full bg-black/40 overflow-hidden">
                        <PanelHeader dots label="Live Feed" badge="video" />
                        {VideoBlock}
                      </div>
                    </Panel>
                  </PanelGroup>
                </Panel>

                <ResizeHandle vertical />

                {/* RIGHT column */}
                <Panel defaultSize={62} minSize={30}>
                  <PanelGroup direction="vertical">
                    <Panel defaultSize={68} minSize={25}>
                      <div className="flex flex-col h-full w-full bg-[#05070a]/60 overflow-hidden">
                        <PanelHeader dots label={language.toUpperCase()} badge="editor" />
                        <EditorBlock code={code} setCode={setCode} language={language} />
                      </div>
                    </Panel>

                    <ResizeHandle />

                    <Panel defaultSize={32} minSize={12}>
                      <div className="flex flex-col h-full w-full bg-[#05070a]/90 overflow-hidden">
                        <PanelHeader dots label={`[ ${terminalLabel} ]`} badge="console" statusColorClass={terminalColor} />
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0">
                          <TerminalConsole status={terminalStatus} output={terminalOutput} />
                        </div>
                      </div>
                    </Panel>
                  </PanelGroup>
                </Panel>
              </PanelGroup>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
