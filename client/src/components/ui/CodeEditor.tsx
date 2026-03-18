// src/components/ui/CodeEditor.tsx
import React from "react";
import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
}

export default function CodeEditor({
  code,
  language,
  onChange,
}: CodeEditorProps) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        border: "1px solid #333",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <Editor
        height="100%"
        language={language === "c" ? "c" : language} // Monaco handles python, java, c natively
        theme="vs-dark"
        value={code}
        onChange={onChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          padding: { top: 16 },
        }}
      />
    </div>
  );
}
