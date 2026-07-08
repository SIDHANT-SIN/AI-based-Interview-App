// src/pages/HistoryPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { fetchHistory } from "../services/api";

interface HistoryItem {
  room_name: string;
  interview_type: "hr" | "coding";
  status: string;
  created_at: number;
  summary_status: string;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError("Authentication required.");
          setIsLoading(false);
          return;
        }

        const data = await fetchHistory(token);
        setHistory(data.history || []);
      } catch (err) {
        console.error("Failed to load history:", err);
        setError("Could not load your interview history.");
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [getToken]);

  if (isLoading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center bg-transparent">
        <div className="w-12 h-12 rounded-full border-[3px] border-app-lime/20 border-t-app-lime animate-spin shadow-[0_0_20px_rgba(163,255,60,0.2)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 w-full flex items-center justify-center bg-transparent px-4">
        <div className="text-center bg-app-coral/5 border border-app-coral/20 rounded-2xl p-8 backdrop-blur-md">
          <span className="text-3xl">⚠️</span>
          <p className="font-dm text-sm text-app-coral mt-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full overflow-y-auto bg-transparent px-4 sm:px-8 py-8 sm:py-12 box-border">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="font-orbitron text-2xl sm:text-3xl font-black text-white uppercase tracking-wide m-0">
              Interview <span className="text-app-lime">Logs</span>
            </h1>
            <p className="font-dm text-sm text-white/50 m-0 mt-2">
              Review your past simulations, track scores, and access detailed AI diagnostics.
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-5 py-2.5 rounded-lg bg-app-lime/10 hover:bg-app-lime/20 border border-app-lime/30 text-app-lime font-orbitron text-[10px] font-bold uppercase tracking-widest transition-colors active:scale-[0.98] whitespace-nowrap"
          >
            + New Simulation
          </button>
        </div>

        {/* History Grid */}
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
            <span className="text-4xl opacity-30 mb-4">🗄️</span>
            <h3 className="font-orbitron text-sm font-bold uppercase tracking-widest text-white/50 m-0">No Logs Found</h3>
            <p className="font-dm text-sm text-white/30 m-0 mt-2">You haven't completed any interviews yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {history.map((room) => {
              const isCompleted = room.summary_status === "completed";
              const isProcessing = room.summary_status === "processing";

              return (
                <button
                  key={room.room_name}
                  onClick={() => navigate(`/summary/${room.room_name}`)}
                  className="relative flex flex-col text-left w-full bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 hover:border-app-lime/40 rounded-xl p-6 transition-all duration-300 active:scale-[0.98] group overflow-hidden"
                >
                  {/* Decorative corner accent */}
                  <div className="absolute top-0 right-4 w-8 h-[2px] bg-app-lime/0 group-hover:bg-app-lime/100 transition-all duration-300" />

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{room.interview_type === "coding" ? "💻" : "👔"}</span>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-orbitron text-[10px] font-bold uppercase tracking-widest text-white/60">
                          {room.interview_type === "coding" ? "Technical Track" : "Behavioral Track"}
                        </span>
                        <span className="font-dm text-[11px] text-white/40">
                          {new Date(room.created_at * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`font-orbitron text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${isCompleted ? "bg-app-lime/10 border-app-lime/20 text-app-lime" :
                      isProcessing ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                        "bg-white/5 border-white/10 text-white/40"
                      }`}>
                      {isProcessing ? "Analyzing..." : room.summary_status}
                    </div>
                  </div>

                  <h3 className="font-dm text-base font-medium text-white m-0 mb-6 truncate w-full">
                    {room.interview_type === "coding" ? "Technical Assessment" : "Behavioral Assessment"}
                  </h3>

                  <div className="mt-auto flex items-end justify-between border-t border-white/10 pt-4">
                    <div className="flex flex-col">
                      <span className="font-orbitron text-[9px] uppercase tracking-widest text-white/30 mb-1">
                        Report Status
                      </span>
                      <span className={`font-orbitron text-base font-black ${isCompleted ? "text-app-lime" : "text-white/50"}`}>
                        {isCompleted ? "Ready" : "Pending"}
                      </span>
                    </div>
                    <span className="font-orbitron text-[9px] uppercase tracking-widest text-white/20 group-hover:text-app-lime transition-colors">
                      View Report →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}