// src/pages/CodingInterviewPage.tsx
// Requires: npm install react-resizable-panels
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import {
  LiveKitRoom,
  useTracks,
  ParticipantTile,
  useLocalParticipant,
  useRoomContext,
  RoomAudioRenderer,
  useRemoteParticipants,
} from "@livekit/components-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import Editor from "@monaco-editor/react";
import { fetchLiveKitToken, executeUserCode, fetchCodingProblem } from "../services/api";
import { useProctoring } from "../hooks/useProctoring";

/* ── TYPES ──────────────────────────────────────────────────── */
type TerminalStatus = "idle" | "running" | "success" | "error";

interface Problem {
  title?: string;
  description?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  starter_code?: Record<string, string>;
}

/* ── MOBILE HOOK ────────────────────────────────────────────── */
function useIsMobile(): boolean {
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

/* ── MONACO OPTIONS ─────────────────────────────────────────── */
const monacoOptions = {
  minimap: { enabled: false },
  fontSize: 13,
  fontFamily: '"JetBrains Mono", monospace',
  fontLigatures: true,
  wordWrap: "on" as const,
  scrollBeyondLastLine: false,
  padding: { top: 16, bottom: 16 },
  lineNumbersMinChars: 3,
  renderLineHighlight: "gutter" as const,
  cursorBlinking: "smooth" as const,
  cursorSmoothCaretAnimation: "on" as const,
  smoothScrolling: true,
  scrollbar: {
    verticalScrollbarSize: 4,
    horizontalScrollbarSize: 4,
    alwaysConsumeMouseWheel: false,
  },
};

/* ── OUTER PAGE ─────────────────────────────────────────────── */
export default function CodingInterviewPage() {
  const { roomName } = useParams<{ roomName: string }>();
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [connection, setConnection] = useState<{
    url: string;
    token: string;
  } | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        const tokenData = await fetchLiveKitToken(roomName!, name, clerkToken);
        setConnection({ url: tokenData.url, token: tokenData.token });
        const problemData = await fetchCodingProblem(roomName!, clerkToken);
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
    /*
     * KEY FIX: position:fixed tears LiveKitRoom out of any collapsing
     * flex/grid parent and pins it to real viewport pixels.
     * Adjust `top` to match your navbar height (64px = h-16 in Tailwind).
     * If you have NO navbar on this page, set top:0.
     */
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
        roomName={roomName!}
        problem={problem}
        token={connection.token}
      />
    </LiveKitRoom>
  );
}

