export default function ControlButton({
  onClick,
  active,
  activeIcon,
  inactiveIcon,
  activeLabel,
  inactiveLabel,
  danger,
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-5 py-2.5 rounded-lg border font-orbitron text-[10px] font-bold tracking-widest uppercase transition-all duration-200 active:scale-[0.98]
        ${
          danger
            ? "bg-app-coral/10 border-app-coral/30 text-app-coral hover:bg-app-coral/20 shadow-[0_0_15px_rgba(255,79,106,0.15)]"
            : "bg-white/5 border-white/10 text-white hover:bg-white/10"
        }
      `}
    >
      <span className="text-sm">{active ? activeIcon : inactiveIcon}</span>
      <span>{active ? activeLabel : inactiveLabel}</span>
    </button>
  );
}
