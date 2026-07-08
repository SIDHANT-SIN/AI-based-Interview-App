import Editor from "@monaco-editor/react";

const monacoOptions = {
  minimap: { enabled: false },
  fontSize: 13,
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
    alwaysConsumeMouseWheel: false,
  },
};

export default function EditorBlock({ code, setCode, language }) {
  return (
    <div className="flex-1 min-h-0 overflow-hidden pt-2">
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={(val) => setCode(val || "")}
        options={monacoOptions}
      />
    </div>
  );
}
