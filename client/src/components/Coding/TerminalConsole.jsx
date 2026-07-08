export default function TerminalConsole({ status, output }) {
  if (status === "idle") {
    return (
      <div className="flex items-center gap-3 font-mono text-xs sm:text-sm">
        <span className="text-app-lime font-black drop-shadow-[0_0_8px_rgba(163,255,60,0.8)]">
          ❯
        </span>
        <span className="text-white/30">Awaiting compilation request...</span>
        <span className="inline-block w-2 h-4 bg-app-lime/50 animate-pulse" />
      </div>
    );
  }
  if (status === "running") {
    return (
      <div className="flex items-center gap-3 font-mono text-xs sm:text-sm">
        <span className="w-4 h-4 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin flex-shrink-0" />
        <span className="text-amber-400">
          Compiling and executing against test cases...
        </span>
      </div>
    );
  }
  return (
    <pre
      className={`m-0 font-mono text-xs sm:text-sm leading-loose whitespace-pre-wrap break-words ${
        status === "success" ? "text-app-lime" : "text-app-coral"
      }`}
    >
      {output}
    </pre>
  );
}
