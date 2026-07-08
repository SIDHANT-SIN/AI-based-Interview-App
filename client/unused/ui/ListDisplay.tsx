import React from "react";

interface ListDisplayProps {
  title: string;
  items: string[];
  type: "strengths" | "improvements";
}

export default function ListDisplay({ title, items, type }: ListDisplayProps) {
  const icon = type === "strengths" ? "✅" : "🎯";
  const bgColor = type === "strengths" ? "#f0fdf4" : "#fef2f2";

  return (
    <div className="list-display">
      {/* Header */}
      <div className="list-display-header">
        <span className="list-display-icon">{icon}</span>
        <h3 className="list-display-title">{title}</h3>
        <span className="badge badge-neutral list-display-count">
          {items.length}
        </span>
      </div>

      <div className="divider" />

      {/* Items */}
      <ul className="list-display-items">
        {items.map((item, index) => (
          <li key={index} className="list-display-item">
            <span className="list-display-bullet">{icon}</span>
            <span className="list-display-text">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
