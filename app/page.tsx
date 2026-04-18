"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

// Temporary inline mock data until imports work
const SAMPLE_DOCS = [
  {
    id: "genuine",
    name: "Genuine Certificate",
    description: "Clean document, no tampering",
    type: "genuine" as const
  },
  {
    id: "tampered",
    name: "Tampered Marksheet",
    description: "Edited marks and seal",
    type: "tampered" as const
  },
  {
    id: "tamil",
    name: "Tamil Certificate",
    description: "Regional language doc",
    type: "genuine" as const
  }
];

export default function UploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      router.push("/results?mock=tampered");
    }
  }, [router]);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png"],
      "application/pdf": [".pdf"]
    },
    maxFiles: 1,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false)
  });

  const loadSample = (sampleId: string) => {
    router.push(`/results?mock=${sampleId}`);
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f7f6f2",
      padding: "2rem 1rem"
    }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1 style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: "2.5rem",
            color: "#28251d",
            marginBottom: "1rem"
          }}>
            🛡️ ForgeGuard
          </h1>
          <p style={{
            color: "#6f6b63",
            fontSize: "1.125rem"
          }}>
            Upload a document to detect potential forgery
          </p>
        </div>

        <div
          {...getRootProps()}
          style={{
            background: isDragging ? "#f3f0ec" : "#ffffff",
            border: `2px dashed ${isDragging ? "#01696f" : "#d4d1ca"}`,
            borderRadius: "1.25rem",
            padding: "4rem 2rem",
            textAlign: "center" as const,
            cursor: "pointer",
            boxShadow: isDragging ? "0 18px 40px rgba(30,25,20,.12)" : "0 8px 24px rgba(30,25,20,.10)",
            marginBottom: "2.5rem"
          }}
        >
          <input {...getInputProps()} />
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📄</div>
          <h3 style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: "1.5rem",
            color: "#28251d",
            marginBottom: "0.5rem"
          }}>
            {isDragging ? "Drop your document here" : "Drag & drop your document"}
          </h3>
          <p style={{ color: "#6f6b63", marginBottom: "1rem" }}>
            or
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); open(); }}
            style={{
              background: "#01696f",
              color: "white",
              padding: "0.75rem 2rem",
              borderRadius: "999px",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 600,
              border: "none",
              cursor: "pointer"
            }}
          >
            Browse Files
          </button>
          <p style={{
            color: "#6f6b63",
            fontSize: "0.875rem",
            marginTop: "1rem"
          }}>
            Supports: JPG, PNG, PDF
          </p>
        </div>

        <div>
          <h3 style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: "1.125rem",
            color: "#28251d",
            marginBottom: "1rem"
          }}>
            Or try a sample document:
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem"
          }}>
            {SAMPLE_DOCS.map((sample) => (
              <div
                key={sample.id}
                onClick={() => loadSample(sample.id)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #d4d1ca",
                  borderRadius: "1rem",
                  padding: "1rem",
                  cursor: "pointer",
                  textAlign: "center" as const
                }}
              >
                <div style={{
                  width: "60px",
                  height: "60px",
                  margin: "0 auto 0.75rem",
                  borderRadius: "0.7rem",
                  background: sample.type === "genuine" ? "#437a22" : "#a12c7b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "1.5rem"
                }}>
                  {sample.type === "genuine" ? "✓" : "⚠"}
                </div>
                <h4 style={{
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "1rem",
                  color: "#28251d",
                  marginBottom: "0.25rem"
                }}>
                  {sample.name}
                </h4>
                <p style={{
                  color: "#6f6b63",
                  fontSize: "0.875rem"
                }}>
                  {sample.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p style={{
          textAlign: "center" as const,
          color: "#6f6b63",
          fontSize: "0.875rem",
          marginTop: "3rem"
        }}>
          Track C Hackathon • ForgeGuard • AI-Powered Document Verification
        </p>
      </div>
    </main>
  );
}