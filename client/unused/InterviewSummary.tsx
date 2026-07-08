import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown"; // 🛠️ Import the new markdown renderer
import { fetchSummary } from "../services/api";

export default function InterviewSummary() {
  const { roomName } = useParams<{ roomName: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<
    "loading" | "processing" | "completed" | "error"
  >("loading");
  const [report, setReport] = useState<string>(""); // 🛠️ Changed to string since it's markdown

  useEffect(() => {
    if (!roomName) return;

    const getSummary = async () => {
      try {
        const data = await fetchSummary(roomName);
        setStatus(data.status);

        if (data.status === "completed") {
          // 🛠️ REMOVED JSON.parse! We just set the raw markdown string directly.
          setReport(data.report || "No report generated.");
        } else if (data.status === "processing") {
          setTimeout(getSummary, 3000);
        }
      } catch (error) {
        console.error("Failed to fetch summary", error);
        setStatus("error");
      }
    };

    setTimeout(getSummary, 2000);
  }, [roomName]);

  if (status === "loading" || status === "processing") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <div
          style={{
            border: "4px solid #e5e7eb",
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            borderLeftColor: "#3b82f6",
            animation: "spin 1s linear infinite",
          }}
        ></div>
        <h2 style={{ marginTop: "1.5rem", color: "#1f2937" }}>
          Viral is evaluating your performance...
        </h2>
        <p style={{ color: "#6b7280" }}>
          Analyzing transcript and code execution. This usually takes 5-10
          seconds.
        </p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "error" || !report) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <h2 style={{ color: "#ef4444" }}>Oops! Something went wrong.</h2>
        <p style={{ color: "#4b5563" }}>
          We couldn't generate your interview summary.
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "0.75rem 1.5rem",
            marginTop: "1rem",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Return Home
        </button>
      </div>
    );
  }

  // 🛠️ The simplified UI rendering the Markdown directly
  return (
    <div className="summary-screen">
      {/* Ambient glow */}
      <div className="summary-glow" />

      <div className="summary-container animate-fade-up">
        {/* Header */}
        <div className="summary-header">
          <div className="summary-header-left">
            <div className="setup-step-badge">Interview Complete</div>
            <h1>Interview Report</h1>
            <p>Here's a full breakdown of your performance</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="btn btn-secondary btn-sm"
          >
            ← Dashboard
          </button>
        </div>

        {/* Report card */}
        <div className="card card-accent summary-report-card">
          <div className="summary-report-body">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="summary-actions">
          <button onClick={() => navigate("/")} className="btn btn-primary">
            Start New Interview →
          </button>
        </div>
      </div>
    </div>
  );
}
