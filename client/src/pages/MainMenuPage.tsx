// src/pages/MainMenuPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { setupCodingRoom } from "../services/api";

export default function MainMenuPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [isStartingCoding, setIsStartingCoding] = useState(false);

  const startHR = () => navigate(`/setup/hr`);

  const startCoding = async () => {
    try {
      setIsStartingCoding(true);
      const token = await getToken();
      
      if (!token) {
        alert("Please log in to start an interview.");
        return;
      }

      const response = await setupCodingRoom(token);
      navigate(`/lobby/${response.room_name}`);
      
    } catch (error) {
      console.error("Failed to start coding interview:", error);
      alert("Failed to start the interview. Please try again.");
    } finally {
      setIsStartingCoding(false);
    }
  };

  return (
    <div className="w-full flex-1 flex items-center justify-center bg-transparent px-4 py-8 sm:py-12 box-border">
      <div className="flex flex-col items-center gap-10 w-full max-w-3xl">
        
        {/* Track Title Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-app-lime/30 bg-app-lime/10">
            <span className="w-1.5 h-1.5 rounded-full bg-app-lime animate-pulse" />
            <span className="text-app-lime text-[10px] font-bold tracking-widest uppercase font-orbitron">
              Ready to Practice
            </span>
          </div>
          
          <h1 className="font-orbitron text-2xl sm:text-4xl font-black text-white tracking-wide uppercase leading-tight m-0">
            Choose your <span className="text-app-lime">Track.</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/40 font-light max-w-md m-0">
            Select the type of interview environment you want to simulate today.
          </p>
        </div>

        {/* Dynamic Grid Track Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          <TrackCard
            icon="👔"
            title="HR / Behavioral"
            description="Practice standard situational and core behavioral questions with a real-time AI agent over streaming video."
            tags={[
              { label: "Live Video", color: "green" },
              { label: "AI Powered", color: "neutral" },
            ]}
            onClick={startHR}
            isLoading={false}
          />
          <TrackCard
            icon="💻"
            title="Coding Challenge"
            description="Solve data structures and algorithmic puzzles inside an interactive IDE with automatic compilation and evaluation."
            tags={[
              { label: "DSA Problems", color: "blue" },
              { label: "AI Feedback", color: "neutral" },
            ]}
            onClick={startCoding}
            isLoading={isStartingCoding}
          />
        </div>
        <div className="w-full flex justify-center mt-2 mb-2">
          <button
            onClick={() => navigate('/history')}
            className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-app-lime/30 transition-all duration-300 active:scale-[0.98]"
          >
            <span className="text-xl grayscale group-hover:grayscale-0 transition-all duration-300">🗄️</span>
            <span className="font-orbitron text-[10px] font-bold tracking-widest uppercase text-white/50 group-hover:text-app-lime transition-colors">
              Access Simulation Logs
            </span>
          </button>
        </div>

        {/* Global Bottom Footnote */}
        <p className="text-[11px] text-white/35 text-center font-light tracking-wide m-0 max-w-md leading-normal">
          Both tracks launch state-aware conversational models and provide complete automated analytics, scoring, and breakdown dashboards upon termination.
        </p>
      </div>
    </div>
  );
}

/* ── Track Card Sub-Component ─────────────────────────────────────────────── */
interface Tag {
  label: string;
  color: "green" | "blue" | "neutral";
}

interface TrackCardProps {
  icon: string;
  title: string;
  description: string;
  tags: Tag[];
  onClick: () => void;
  isLoading?: boolean;
}

// Map design tokens perfectly to Tailwind configurations
const tagStyles: Record<Tag["color"], string> = {
  green: "text-app-lime bg-app-lime/10 border-app-lime/20",
  blue: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  neutral: "text-white/50 bg-white/5 border-white/10",
};

function TrackCard({ icon, title, description, tags, onClick, isLoading }: TrackCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        relative group flex flex-col items-start gap-4 p-6 sm:p-8 rounded-2xl border text-left w-full h-full
        bg-white/[0.02] border-white/10 outline-none select-none transition-all duration-300
        disabled:opacity-40 disabled:cursor-wait
        ${hovered && !isLoading ? "border-app-lime/40 bg-white/[0.05] -translate-y-1 shadow-[0_12px_30px_rgba(0,0,0,0.5)]" : "shadow-[0_4px_16px_rgba(0,0,0,0.2)]"}
        active:scale-[0.98]
      `}
    >
      {/* Corner Graphic Accent */}
      <div className={`absolute top-0 right-6 h-[2px] w-8 bg-app-lime transition-all duration-300 ${hovered && !isLoading ? "opacity-100 w-16" : "opacity-0"}`} />

      {/* Track Status Context Icon */}
      <div className="text-3xl leading-none h-10 flex items-center justify-center">
        {isLoading ? <span className="inline-block animate-spin font-mono text-xl text-app-lime">⚡</span> : icon}
      </div>

      {/* Main Metadata Text Block */}
      <div className="flex flex-col gap-2 flex-1 w-full">
        <h3 className="font-orbitron text-lg font-black text-white tracking-wide uppercase m-0">
          {title}
        </h3>
        <p className="text-xs text-white/50 font-light leading-relaxed m-0">
          {description}
        </p>
      </div>

      {/* Badges Layout Container */}
      <div className="flex flex-wrap gap-2 pt-2">
        {tags.map((tag) => (
          <span
            key={tag.label}
            className={`text-[9px] font-bold px-2.5 py-0.5 rounded-md tracking-wider uppercase font-orbitron border ${tagStyles[tag.color]}`}
          >
            {tag.label}
          </span>
        ))}
      </div>

      {/* Micro Action Trigger Button */}
      <div
        className={`self-end font-orbitron text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 transition-colors mt-4 duration-200 ${
          hovered && !isLoading ? "text-app-lime" : "text-white/30"
        }`}
      >
        {isLoading ? "Provisioning Engine" : "Initialize Room →"}
      </div>
    </button>
  );
}