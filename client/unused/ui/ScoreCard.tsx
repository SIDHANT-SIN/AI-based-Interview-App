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
  <div className="scorecard">

    <p className="scorecard-label">Overall Score</p>

    {/* Ring */}
    <div className="scorecard-ring-wrapper">
      <svg className="scorecard-svg" viewBox="0 0 120 120">
        {/* Track */}
        <circle
          cx="60" cy="60" r="50"
          fill="none"
          stroke="var(--bg-hover)"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          cx="60" cy="60" r="50"
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 50}`}
          strokeDashoffset={`${2 * Math.PI * 50 * (1 - score / 100)}`}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.8s var(--ease-out)" }}
        />
      </svg>

      {/* Score number in centre */}
      <div className="scorecard-value" style={{ color: getColor() }}>
        {score}
      </div>
    </div>

    {/* Tier label */}
    <span
      className="badge scorecard-tier"
      style={{
        color: getColor(),
        background: `${getColor()}18`,
        border: `1px solid ${getColor()}30`,
      }}
    >
      {score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs Work"}
    </span>

  </div>
);
}
