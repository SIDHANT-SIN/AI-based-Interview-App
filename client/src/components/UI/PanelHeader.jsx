export default function PanelHeader({ dots, label, badge, statusColorClass }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.04] border-b border-white/10 flex-shrink-0">
      {dots && (
        <div className="flex items-center gap-1.5 opacity-80">
          <span className="w-2.5 h-2.5 rounded-full bg-app-coral" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-app-lime" />
        </div>
      )}
      <span
        className={`font-orbitron text-[10px] sm:text-xs font-bold uppercase tracking-widest flex-1 overflow-hidden text-ellipsis whitespace-nowrap ${statusColorClass || "text-white/60"}`}
      >
        {label}
      </span>
      <span className="font-orbitron text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-white/30 bg-white/5 border border-white/10 rounded-md px-2 py-1 whitespace-nowrap flex-shrink-0">
        {badge}
      </span>
    </div>
  );
}
