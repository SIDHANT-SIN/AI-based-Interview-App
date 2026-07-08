// src/pages/HRInterviewPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import {
  LiveKitRoom,
  useLocalParticipant,
  useRoomContext,
  RoomAudioRenderer,
  useRemoteParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { fetchLiveKitToken } from "../services/api";
import { useProctoring } from "../hooks/useProctoring";

import ControlButton from "../components/UI/ControlButton";
import LocalVideoFeed from "../components/Video/LocalVideoFeed";
import AIVideoFeed from "../components/Video/AIVideoFeed";

/* ── OUTER PAGE ─────────────────────────────────────────────── */
export default function HRInterviewPage() {
  const { roomName } = useParams();
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [connection, setConnection] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const connectToRoom = async () => {
      try {
        const clerkToken = await getToken();
        if (!clerkToken) {
          setError("You must be logged in to join an interview.");
          return;
        }

        const name = user?.firstName || "Candidate";

        const data = await fetchLiveKitToken(roomName, name, clerkToken);
        setConnection(data);
      } catch (err) {
        console.error("Failed to connect:", err);
        setError("Unauthorized, or this interview room has expired.");
      }
    };

    connectToRoom();
  }, [roomName, user, getToken]);

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

  if (!connection) {
    return (
      <div className="flex-1 w-full flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-5 text-center w-[90%] max-w-[400px] bg-white/[0.02] border border-white/10 rounded-2xl p-8 sm:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
          <div className="w-12 h-12 rounded-full border-[3px] border-app-lime/20 border-t-app-lime animate-spin shadow-[0_0_20px_rgba(163,255,60,0.2)]" />
          <div className="flex flex-col gap-1.5">
            <h2 className="font-orbitron text-lg font-black tracking-widest uppercase text-white m-0">
              Initializing Room
            </h2>
            <p className="font-dm text-xs text-white/40 m-0">
              Provisioning secure WebRTC connection…
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
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      onDisconnected={() => navigate(`/summary/${roomName}`)}
    >
      <HRInterviewRoom roomName={roomName} />
    </LiveKitRoom>
  );
}

/* ── INNER ROOM ─────────────────────────────────────────────── */
function HRInterviewRoom({ roomName }) {
  const navigate = useNavigate();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const aiAgent = remoteParticipants[0];

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // 🛡️ Start Client-Side Video Proctoring
  useProctoring(isCameraOff);

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


  const handleToggleMic = () => {
    localParticipant.setMicrophoneEnabled(isMuted);
    setIsMuted(!isMuted);
  };

  const handleToggleCamera = () => {
    localParticipant.setCameraEnabled(isCameraOff);
    setIsCameraOff(!isCameraOff);
  };

  return (
    <div className="relative flex-1 w-full flex flex-col items-center bg-transparent overflow-hidden box-border">
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


      {/* ── Top HUD Info Bar ── */}
      <div className="relative w-full flex items-center justify-between px-4 sm:px-8 py-3 bg-[#0b0e1a]/80 backdrop-blur-md border-b border-white/10 shrink-0 z-10">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="font-orbitron font-bold text-xs sm:text-sm text-white tracking-widest uppercase">
            🎙 HireGraph
          </span>
          <span className="w-px h-4 bg-white/20" />
          <span className="font-orbitron text-[9px] sm:text-[10px] tracking-widest uppercase text-white/50">
            Type: <strong className="text-white">HR Round</strong>
          </span>
          <span className="w-px h-4 bg-white/20" />
          <span className="font-orbitron text-[9px] sm:text-[10px] tracking-widest uppercase text-white/50 flex items-center gap-1.5">
            Agent Status:
            <strong className={aiAgent ? "text-app-lime" : "text-amber-400"}>
              {aiAgent ? "Connected & Listening" : "Waiting for AI..."}
            </strong>
          </span>
        </div>

        {/* REC badge */}
        <div className="flex items-center gap-1.5 font-orbitron text-[9px] font-bold tracking-widest uppercase text-app-coral bg-app-coral/10 border border-app-coral/30 rounded-md px-2.5 py-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-app-coral animate-pulse" />
          REC
        </div>
      </div>

      {/* ── Center Video Area ── */}
      <div className="relative flex-1 w-full flex items-center justify-center p-4 sm:p-8 min-h-0 z-0">
        <div className="relative w-full aspect-video max-w-[min(calc((100vh-180px)*16/9),100%)] rounded-2xl overflow-hidden bg-white/[0.02] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm">
          <div className="absolute inset-0 flex items-stretch justify-center">
            <LocalVideoFeed isCameraOff={isCameraOff} />
            <AIVideoFeed aiAgent={aiAgent} isCodingPage={false} />
          </div>

          {/* Room ID Overlay */}
          <div className="absolute bottom-4 left-4 z-10">
            <span className="font-mono text-[10px] text-white/40 bg-[#0b0e1a]/60 backdrop-blur-md rounded-md px-3 py-1 border border-white/10">
              ID: {roomName}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Control Bar ── */}
      <div className="relative w-full flex items-center justify-center flex-wrap gap-3 sm:gap-4 px-4 sm:px-8 py-4 bg-[#0b0e1a]/80 backdrop-blur-md border-t border-white/10 shrink-0 z-10">
        <ControlButton
          onClick={handleToggleMic}
          active={!isMuted}
          activeIcon="🎙"
          inactiveIcon="🔇"
          activeLabel="Mic On"
          inactiveLabel="Muted"
          danger={isMuted}
        />
        <ControlButton
          onClick={handleToggleCamera}
          active={!isCameraOff}
          activeIcon="📷"
          inactiveIcon="📷"
          activeLabel="Cam On"
          inactiveLabel="Cam Off"
          danger={isCameraOff}
        />
        <button
          onClick={handleEndInterview}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-app-coral/10 hover:bg-app-coral/20 border border-app-coral/30 text-app-coral font-orbitron text-[10px] font-bold tracking-widest uppercase transition-all duration-200 active:scale-[0.98] shadow-[0_0_15px_rgba(255,79,106,0.1)] ml-auto sm:ml-0"
        >
          <span>⬛</span>
          <span>End Interview</span>
        </button>
      </div>
    </div>
  );
}
