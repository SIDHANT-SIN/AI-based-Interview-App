// src/App.tsx
import React, { useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  UserButton,
} from "@clerk/clerk-react";

import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import MainMenuPage from "./pages/MainMenuPage";
import ResumeUploadPage from "./pages/ResumeUploadPage";
import HRInterviewPage from "./pages/HRInterviewPage";
import CodingInterviewPage from "./pages/CodingInterviewPage";
import SummaryPage from "./pages/SummaryPage";
import HistoryPage from "./pages/HistoryPage";
import LobbyPage from "./pages/LobbyPage";
import "./index.css";

/* ─────────────────────────────────────────────────────────────
   HEADER — shown on every page
───────────────────────────────────────────────────────────── */
function AppHeader() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 h-14 sm:h-16 bg-[#0b0e1a]/85 backdrop-blur-md border-b border-app-border shrink-0">
      {/* Brand Button */}
      <button
        onClick={() => navigate("/")}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`flex items-center gap-2 bg-transparent border-none cursor-pointer p-0 transition-opacity duration-150 ${hovered ? "opacity-80" : "opacity-100"
          }`}
      >
        <span className="text-xl sm:text-2xl">🎙</span>
        <span className="font-orbitron font-bold text-[0.95rem] sm:text-[1.1rem] text-white tracking-tight">
          HireGraph
        </span>
        <span className="font-dm text-[10px] font-bold text-app-lime bg-app-lime/10 border border-app-lime/30 rounded-full px-2 py-0.5 uppercase tracking-wider">
          Beta
        </span>
      </button>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-4">
        <SignedIn>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-app-lime/10 border border-app-lime/30">
            <span className="w-1.5 h-1.5 rounded-full bg-app-lime animate-pulse" />
            <span className="font-dm text-[11px] font-semibold text-app-lime tracking-wide uppercase">
              Live
            </span>
          </div>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   PROTECTED ROUTE WRAPPER
───────────────────────────────────────────────────────────── */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   APP
───────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <div className="relative flex flex-col min-h-screen w-full overflow-hidden bg-app-bg text-white font-dm">
      {/* Global Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
          linear-gradient(rgba(163,255,60,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(163,255,60,0.08) 1px, transparent 1px)
        `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Global Ambient Glow Blobs */}
      <div className="fixed top-[-60px] right-[-60px] w-[400px] h-[400px] rounded-full opacity-20 blur-[80px] bg-app-lime pointer-events-none z-0" />
      <div className="fixed bottom-[-40px] left-[-40px] w-[300px] h-[300px] rounded-full opacity-20 blur-[80px] bg-app-coral pointer-events-none z-0" />
      {/* Main Content Wrapper - positioned above the background */}
      <div className="relative z-10 flex flex-col flex-1">
        <AppHeader />

        <main className="flex-1 flex flex-col w-full min-h-0">
          <Routes>
            {/* ── Public auth routes ── */}
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />

            {/* ── Protected routes ── */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainMenuPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/setup/hr"
              element={
                <ProtectedRoute>
                  <ResumeUploadPage />
                </ProtectedRoute>
              }
            />
            <Route path="/lobby/:roomName" element={<LobbyPage />} />
            <Route
              path="/interview/hr/:roomName"
              element={
                <ProtectedRoute>
                  <HRInterviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interview/coding/:roomName"
              element={
                <ProtectedRoute>
                  <CodingInterviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/summary/:roomName"
              element={
                <ProtectedRoute>
                  <SummaryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />

            {/* ── Fallback — redirect anything unknown to home ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
