"use client";

import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { getSamples } from "@/lib/api";
import { SAMPLE_DOCS as FALLBACK_SAMPLES } from "@/lib/mockData";

export default function UploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [samples, setSamples] = useState<any[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(true);

  // Fetch real samples from backend
  useEffect(() => {
    async function fetchSamples() {
      try {
        const data = await getSamples();
        setSamples(data);
      } catch (error) {
        console.error("Failed to fetch samples, using fallback:", error);
        setSamples(FALLBACK_SAMPLES);
      } finally {
        setLoadingSamples(false);
      }
    }
    fetchSamples();
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Store file for preview
    const reader = new FileReader();
    reader.onload = () => {
      sessionStorage.setItem("uploadedFileData", reader.result as string);
      sessionStorage.setItem("uploadedFileName", file.name);
      sessionStorage.setItem("uploadedFileType", file.type);
      
      // Navigate to results page (no mock param = use real file)
      router.push("/results");
    };
    reader.readAsDataURL(file);
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
          
          {loadingSamples ? (
            <p style={{ color: "#6f6b63", textAlign: "center" as const }}>
              Loading samples...
            </p>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "1rem"
            }}>
            {samples.map((sample) => (
  <div
    key={sample.id}
    onClick={() => loadSample(sample.id)}
    style={{
      background: "#ffffff",
      border: "1px solid #d4d1ca",
      borderRadius: "1rem",
      padding: "1rem",
      cursor: "pointer",
      textAlign: "center" as const,
      transition: "all 0.2s"
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 8px 24px rgba(30,25,20,.10)";
      e.currentTarget.style.borderColor = "#01696f";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.borderColor = "#d4d1ca";
    }}
  >
    <div style={{
      width: "60px",
      height: "60px",
      margin: "0 auto 0.75rem",
      borderRadius: "0.7rem",
      background: sample.verdict_hint === "GENUINE" ? "#437a22" 
        : sample.verdict_hint === "HIGH_TAMPER_RISK" ? "#a12c7b" 
        : "#da7101",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontSize: "1.5rem"
    }}>
      {sample.verdict_hint === "GENUINE" ? "✓" 
        : sample.verdict_hint === "HIGH_TAMPER_RISK" ? "⚠" 
        : "🔍"}
    </div>
    <h4 style={{
      fontFamily: "system-ui, sans-serif",
      fontSize: "1rem",
      color: "#28251d",
      marginBottom: "0.25rem"
    }}>
      {sample.label}
    </h4>
    <p style={{
      color: "#6f6b63",
      fontSize: "0.875rem",
      marginBottom: "0.25rem"
    }}>
      {sample.description}
    </p>
    {sample.format_badge && (
      <span style={{
        fontSize: "0.75rem",
        background: "#f3f0ec",
        padding: "0.2rem 0.5rem",
        borderRadius: "4px",
        color: "#6f6b63",
        display: "inline-block"
      }}>
        {sample.format_badge}
      </span>
    )}
  </div>

              ))}
            </div>
          )}
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