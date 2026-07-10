// src/pages/ResumeUploadPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { setupHrRoom } from "../services/api";

export default function ResumeUploadPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const handleStartInterview = async () => {
    if (!file) {
      setError("Please select a resume first.");
      return;
    }
    setIsUploading(true);
    setError(null);
    
    try {
      const token = await getToken();
      if (!token) {
        setError("You must be logged in to start an interview.");
        return;
      }

      const response = await setupHrRoom(file, token);
      navigate(`/lobby/${response.room_name}`);
      
    } catch (err) {
      console.error(err);
      setError("Failed to process resume or connect to server.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex items-center justify-center bg-transparent px-4 py-8 sm:py-12 box-border">
      
      {/* Main Card */}
      <div className="relative z-10 w-full max-w-130 bg-white/2 border border-white/10 rounded-2xl p-6 sm:p-10 flex flex-col gap-6 shadow-[0_8px_30px_rgba(0,0,0,0.3)] backdrop-blur-sm">
        
        {/* Step badge */}
        <span className="self-start font-orbitron text-[9px] font-bold uppercase tracking-widest text-app-lime bg-app-lime/10 border border-app-lime/30 rounded-md px-3 py-1">
          Step 1 of 1
        </span>

        {/* Heading */}
        <div className="flex flex-col gap-1">
          <h2 className="font-orbitron text-2xl sm:text-3xl font-black text-white tracking-wide uppercase m-0">
            Set up your <span className="text-app-lime">Interview.</span>
          </h2>
          <p className="text-xs sm:text-sm text-white/40 font-light leading-relaxed m-0">
            Upload your resume so the AI can parse your background and tailor the evaluation to your specific experience.
          </p>
        </div>

        <div className="h-px w-full bg-white/10" />

        {/* Upload area */}
        <div
          onClick={() => document.getElementById("resume-upload")?.click()}
          className={`
            relative rounded-xl border border-dashed cursor-pointer transition-all duration-300
            flex flex-col items-center justify-center p-8 min-h-35 group
            ${file 
              ? "border-app-lime/50 bg-app-lime/5" 
              : "border-white/20 bg-white/2 hover:border-app-lime/40 hover:bg-white/4"
            }
          `}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            id="resume-upload"
            className="hidden"
          />

          {file ? (
            <div className="flex items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-lg bg-app-lime/10 border border-app-lime/20 flex items-center justify-center shrink-0 text-2xl">
                📄
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <span className="font-dm text-sm font-semibold text-white truncate">
                  {file.name}
                </span>
                <span className="font-orbitron text-[10px] tracking-wider text-app-lime uppercase">
                  {(file.size / 1024).toFixed(0)} KB · PDF
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-app-lime text-app-bg flex items-center justify-center font-bold text-sm shrink-0 shadow-[0_0_15px_rgba(163,255,60,0.4)]">
                ✓
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-lg bg-white/4 border border-white/10 flex items-center justify-center text-2xl mb-2 transition-transform duration-300 group-hover:-translate-y-1 group-hover:border-app-lime/30">
                📁
              </div>
              <p className="font-dm text-sm font-medium text-white m-0">
                Click to upload your resume
              </p>
              <span className="font-orbitron text-[9px] font-bold uppercase tracking-widest text-white/40 bg-white/5 border border-white/10 rounded-md px-2.5 py-1 mt-1">
                PDF format only
              </span>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-app-coral/10 border border-app-coral/30 text-app-coral text-xs font-mono">
            <span className="text-lg">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Info pills */}
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          {[
            { icon: "🎯", label: "Tailored Context" },
            { icon: "⚡", label: "Real-time Processing" },
            { icon: "🔒", label: "Ephemeral Storage" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/3 border border-white/10"
            >
              <span className="text-sm">{icon}</span>
              <span className="font-orbitron text-[9px] uppercase tracking-widest text-white/50 whitespace-nowrap font-bold">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleStartInterview}
          disabled={!file || isUploading}
          className="w-full py-4 mt-2 bg-app-lime hover:bg-[#b8ff5c] active:scale-[0.98] text-app-bg font-orbitron text-xs font-bold tracking-[0.15em] uppercase rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(163,255,60,0.15)] disabled:shadow-none"
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-3">
              <span className="inline-block w-4 h-4 rounded-full border-2 border-app-bg/30 border-t-app-bg animate-spin" />
              Parsing Document...
            </span>
          ) : (
            "Initialize Agent →"
          )}
        </button>
      </div>
    </div>
  );
}
