// src/components/ui/FileUpload.tsx
import React, { ChangeEvent } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

export default function FileUpload({
  onFileSelect,
  selectedFile,
}: FileUploadProps) {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className="upload-container"
      style={{
        border: "2px dashed #ccc",
        padding: "2rem",
        borderRadius: "8px",
        textAlign: "center",
        margin: "1rem 0",
      }}
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        id="resume-upload"
        style={{ display: "none" }}
      />
      <label
        htmlFor="resume-upload"
        style={{ cursor: "pointer", color: "#0070f3", fontWeight: "bold" }}
      >
        {selectedFile
          ? `📄 ${selectedFile.name}`
          : "Click to select your PDF Resume"}
      </label>
      {!selectedFile && (
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          Only .pdf files are supported
        </p>
      )}
    </div>
  );
}
