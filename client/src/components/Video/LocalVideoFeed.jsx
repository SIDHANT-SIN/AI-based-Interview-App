import { useTracks, ParticipantTile } from "@livekit/components-react";
import { Track } from "livekit-client";

export default function LocalVideoFeed({ isCameraOff }) {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);
  const localTrack = tracks.find((t) => t.participant.isLocal);

  if (isCameraOff || !localTrack) {
    return (
      <div className="flex-1 h-full w-full flex flex-col items-center justify-center gap-3 bg-white/[0.02] absolute inset-0">
        <span className="text-4xl opacity-20">📷</span>
        <p className="font-orbitron text-[10px] tracking-widest uppercase text-white/30 m-0">
          Camera Offline
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full w-full relative">
      <ParticipantTile
        trackRef={localTrack}
        style={{
          height: "100%",
          width: "100%",
          borderRadius: "0",
          objectFit: "cover",
        }}
      />
    </div>
  );
}
