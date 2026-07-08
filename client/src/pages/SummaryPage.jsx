// src/pages/SummaryPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { fetchSummary } from "../services/api";

import TranscriptViewer from "../components/Summary/TranscriptViewer";
import MetricCard from "../components/Summary/MetricCard";
import DiagnosticCard from "../components/Summary/DiagnosticCard";

export default function SummaryPage() {
  const { roomName } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading");
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    let timer = null;
    let isMounted = true;

    const fetchSummaryData = async () => {
      if (!isMounted) return;
      
      try {
        const clerkToken = await getToken();
        if (!clerkToken) {
          if (isMounted) {
            setError("Authentication required. Please log in again.");
            setStatus("error");
          }
          return;
        }

        const data = await fetchSummary(roomName, clerkToken);
        if (!isMounted) return;

        setSummary(data);

        if (data.status === "processing") {
          setStatus("processing");
          setPollingCount((prev) => prev + 1);

          // Poll every 3 seconds if still processing, up to 40 times
          if (pollingCount < 40) {
            timer = setTimeout(() => {
              fetchSummaryData();
            }, 3000);
          } else {
            setError("Summary generation is taking longer than expected. Please try again later.");
            setStatus("error");
          }
        } else if (data.status === "completed") {
          setStatus("completed");
          setError(null);
        } else {
          setError("Unknown status received from server.");
          setStatus("error");
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch summary:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch summary. Please try again.");
        setStatus("error");
      }
    };

    if (status === "loading" || status === "processing") {
      fetchSummaryData();
    }

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [roomName, getToken]);

  // ─── LOADING STATE ───────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex-1 w-full flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-5 text-center w-[90%] max-w-[400px] bg-white/[0.02] border border-white/10 rounded-2xl p-8 sm:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
          <div className="w-12 h-12 rounded-full border-[3px] border-app-lime/20 border-t-app-lime animate-spin shadow-[0_0_20px_rgba(163,255,60,0.2)]" />
          <div className="flex flex-col gap-1.5">
            <h2 className="font-orbitron text-lg font-black tracking-widest uppercase text-white m-0">
              Generating Summary
            </h2>
            <p className="font-dm text-xs text-white/40 m-0">
              AI is analyzing your interview transcript and code execution...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── PROCESSING STATE ────────────────────────────────────
  if (status === "processing") {
    return (
      <div className="flex-1 w-full flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-6 text-center w-[90%] max-w-[420px] bg-white/[0.02] border border-white/10 rounded-2xl p-8 sm:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
          <div className="w-12 h-12 rounded-full border-[3px] border-amber-400/20 border-t-amber-400 animate-spin shadow-[0_0_20px_rgba(251,191,36,0.2)]" />
          <div className="flex flex-col gap-2">
            <h2 className="font-orbitron text-lg font-black tracking-widest uppercase text-white m-0">
              Almost There!
            </h2>
            <p className="font-dm text-xs text-white/50 leading-relaxed m-0">
              The evaluator agent is compiling your final analytics. This
              usually takes a minute or two.
            </p>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-amber-400 animate-[bounce_2s_infinite]" />
          </div>
          <p className="font-orbitron text-[9px] uppercase tracking-widest text-white/30">
            Polling attempt: {pollingCount}/40
          </p>
        </div>
      </div>
    );
  }

  // ─── ERROR STATE ─────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="flex-1 w-full flex items-center justify-center bg-transparent px-4">
        <div className="flex flex-col items-center gap-6 text-center w-full max-w-[450px]">
          <div className="w-20 h-20 rounded-2xl bg-app-coral/10 border border-app-coral/30 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(255,79,106,0.2)]">
            ⚠️
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-orbitron text-xl font-black uppercase tracking-wide text-white m-0">
              Data Retrieval Failed
            </h2>
            <p className="font-dm text-sm text-white/50 m-0">
              {error || "Failed to load your interview summary."}
            </p>
          </div>
          <div className="flex gap-4 flex-wrap justify-center w-full mt-2">
            <button
              onClick={() => {
                setStatus("loading");
                setError(null);
              }}
              className="px-6 py-3 rounded-lg bg-app-coral/10 border border-app-coral/30 text-app-coral font-orbitron text-[10px] font-bold tracking-widest uppercase hover:bg-app-coral/20 transition-all active:scale-[0.98]"
            >
              Retry Connection
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-orbitron text-[10px] font-bold tracking-widest uppercase transition-colors active:scale-[0.98]"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── COMPLETED STATE ────────────────────────────────────
  if (status === "completed" && summary?.report) {
    const report = summary.report;

    const themeLime = {
      bg: "bg-app-lime/[0.05]",
      border: "border-app-lime/20",
      text: "text-app-lime"
    };

    const themeAmber = {
      bg: "bg-amber-400/[0.05]",
      border: "border-amber-400/20",
      text: "text-amber-400"
    };
    
    const themeCyan = {
      bg: "bg-cyan-400/[0.05]",
      border: "border-cyan-400/20",
      text: "text-cyan-400"
    };

    const themeFuchsia = {
      bg: "bg-fuchsia-400/[0.05]",
      border: "border-fuchsia-400/20",
      text: "text-fuchsia-400"
    };

    return (
      <div className="flex-1 w-full bg-transparent overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-50 w-full bg-[#0b0e1a]/85 backdrop-blur-md border-b border-white/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-orbitron text-xl sm:text-2xl font-black text-white uppercase tracking-wide m-0">
                Interview <span className="text-app-lime">Analytics</span>
              </h1>
              <p className="font-mono text-[10px] text-white/40 m-0 mt-1.5 uppercase tracking-widest">
                Session ID: {roomName}
              </p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-orbitron text-[10px] font-bold uppercase tracking-widest transition-colors active:scale-[0.98]"
            >
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 flex flex-col gap-6 sm:gap-8">
          {/* Executive Summary Card */}
          <div className="relative overflow-hidden rounded-2xl border border-app-lime/30 bg-app-lime/10 p-6 sm:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] backdrop-blur-sm">
            <div className="flex flex-col gap-4 relative z-10">
              <p className="font-orbitron text-[10px] font-bold uppercase tracking-widest text-app-lime m-0">
                Performance Overview
              </p>
              <h2 className="font-dm text-xl sm:text-2xl font-medium text-white leading-relaxed m-0">
                {report.feedback || "Evaluation complete. Review the insights below."}
              </h2>
            </div>
            {/* Background glowing accent */}
            <div className="absolute right-[-10%] top-[-50%] w-1/2 h-[200%] bg-gradient-to-l from-white/[0.03] to-transparent transform rotate-12 pointer-events-none" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <MetricCard 
              title="Strengths Detected"
              icon="✅"
              items={report.strengths}
              themeClass={themeLime}
            />
            
            <MetricCard 
              title="Optimization Targets"
              icon="📈"
              items={report.areas_for_improvement}
              themeClass={themeAmber}
            />
          </div>

          {/* Code Review Section */}
          {report.code_review && (
            <div className="flex flex-col gap-6 sm:gap-8 mt-2">
              <h3 className="font-orbitron text-lg sm:text-xl font-bold uppercase tracking-widest text-white m-0 flex items-center gap-2">
                <span className="text-2xl">💻</span> Code Diagnostics
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                <DiagnosticCard 
                  title="Efficiency"
                  icon="⚡"
                  description={report.code_review.efficiency}
                  themeClass={themeCyan}
                />
                <DiagnosticCard 
                  title="Cleanliness"
                  icon="✨"
                  description={report.code_review.cleanliness}
                  themeClass={themeFuchsia}
                />
                <DiagnosticCard 
                  title="Execution"
                  icon="⚙️"
                  description={report.code_review.execution_analysis}
                  themeClass={themeAmber}
                />
              </div>
            </div>
          )}
          {summary.transcript ? (
            <TranscriptViewer rawTranscript={summary.transcript} />
          ) : (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm mt-2">
              <h3 className="font-orbitron text-sm sm:text-base font-bold uppercase tracking-widest text-white m-0 mb-6 flex items-center gap-2">
                <span className="text-xl">🎙️</span> Mission Transcript
              </h3>
              <p className="font-dm text-sm text-white/50 text-center py-8 m-0">
                No transcript is available for this simulation.
              </p>
            </div>
          )}
          {/* Next Steps CTA */}
          <div className="relative overflow-hidden bg-app-lime/[0.02] border border-app-lime/30 rounded-2xl p-8 sm:p-12 text-center mt-4">
            <h3 className="font-orbitron text-xl sm:text-2xl font-black uppercase tracking-wide text-white m-0 mb-3">
              Deploy <span className="text-app-lime">Next Mission</span>
            </h3>
            <p className="font-dm text-sm sm:text-base text-white/50 max-w-xl mx-auto m-0 mb-8">
              Review your diagnostics, calibrate your strategy, and initiate a
              new simulation to track parameter growth over time.
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-8 py-4 rounded-xl bg-app-lime hover:bg-[#b8ff5c] text-[#0b0e1a] font-orbitron text-xs sm:text-sm font-black tracking-widest uppercase transition-all duration-200 active:scale-[0.98] shadow-[0_0_20px_rgba(163,255,60,0.2)]"
            >
              Initialize New Room
            </button>
            {/* Subtle glow behind button */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-app-lime/20 blur-[60px] pointer-events-none" />
          </div>
        </main>
      </div>
    );
  }

  // Fallback for unknown state
  return (
    <div className="flex-1 w-full flex items-center justify-center bg-transparent">
      <div className="text-center bg-white/[0.02] border border-white/10 rounded-2xl p-10 backdrop-blur-md">
        <div className="text-[3rem] mb-4">❓</div>
        <h2 className="font-orbitron text-lg font-black uppercase tracking-widest text-white m-0">
          Unknown Entity
        </h2>
        <p className="font-dm text-xs text-white/40 mt-2 m-0">
          The evaluation agent returned an unrecognized payload.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-8 px-6 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-orbitron text-[10px] font-bold tracking-widest uppercase transition-colors active:scale-[0.98]"
        >
          Return Home
        </button>
      </div>
    </div>
  );
}
