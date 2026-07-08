import { useEffect, useRef, useState } from "react";
import { FaceDetector } from "@mediapipe/tasks-vision";
import { getProctoringModel } from "../services/proctoringService";
import { useRoomContext, useLocalParticipant, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

export function useProctoring(isCameraOff: boolean) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const [detector, setDetector] = useState<FaceDetector | null>(null);
  
  // Track consecutive violations to avoid spam
  const violationCountRef = useRef(0);
  const lastAlertTimeRef = useRef(0);
  
  // Hidden video element to process the MediaStream
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 1. Initialize the MediaPipe Face Detector
  useEffect(() => {
    let isMounted = true;
    const initModel = async () => {
      try {
        const faceDetector = await getProctoringModel();
        if (isMounted) setDetector(faceDetector);
      } catch (err) {
        console.error("Proctoring hook failed to get model:", err);
      }
    };
    initModel();
    
    // Create a hidden video element and append it to DOM so browser decodes it
    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.position = "absolute";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    video.style.width = "10px";
    video.style.height = "10px";
    document.body.appendChild(video);
    
    videoRef.current = video;

    return () => {
      isMounted = false;
      if (video.parentNode) {
        document.body.removeChild(video);
      }
      videoRef.current = null;
    };
  }, []);

  // 2. Attach the LiveKit camera track to our hidden video element
  useEffect(() => {
    if (isCameraOff || !videoRef.current) return;

    // Find the local camera track from the reactive hook
    const localTrackRef = tracks.find((t) => t.participant.isLocal);
    const cameraTrack = localTrackRef?.publication?.track;
    
    if (cameraTrack) {
      // Production Standard: Use LiveKit's native attach() method
      cameraTrack.attach(videoRef.current);
    } else {
      // If the track drops, LiveKit handles detachment automatically,
      // but we can ensure the srcObject is clear just in case.
      videoRef.current.srcObject = null;
    }

    return () => {
      // Cleanup the attachment when the effect re-runs or unmounts
      if (cameraTrack && videoRef.current) {
        cameraTrack.detach(videoRef.current);
      }
    };
  }, [tracks, isCameraOff]);

  // 3. The Detection Loop
  useEffect(() => {
    if (!detector || isCameraOff || !videoRef.current || !room) return;

    let animationFrameId: number;
    let lastVideoTime = -1;

    const processFrame = async () => {
      const video = videoRef.current;
      
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Only process if it's a new frame
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          
          try {
            const detections = detector.detectForVideo(video, performance.now());
            const faceCount = detections.detections.length;
            
            if (faceCount !== 1) {
              violationCountRef.current += 1;
            } else {
              // Reset if they are back to normal
              violationCountRef.current = 0;
            }

            // 60 frames = approx 2 seconds at 30fps
            if (violationCountRef.current > 60) { 
              const now = Date.now();
              // Prevent spam: only alert once every 15 seconds
              if (now - lastAlertTimeRef.current > 15000) {
                lastAlertTimeRef.current = now;
                
                const msg = faceCount === 0 ? "Candidate missing from camera" : "Multiple faces detected in frame";
                
                // Broadcast to Python backend
                const payload = JSON.stringify({ type: "PROCTOR_ALERT", message: msg });
                const encoder = new TextEncoder();
                room.localParticipant.publishData(encoder.encode(payload), { reliable: true });
                
                console.warn(`[PROCTORING ALERT] ${msg}`);
              }
            }
          } catch (e) {
            // Ignore errors (e.g. if video isn't ready)
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(processFrame);
    };

    processFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [detector, isCameraOff, room]);
}
