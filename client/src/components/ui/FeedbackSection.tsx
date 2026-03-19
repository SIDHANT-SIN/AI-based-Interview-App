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
    <div
      style={{
        padding: "1.5rem",
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        height: "100%",
      }}
    >
      <h3
        style={{
          margin: "0 0 1rem 0",
          color: "#1f2937",
          borderBottom: "2px solid #f3f4f6",
          paddingBottom: "0.75rem",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          color: "#4b5563",
          lineHeight: "1.6",
          whiteSpace: "pre-wrap",
        }}
      >
        {content}
      </p>
    </div>
  );
}
