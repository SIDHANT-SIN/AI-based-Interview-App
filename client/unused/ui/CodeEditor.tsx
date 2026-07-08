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
    <div className="code-editor-wrapper">
      {/* Editor toolbar */}
      <div className="code-editor-toolbar">
        <div className="code-editor-toolbar-left">
          <span className="code-editor-dot code-editor-dot--red" />
          <span className="code-editor-dot code-editor-dot--amber" />
          <span className="code-editor-dot code-editor-dot--green" />
        </div>
        <span className="code-editor-lang">{language.toUpperCase()}</span>
        <div className="code-editor-toolbar-right">
          <span className="badge badge-neutral">editor</span>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="code-editor-body">
        <Editor
          height="100%"
          language={language === "c" ? "c" : language}
          theme="vs-dark"
          value={code}
          onChange={onChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: '"JetBrains Mono", monospace',
            fontLigatures: true,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            lineNumbersMinChars: 3,
            renderLineHighlight: "gutter",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            scrollbar: {
              verticalScrollbarSize: 4,
              horizontalScrollbarSize: 4,
            },
          }}
        />
      </div>
    </div>
  );
}
