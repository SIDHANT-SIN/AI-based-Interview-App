import React from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";

interface LiveRoomProps {
  url: string;
  token: string;
}

export default function LiveRoom({ url, token }: LiveRoomProps) {
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
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    </div>
  );
}
