// src/components/ui/TerminalOutput.tsx
import React from "react";

export type TerminalStatus = "idle" | "running" | "success" | "error";

interface TerminalOutputProps {
  status: TerminalStatus;
  output: string;
}

export default function TerminalOutput({
  status,
  output,
}: TerminalOutputProps) {
  // Determine header color based on status
  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "#f5a623"; // Orange/Yellow
      case "success":
        return "#50e3c2"; // Green
      case "error":
        return "#ff4a4a"; // Red
      default:
        return "#888"; // Gray
    }
  };

  return (
    <div className="terminal-wrapper">
      {/* Terminal toolbar */}
      <div className="terminal-toolbar">
        <div className="terminal-toolbar-left">
          <span className="code-editor-dot code-editor-dot--red" />
          <span className="code-editor-dot code-editor-dot--amber" />
          <span className="code-editor-dot code-editor-dot--green" />
        </div>

        <div className="terminal-status-pill" data-status={status}>
          <span className="terminal-status-dot" />
          <span className="terminal-status-label">
            {status === "idle"
              ? "Console"
              : status === "running"
                ? "Running"
                : status === "success"
                  ? "Passed"
                  : "Error"}
          </span>
        </div>

        <div className="terminal-toolbar-right">
          <span className="badge badge-neutral">output</span>
        </div>
      </div>

      {/* Terminal body */}
      <div className="terminal-body">
        {status === "idle" && (
          <div className="terminal-idle">
            <span className="terminal-prompt">$</span>
            <span className="terminal-idle-text">Waiting for execution...</span>
            <span className="terminal-cursor" />
          </div>
        )}

        {status === "running" && (
          <div className="terminal-running">
            <span className="terminal-spinner" />
            <span>Compiling and running against test cases...</span>
          </div>
        )}

        {(status === "success" || status === "error") && (
          <pre className="terminal-output" data-status={status}>
            {output}
          </pre>
        )}
      </div>
    </div>
  );
}
