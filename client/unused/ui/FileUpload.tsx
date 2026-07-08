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
      className={`file-upload-zone ${selectedFile ? "file-upload-zone--selected" : ""}`}
      onClick={() => document.getElementById("resume-upload")?.click()}
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        id="resume-upload"
        style={{ display: "none" }}
      />

      {selectedFile ? (
        /* ── File selected state ── */
        <div className="file-upload-selected">
          <div className="file-upload-icon file-upload-icon--success">📄</div>
          <div className="file-upload-info">
            <span className="file-upload-name">{selectedFile.name}</span>
            <span className="file-upload-meta">
              {(selectedFile.size / 1024).toFixed(0)} KB · PDF
            </span>
          </div>
          <span className="file-upload-check">✓</span>
        </div>
      ) : (
        /* ── Empty / prompt state ── */
        <div className="file-upload-prompt">
          <div className="file-upload-icon">📁</div>
          <p className="file-upload-title">Drop your resume here</p>
          <p className="file-upload-sub">or click to browse</p>
          <span className="badge badge-neutral" style={{ marginTop: "8px" }}>
            PDF only
          </span>
        </div>
      )}
    </div>
  );
}
