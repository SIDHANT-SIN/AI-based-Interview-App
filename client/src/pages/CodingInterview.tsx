// src/pages/CodingInterview.tsx
import React, { useState, useEffect } from "react";
import CodingRoom from "../components/interview/CodingRoom";
import { fetchCodingProblem } from "../services/api";

interface CodingInterviewProps {
  url: string;
  token: string;
  roomName: string;
}

export default function CodingInterview({
  url,
  token,
  roomName,
}: CodingInterviewProps) {
  const [problem, setProblem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getProblem = async () => {
      try {
        const data = await fetchCodingProblem();
        setProblem(data);
      } catch (err) {
        setError(
          "Could not load the coding problem. Is the Python server running?",
        );
      } finally {
        setIsLoading(false);
      }
    };

    getProblem();
  }, []);

  if (isLoading)
    return (
      <div style={{ textAlign: "center", marginTop: "20vh" }}>
        <h2>Loading Problem Environment...</h2>
      </div>
    );
  if (error)
    return (
      <div style={{ textAlign: "center", marginTop: "20vh", color: "red" }}>
        <h2>{error}</h2>
      </div>
    );

  return (
    <CodingRoom url={url} token={token} problem={problem} roomName={roomName} />
  );
}