/* ── INNER WORKSPACE ────────────────────────────────────────── */
function CodingWorkspace({
  roomName,
  problem,
}: {
  roomName: string;
  problem: Problem;
  token: string;
}) {
  const navigate = useNavigate();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const isMobile = useIsMobile();
  const remoteParticipants = useRemoteParticipants();
  const aiAgent = remoteParticipants[0];
  const { getToken } = useAuth();

  const [code, setCode] = useState(problem.starter_code?.python || "");
  const [language, setLanguage] = useState("python");
  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus>("idle");
  const [terminalOutput, setTerminalOutput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false); // Define camera state for proctoring

  // 🛡️ Start Client-Side Video Proctoring
  useProctoring(isCameraOff);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(problem?.starter_code?.[lang] || "");
  };

  const runCode = async (isSubmit: boolean) => {
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
      // 1. Send intentional end signal to bypass the 5-minute timer
      const payload = JSON.stringify({ type: "INTENTIONAL_END" });
      await localParticipant.publishData(new TextEncoder().encode(payload), {
        reliable: true,
      });
      // 2. Wait 1000ms to guarantee packet delivery before WebRTC socket closes
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    await room.disconnect();
    navigate(`/summary/${roomName}`);
  };


  const difficultyClass =
    problem.difficulty === "Easy"
      ? "text-app-lime bg-app-lime/10 border-app-lime/20"
      : problem.difficulty === "Medium"
        ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
        : "text-app-coral bg-app-coral/10 border-app-coral/20";

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
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
          <div
            className={`flex-1 relative ${aiAgent ? "border-r border-white/10" : ""}`}
          >
            <SelfVideoTile />
          </div>
          {aiAgent && (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0b0e1a]/80 backdrop-blur-md">
              <span className="text-4xl sm:text-[3.5rem] drop-shadow-[0_0_15px_rgba(163,255,60,0.3)]">
                🤖
              </span>
              <p className="font-orbitron text-[9px] sm:text-[10px] tracking-widest uppercase text-app-lime mt-4">
                Viral (AI)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ── Top bar ── */
  const TopBar = (
    <div className="flex items-center justify-between flex-wrap gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-[#0b0e1a]/90 backdrop-blur-md border-b border-white/10 flex-shrink-0 min-h-[48px] box-border shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        <span className="font-orbitron font-bold text-xs sm:text-sm text-white tracking-widest uppercase whitespace-nowrap">
          🎙 HireGraph
        </span>
        <span className="inline-block w-px h-4 bg-white/20 rounded-full" />
        <span className="font-orbitron text-[9px] sm:text-[10px] font-bold text-white/50 bg-white/5 border border-white/10 rounded-md px-2 py-1 whitespace-nowrap uppercase tracking-widest">
          🧩 IDE Active
        </span>
        {problem.difficulty && (
          <span
            className={`font-orbitron text-[9px] sm:text-[10px] font-bold border rounded-md px-2 py-1 whitespace-nowrap uppercase tracking-widest ${difficultyClass}`}
          >
            {problem.difficulty}
          </span>
        )}
        <span
          className={`font-orbitron text-[9px] sm:text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 ${aiAgent ? "text-app-lime" : "text-amber-400"}`}
        >
          {aiAgent ? "✅ Link Established" : "⏳ Awaiting AI..."}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-md text-white font-mono text-xs sm:text-sm px-3 py-2 cursor-pointer outline-none hover:border-white/30 transition-colors"
        >
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="c">C / C++</option>
        </select>
        <TopBarButton onClick={() => runCode(false)} variant="secondary">
          ▶ Run Code
        </TopBarButton>
        <TopBarButton onClick={() => runCode(true)} variant="primary">
          ✦ Submit to AI
        </TopBarButton>
        <TopBarButton
          onClick={handleToggleMic}
          variant={isMuted ? "danger" : "secondary"}
        >
          {isMuted ? "🔇 Unmute" : "🎙 Mute"}
        </TopBarButton>
        <TopBarButton onClick={handleEndInterview} variant="danger">
          ⬛ End
        </TopBarButton>
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

        /*
         * ── LiveKit wrapper fix ──
         * LiveKitRoom renders an extra <div> between itself and your children.
         * These rules force that shell div to pass height down correctly
         * without touching LiveKit's internal audio/video elements.
         */
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

      {/*
       * coding-root fills the fixed LiveKitRoom container.
       * Desktop: rigid flex column, no scrolling — panels own their height.
       * Mobile:  scrollable column — each section stacks naturally.
       */}
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


        {TopBar}

        {/* ── MOBILE layout ── */}
        {isMobile && (
          <div className="flex flex-col w-full pb-8">
            {/* Video */}
            <div className="flex flex-col w-full bg-white/[0.02] backdrop-blur-md border-b border-white/10 overflow-hidden h-[220px]">
              <PanelHeader dots label="Camera Feeds" badge="video" />
              {VideoBlock}
            </div>

            {/* Problem */}
            <div className="flex flex-col w-full bg-white/[0.02] backdrop-blur-md border-b border-white/10 overflow-hidden">
              <PanelHeader
                dots
                label={problem.title || "Problem Statement"}
                badge="mission"
              />
              <div className="p-4 sm:p-6">
                <p className="font-dm text-sm text-white/70 leading-relaxed m-0">
                  {problem.description || "Retrieving directives…"}
                </p>
              </div>
            </div>

            {/* Editor */}
            <div className="flex flex-col w-full bg-[#05070a]/80 backdrop-blur-md border-b border-white/10 overflow-hidden h-[400px]">
              <PanelHeader dots label={language.toUpperCase()} badge="editor" />
              <div className="flex-1 min-h-0 overflow-hidden">
                <Editor
                  height="100%"
                  language={language}
                  theme="vs-dark"
                  value={code}
                  onChange={(val) => setCode(val || "")}
                  options={monacoOptions}
                />
              </div>
            </div>

            {/* Terminal */}
            <div className="flex flex-col w-full bg-[#05070a]/90 backdrop-blur-md overflow-hidden min-h-[200px]">
              <PanelHeader
                dots
                label={terminalLabel}
                badge="output"
                statusColorClass={terminalColor}
              />
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                <TerminalContent
                  status={terminalStatus}
                  output={terminalOutput}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── DESKTOP layout ── */}
        {!isMobile && (
          /*
           * This wrapper takes all space below the TopBar.
           * flex:"1 1 0" + minHeight:0 is the ONLY correct pattern here —
           * h-full would resolve to scroll height and break panel sizing.
           */
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
                    {/* Problem */}
                    <Panel defaultSize={52} minSize={20}>
                      <div className="flex flex-col h-full w-full bg-transparent overflow-hidden">
                        <PanelHeader
                          dots
                          label={problem.title || "Problem Statement"}
                          badge="mission"
                        />
                        <div className="flex-1 overflow-y-auto p-5 sm:p-6 min-h-0">
                          <p className="font-dm text-sm text-white/70 leading-relaxed m-0 whitespace-pre-wrap">
                            {problem.description || "Retrieving directives…"}
                          </p>
                        </div>
                      </div>
                    </Panel>

                    <ResizeHandle />

                    {/* Video */}
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
                    {/* Editor */}
                    <Panel defaultSize={68} minSize={25}>
                      <div className="flex flex-col h-full w-full bg-[#05070a]/60 overflow-hidden">
                        <PanelHeader
                          dots
                          label={language.toUpperCase()}
                          badge="editor"
                        />
                        <div className="flex-1 min-h-0 overflow-hidden pt-2">
                          <Editor
                            height="100%"
                            language={language}
                            theme="vs-dark"
                            value={code}
                            onChange={(val) => setCode(val || "")}
                            options={monacoOptions}
                          />
                        </div>
                      </div>
                    </Panel>

                    <ResizeHandle />

                    {/* Terminal */}
                    <Panel defaultSize={32} minSize={12}>
                      <div className="flex flex-col h-full w-full bg-[#05070a]/90 overflow-hidden">
                        <PanelHeader
                          dots
                          label={`[ ${terminalLabel} ]`}
                          badge="console"
                          statusColorClass={terminalColor}
                        />
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0">
                          <TerminalContent
                            status={terminalStatus}
                            output={terminalOutput}
                          />
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

/* ── RESIZE HANDLE ──────────────────────────────────────────── */
function ResizeHandle({ vertical = false }: { vertical?: boolean }) {
  const [active, setActive] = useState(false);
  return (
    <PanelResizeHandle
      onDragging={setActive}
      className={`
        flex-shrink-0 relative z-10 transition-all duration-200
        ${vertical ? "w-1.5 h-full cursor-col-resize" : "w-full h-1.5 cursor-row-resize"}
        ${active ? "bg-app-lime shadow-[0_0_10px_rgba(163,255,60,0.5)]" : "bg-white/5 hover:bg-app-lime/40"}
      `}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {vertical ? (
          <div className="w-0.5 h-6 flex flex-col gap-1">
            <div className="w-full h-0.5 bg-white/20 rounded-full" />
            <div className="w-full h-0.5 bg-white/20 rounded-full" />
            <div className="w-full h-0.5 bg-white/20 rounded-full" />
          </div>
        ) : (
          <div className="h-0.5 w-6 flex gap-1">
            <div className="h-full w-0.5 bg-white/20 rounded-full" />
            <div className="h-full w-0.5 bg-white/20 rounded-full" />
            <div className="h-full w-0.5 bg-white/20 rounded-full" />
          </div>
        )}
      </div>
    </PanelResizeHandle>
  );
}

/* ── SELF VIDEO TILE ────────────────────────────────────────── */
function SelfVideoTile() {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);
  const localTrack = tracks.find((t) => t.participant.isLocal);

  if (!localTrack) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/[0.02]">
        <span className="text-4xl opacity-20">📷</span>
        <p className="font-orbitron text-[10px] tracking-widest uppercase text-white/30 m-0">
          Camera Offline
        </p>
      </div>
    );
  }
  return (
    <ParticipantTile
      trackRef={localTrack}
      style={{
        height: "100%",
        width: "100%",
        borderRadius: 0,
        objectFit: "cover",
      }}
    />
  );
}

/* ── TERMINAL CONTENT ───────────────────────────────────────── */
function TerminalContent({
  status,
  output,
}: {
  status: TerminalStatus;
  output: string;
}) {
  if (status === "idle") {
    return (
      <div className="flex items-center gap-3 font-mono text-xs sm:text-sm">
        <span className="text-app-lime font-black drop-shadow-[0_0_8px_rgba(163,255,60,0.8)]">
          ❯
        </span>
        <span className="text-white/30">Awaiting compilation request...</span>
        <span className="inline-block w-2 h-4 bg-app-lime/50 animate-pulse" />
      </div>
    );
  }
  if (status === "running") {
    return (
      <div className="flex items-center gap-3 font-mono text-xs sm:text-sm">
        <span className="w-4 h-4 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin flex-shrink-0" />
        <span className="text-amber-400">
          Compiling and executing against test cases...
        </span>
      </div>
    );
  }
  return (
    <pre
      className={`m-0 font-mono text-xs sm:text-sm leading-loose whitespace-pre-wrap break-words ${status === "success" ? "text-app-lime" : "text-app-coral"}`}
    >
      {output}
    </pre>
  );
}

/* ── PANEL HEADER ───────────────────────────────────────────── */
function PanelHeader({
  dots,
  label,
  badge,
  statusColorClass,
}: {
  dots?: boolean;
  label: string;
  badge: string;
  statusColorClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.04] border-b border-white/10 flex-shrink-0">
      {dots && (
        <div className="flex items-center gap-1.5 opacity-80">
          <span className="w-2.5 h-2.5 rounded-full bg-app-coral" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-app-lime" />
        </div>
      )}
      <span
        className={`font-orbitron text-[10px] sm:text-xs font-bold uppercase tracking-widest flex-1 overflow-hidden text-ellipsis whitespace-nowrap ${statusColorClass || "text-white/60"}`}
      >
        {label}
      </span>
      <span className="font-orbitron text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-white/30 bg-white/5 border border-white/10 rounded-md px-2 py-1 whitespace-nowrap flex-shrink-0">
        {badge}
      </span>
    </div>
  );
}

/* ── TOP BAR BUTTON ─────────────────────────────────────────── */
function TopBarButton({
  onClick,
  variant,
  children,
}: {
  onClick: () => void;
  variant: "primary" | "secondary" | "danger";
  children: React.ReactNode;
}) {
  const base =
    "flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-md font-orbitron text-[9px] sm:text-[10px] font-bold tracking-widest uppercase transition-all duration-200 active:scale-[0.98] whitespace-nowrap border";
  const variants = {
    primary:
      "bg-app-lime border-app-lime text-[#0b0e1a] hover:bg-[#b8ff5c] shadow-[0_0_15px_rgba(163,255,60,0.2)]",
    secondary:
      "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20",
    danger:
      "bg-app-coral/10 border-app-coral/30 text-app-coral hover:bg-app-coral/20 shadow-[0_0_15px_rgba(255,79,106,0.15)]",
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
}
