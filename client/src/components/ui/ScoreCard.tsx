import React from "react";

interface ScoreCardProps {
  score: number;
}

export default function ScoreCard({ score }: ScoreCardProps) {
  // Dynamically color the score ring
  const getColor = () => {
    if (score >= 80) return "#22c55e"; // Green
    if (score >= 60) return "#eab308"; // Yellow
    return "#ef4444"; // Red
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
      }}
    >
      <h3 style={{ margin: "0 0 1rem 0", color: "#4b5563" }}>Overall Score</h3>
      <div
        style={{
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          border: `8px solid ${getColor()}`,
          fontSize: "2.5rem",
          fontWeight: "bold",
          color: "#1f2937",
        }}
      >
        {score}
      </div>
    </div>
  );
}
