import React from "react";

interface FeedbackSectionProps {
  title: string;
  content: string;
}

export default function FeedbackSection({
  title,
  content,
}: FeedbackSectionProps) {
  return (
    <div className="feedback-section">
      {/* Header */}
      <div className="feedback-header">
        <span className="feedback-icon">
          {title.toLowerCase().includes("strength")
            ? "💪"
            : title.toLowerCase().includes("improve")
              ? "🎯"
              : title.toLowerCase().includes("overall")
                ? "📊"
                : "💬"}
        </span>
        <h3 className="feedback-title">{title}</h3>
      </div>

      {/* Divider */}
      <div className="divider" />

      {/* Content */}
      <p className="feedback-content">{content}</p>
    </div>
  );
}
