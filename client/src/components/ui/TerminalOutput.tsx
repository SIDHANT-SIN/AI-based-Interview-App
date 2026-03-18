// src/components/ui/TerminalOutput.tsx
import React from "react";

export type TerminalStatus = "idle" | "running" | "success" | "error";

interface TerminalOutputProps {
  status: TerminalStatus;
  output: string;
}

export default function TerminalOutput({ status, output }: TerminalOutputProps) {
  // Determine header color based on status
  const getStatusColor = () => {
    switch (status) {
      case "running": return "#f5a623"; // Orange/Yellow
      case "success": return "#50e3c2"; // Green
      case "error": return "#ff4a4a";   // Red
      default: return "#888";           // Gray
    }
  };

  return (
    <div style={{ 
      backgroundColor: "#1e1e1e", 
      color: "#d4d4d4", 
      fontFamily: "monospace", 
      height: "100%", 
      display: "flex", 
      flexDirection: "column",
      border: "1px solid #333",
      borderRadius: "8px",
      overflow: "hidden"
    }}>
      {/* Terminal Header */}
      <div style={{ 
        backgroundColor: "#2d2d2d", 
        padding: "8px 16px", 
        borderBottom: "1px solid #333",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: getStatusColor() }} />
        <span style={{ fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase", color: getStatusColor() }}>
          {status === "idle" ? "Console" : status}
        </span>
      </div>

      {/* Terminal Body */}
      <div style={{ padding: "16px", overflowY: "auto", flexGrow: 1, whiteSpace: "pre-wrap" }}>
        {status === "idle" && <span style={{ color: "#666" }}>Waiting for execution...</span>}
        {status === "running" && <span style={{ color: "#f5a623" }}>Compiling and running against test cases...</span>}
        {(status === "success" || status === "error") && output}
      </div>
    </div>
  );
}