export default function TranscriptViewer({ rawTranscript }) {
  if (!rawTranscript) return null;

  // Parse the raw string into structured messages
  const lines = rawTranscript.split('\n').filter(line => line.trim() !== '');
  const messages = [];

  let currentSpeaker = "System"; // fallback
  let currentText = "";
  let messageId = 0;

  for (const line of lines) {
    if (line.startsWith("Candidate:")) {
      if (currentText) {
        messages.push({ id: messageId++, speaker: currentSpeaker, text: currentText.trim() });
      }
      currentSpeaker = "Candidate";
      currentText = line.replace("Candidate:", "").trim();
    } else if (line.startsWith("Viral:")) {
      if (currentText) {
        messages.push({ id: messageId++, speaker: currentSpeaker, text: currentText.trim() });
      }
      currentSpeaker = "Viral";
      currentText = line.replace("Viral:", "").trim();
    } else if (line.startsWith("[EXECUTION_RESULT]")) {
      if (currentText) {
        messages.push({ id: messageId++, speaker: currentSpeaker, text: currentText.trim() });
      }
      currentSpeaker = "System";
      currentText = line.trim();
    } else if (line.startsWith("[SYSTEM FLAG:")) {
      if (currentText) {
        messages.push({ id: messageId++, speaker: currentSpeaker, text: currentText.trim() });
      }
      currentSpeaker = "Flag";
      // Extract just the message from inside the brackets: [SYSTEM FLAG: Candidate missing from camera]
      currentText = line.replace("[SYSTEM FLAG:", "").replace("]", "").trim();
    } else {
      // It's a continuation of the previous message
      currentText += (currentText ? "\n" : "") + line;
    }
  }

  if (currentText) {
    messages.push({ id: messageId++, speaker: currentSpeaker, text: currentText.trim() });
  }

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm mt-2">
      <h3 className="font-orbitron text-sm sm:text-base font-bold uppercase tracking-widest text-white m-0 mb-6 flex items-center gap-2">
        <span className="text-xl">🎙️</span> Mission Transcript
      </h3>

      <div className="flex flex-col gap-5 max-h-[600px] overflow-y-auto pr-3 custom-scrollbar">
        {messages.map((msg) => {
          // System/Code Execution Terminal Block
          if (msg.speaker === "System") {
            return (
              <div key={msg.id} className="w-full bg-[#0b0e1a]/80 border border-amber-400/20 rounded-lg p-4 font-mono text-xs text-amber-400/80 my-2 whitespace-pre-wrap break-words shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                {msg.text}
              </div>
            );
          }

          // Proctoring Alert UI Block
          if (msg.speaker === "Flag") {
            return (
              <div key={msg.id} className="w-full flex items-center justify-center my-4">
                <div className="flex items-center gap-3 px-4 py-2 bg-app-coral/10 border border-app-coral/30 rounded-lg shadow-[0_0_15px_rgba(255,79,106,0.15)] max-w-[80%]">
                  <span className="text-xl">⚠️</span>
                  <div className="flex flex-col">
                    <span className="font-orbitron text-[9px] font-bold text-app-coral tracking-widest uppercase">
                      Proctoring Alert
                    </span>
                    <span className="font-dm text-xs text-white/80">
                      {msg.text}
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          const isUser = msg.speaker === "Candidate";

          return (
            <div key={msg.id} className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed font-dm ${isUser
                    ? "bg-app-lime/10 text-white rounded-tr-sm border border-app-lime/20"
                    : "bg-white/5 text-white/70 rounded-tl-sm border border-white/10"
                  }`}
              >
                <span className={`block font-orbitron text-[9px] font-bold uppercase tracking-widest mb-1.5 ${isUser ? "text-app-lime/80" : "text-white/40"}`}>
                  {msg.speaker}
                </span>
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(163, 255, 60, 0.3); }
      `}</style>
    </div>
  );
}
