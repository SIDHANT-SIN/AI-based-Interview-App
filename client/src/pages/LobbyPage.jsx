import React, { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PreJoin } from "@livekit/components-react";
import "@livekit/components-styles";
import { preloadProctoringModel } from "../services/proctoringService";

export default function LobbyPage() {
    const { roomName } = useParams();
    const navigate = useNavigate();

    const handlePreJoinSubmit = useCallback(
        (values) => {
            // The user clicked "Join". We don't connect to LiveKit here.
            // We route them to the actual interview page based on the room prefix!
            if (roomName?.startsWith("hr-room")) {
                navigate(`/interview/hr/${roomName}`);
            } else if (roomName?.startsWith("coding-room")) {
                navigate(`/interview/coding/${roomName}`);
            }
        },
        [navigate, roomName]
    );

    // Silently preload the heavy Machine Learning model in the background
    // while the user is testing their hardware in the lobby!
    useEffect(() => {
        preloadProctoringModel().catch(console.error);
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
            <div className="max-w-xl w-full bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800 shadow-2xl backdrop-blur-sm">
                <h1 className="text-3xl font-bold text-white mb-2 text-center">
                    Hardware Check
                </h1>
                <p className="text-zinc-400 mb-8 text-center text-sm">
                    Please check your camera and microphone before joining. The AI interviewer will join the room as soon as you connect.
                </p>

                {/* LiveKit's PreJoin handles the video preview and mic selection UI automatically */}
                <div className="livekit-prejoin-container theme-dark">
                    <PreJoin
                        onSubmit={handlePreJoinSubmit}
                    />



                </div>
            </div>
        </div>
    );
}
