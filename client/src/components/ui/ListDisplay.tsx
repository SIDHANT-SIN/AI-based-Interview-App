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
    <div
      style={{
        padding: "1.5rem",
        backgroundColor: bgColor,
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        height: "100%",
      }}
    >
      <h3 style={{ margin: "0 0 1rem 0", color: "#1f2937" }}>{title}</h3>
      <ul
        style={{
          margin: 0,
          paddingLeft: "0",
          listStyleType: "none",
          color: "#4b5563",
        }}
      >
        {items.map((item, index) => (
          <li
            key={index}
            style={{
              marginBottom: "0.75rem",
              lineHeight: "1.5",
              display: "flex",
              alignItems: "flex-start",
            }}
          >
            <span style={{ marginRight: "0.75rem", fontSize: "1.1rem" }}>
              {icon}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
