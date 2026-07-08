export default function AIVideoFeed({ aiAgent, isCodingPage = false }) {
  if (!aiAgent) return null;

  if (isCodingPage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0b0e1a]/80 backdrop-blur-md">
        <span className="text-4xl sm:text-[3.5rem] drop-shadow-[0_0_15px_rgba(163,255,60,0.3)]">
          🤖
        </span>
        <p className="font-orbitron text-[9px] sm:text-[10px] tracking-widest uppercase text-app-lime mt-4">
          Viral (AI)
        </p>
      </div>
    );
  }

  // HR Page style
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0b0e1a]/50 border-l border-white/10 relative z-10">
      <span className="text-5xl drop-shadow-[0_0_15px_rgba(163,255,60,0.3)]">
        🤖
      </span>
      <p className="font-orbitron text-[10px] tracking-widest uppercase text-app-lime mt-4">
        Viral (AI Agent)
      </p>
      <div className="mt-2 flex gap-1">
        <span className="w-1 h-1 rounded-full bg-app-lime animate-ping" />
        <span className="w-1 h-1 rounded-full bg-app-lime animate-ping delay-75" />
        <span className="w-1 h-1 rounded-full bg-app-lime animate-ping delay-150" />
      </div>
    </div>
  );
}
