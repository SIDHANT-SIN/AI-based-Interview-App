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
    <div className="interview-room">
      {/* Info bar */}
      <div className="interview-bar">
        <div className="bar-item">
          Role <strong>Software Engineer</strong>
        </div>
        <div className="bar-sep" />
        <div className="bar-item">
          Type <strong>HR Round</strong>
        </div>
        <div className="bar-sep" />
        <div className="bar-item">
          Status <strong>In Progress</strong>
        </div>
        <div className="recording-badge">REC</div>
      </div>

      {/* LiveKit — wrapper has explicit height so control bar never gets clipped */}
      <div className="livekit-wrapper">
        <div className="livekit-outer">
          <div className="livekit-inner">
            <LiveKitRoom
              video={true}
              audio={true}
              token={token}
              serverUrl={url}
              data-lk-theme="default"
              style={{ height: "100%", width: "100%" }}
              onDisconnected={() => navigate(`/summary/${roomName}`)}
            >
              <VideoConference />
            </LiveKitRoom>
          </div>
        </div>
      </div>
    </div>
  );
}
