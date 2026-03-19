import React from "react";
import { useNavigate } from "react-router-dom"; // 🛠️ 1. Import Router navigation
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";

interface LiveRoomProps {
  url: string;
  token: string;
  roomName: string; // 🛠️ 2. Add roomName so we know where to navigate!
}

export default function LiveRoom({ url, token, roomName }: LiveRoomProps) {
  const navigate = useNavigate(); // 🛠️ Initialize navigate hook

  return (
    <div className="interview-room" style={{ height: "80vh", width: "100%" }}>
      {/* Info bar */}
      <div
        className="interview-bar"
        style={{
          display: "flex",
          gap: "1rem",
          padding: "1rem",
          background: "#f5f5f5",
        }}
      >
        <div className="bar-item">
          Role <strong>Software Engineer</strong>
        </div>
        <div
          className="recording-badge"
          style={{ color: "red", fontWeight: "bold" }}
        >
          REC
        </div>
      </div>

      {/* LiveKit video */}
      <div className="livekit-wrapper" style={{ height: "calc(100% - 60px)" }}>
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={url}
          data-lk-theme="default"
          style={{ height: "100%", width: "100%" }}
          // 🛠️ 3. THE MAGIC LINE: Triggers instantly when they click Leave OR the timer ends!
          onDisconnected={() => navigate(`/summary/${roomName}`)}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    </div>
  );
}