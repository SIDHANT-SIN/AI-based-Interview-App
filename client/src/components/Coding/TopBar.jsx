import ControlButton from "../UI/ControlButton";

export default function TopBar({
  problem,
  aiAgent,
  language,
  handleLanguageChange,
  runCode,
  isMuted,
  handleToggleMic,
  handleEndInterview,
}) {
  const difficultyClass =
    problem.difficulty === "Easy"
      ? "text-app-lime bg-app-lime/10 border-app-lime/20"
      : problem.difficulty === "Medium"
        ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
        : "text-app-coral bg-app-coral/10 border-app-coral/20";

  return (
    <div className="flex items-center justify-between flex-wrap gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-[#0b0e1a]/90 backdrop-blur-md border-b border-white/10 flex-shrink-0 min-h-[48px] box-border shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        <span className="font-orbitron font-bold text-xs sm:text-sm text-white tracking-widest uppercase whitespace-nowrap">
          🎙 HireGraph
        </span>
        <span className="inline-block w-px h-4 bg-white/20 rounded-full" />
        <span className="font-orbitron text-[9px] sm:text-[10px] font-bold text-white/50 bg-white/5 border border-white/10 rounded-md px-2 py-1 whitespace-nowrap uppercase tracking-widest">
          🧩 IDE Active
        </span>
        {problem?.difficulty && (
          <span
            className={`font-orbitron text-[9px] sm:text-[10px] font-bold border rounded-md px-2 py-1 whitespace-nowrap uppercase tracking-widest ${difficultyClass}`}
          >
            {problem.difficulty}
          </span>
        )}
        <span
          className={`font-orbitron text-[9px] sm:text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 ${
            aiAgent ? "text-app-lime" : "text-amber-400"
          }`}
        >
          {aiAgent ? "✅ Link Established" : "⏳ Awaiting AI..."}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-md text-white font-mono text-xs sm:text-sm px-3 py-2 cursor-pointer outline-none hover:border-white/30 transition-colors"
        >
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="c">C / C++</option>
        </select>
        <ControlButton
          onClick={() => runCode(false)}
          active={true}
          activeLabel="▶ Run Code"
          inactiveLabel="▶ Run Code"
          activeIcon=""
          inactiveIcon=""
        />
        <ControlButton
          onClick={() => runCode(true)}
          active={true}
          activeLabel="✦ Submit to AI"
          inactiveLabel="✦ Submit to AI"
          activeIcon=""
          inactiveIcon=""
          danger={false} // actually primary, I should adjust ControlButton or use a custom class.
        />
        <ControlButton
          onClick={handleToggleMic}
          active={!isMuted}
          activeIcon="🎙"
          inactiveIcon="🔇"
          activeLabel="Mute"
          inactiveLabel="Unmute"
          danger={isMuted}
        />
        <ControlButton
          onClick={handleEndInterview}
          active={true}
          activeIcon="⬛"
          inactiveIcon="⬛"
          activeLabel="End"
          inactiveLabel="End"
          danger={true}
        />
      </div>
    </div>
  );
}
