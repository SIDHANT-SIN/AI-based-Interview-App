import { useState } from "react";
import { PanelResizeHandle } from "react-resizable-panels";

export default function ResizeHandle({ vertical = false }) {
  const [active, setActive] = useState(false);
  return (
    <PanelResizeHandle
      onDragging={setActive}
      className={`
        flex-shrink-0 relative z-10 transition-all duration-200
        ${vertical ? "w-1.5 h-full cursor-col-resize" : "w-full h-1.5 cursor-row-resize"}
        ${active ? "bg-app-lime shadow-[0_0_10px_rgba(163,255,60,0.5)]" : "bg-white/5 hover:bg-app-lime/40"}
      `}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {vertical ? (
          <div className="w-0.5 h-6 flex flex-col gap-1">
            <div className="w-full h-0.5 bg-white/20 rounded-full" />
            <div className="w-full h-0.5 bg-white/20 rounded-full" />
            <div className="w-full h-0.5 bg-white/20 rounded-full" />
          </div>
        ) : (
          <div className="h-0.5 w-6 flex gap-1">
            <div className="h-full w-0.5 bg-white/20 rounded-full" />
            <div className="h-full w-0.5 bg-white/20 rounded-full" />
            <div className="h-full w-0.5 bg-white/20 rounded-full" />
          </div>
        )}
      </div>
    </PanelResizeHandle>
  );
}
