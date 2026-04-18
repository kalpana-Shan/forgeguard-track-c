// app/results/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnalysisResult, SuspiciousRegion } from "@/types";
import { MOCK_GENUINE, MOCK_TAMPERED_MARKS, MOCK_TAMIL } from "@/lib/mockData";
import { getSampleAnalysis, analyzeDocument } from "@/lib/api";

// ====== PREMIUM CONFIDENCE RING ======
const ConfidenceRing = ({ score }: { score: number }) => {
  const percentage = Math.round(score * 100);
  const getColor = () => {
    if (score < 0.35) return { main: "#10b981", glow: "rgba(16, 185, 129, 0.3)" };
    if (score < 0.65) return { main: "#f59e0b", glow: "rgba(245, 158, 11, 0.3)" };
    return { main: "#ef4444", glow: "rgba(239, 68, 68, 0.3)" };
  };
  const colors = getColor();
  
  return (
    <div style={{ position: "relative", width: "120px", height: "120px" }}>
      {/* Glow effect */}
      <div style={{
        position: "absolute",
        inset: "-10px",
        background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
        filter: "blur(8px)",
        opacity: 0.6
      }} />
      
      <svg width="120" height="120" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.main} />
            <stop offset="100%" stopColor={`${colors.main}dd`} />
          </linearGradient>
        </defs>
        
        {/* Background track */}
        <circle
          cx="60" cy="60" r="48"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        
        {/* Animated progress */}
        <circle
          cx="60" cy="60" r="48"
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth="6"
          strokeDasharray={`${percentage * 3.016} 301.6`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
        
        {/* Inner circle */}
        <circle
          cx="60" cy="60" r="42"
          fill="rgba(0,0,0,0.3)"
        />
      </svg>
      
      {/* Center text */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center"
      }}>
        <div style={{
          fontSize: "2rem",
          fontWeight: 800,
          color: "white",
          lineHeight: 1,
          textShadow: "0 2px 10px rgba(0,0,0,0.3)"
        }}>
          {percentage}
        </div>
        <div style={{
          fontSize: "0.7rem",
          color: "rgba(255,255,255,0.7)",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginTop: "2px"
        }}>
          confidence
        </div>
      </div>
    </div>
  );
};

// ====== SEVERITY CHART ======
const SeverityChart = ({ regions }: { regions: SuspiciousRegion[] }) => {
  const high = regions.filter(r => r.severity === "high").length;
  const medium = regions.filter(r => r.severity === "medium").length;
  const low = regions.filter(r => r.severity === "low").length;
  const total = high + medium + low || 1;
  
  return (
    <div style={{ marginTop: "24px" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "8px"
      }}>
        <span style={{
          fontSize: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "rgba(255,255,255,0.5)",
          fontWeight: 600
        }}>
          Issue Severity
        </span>
        <span style={{
          fontSize: "12px",
          color: "rgba(255,255,255,0.7)"
        }}>
          {total} total
        </span>
      </div>
      
      {/* Stacked bar */}
      <div style={{
        display: "flex",
        height: "6px",
        borderRadius: "3px",
        overflow: "hidden",
        marginBottom: "12px",
        background: "rgba(255,255,255,0.1)"
      }}>
        {high > 0 && <div style={{ flex: high, background: "#ef4444" }} />}
        {medium > 0 && <div style={{ flex: medium, background: "#f59e0b" }} />}
        {low > 0 && <div style={{ flex: low, background: "#10b981" }} />}
      </div>
      
      {/* Legend */}
      <div style={{ display: "flex", gap: "16px" }}>
        <LegendItem color="#ef4444" label="High" count={high} />
        <LegendItem color="#f59e0b" label="Medium" count={medium} />
        <LegendItem color="#10b981" label="Low" count={low} />
      </div>
    </div>
  );
};

const LegendItem = ({ color, label, count }: { color: string; label: string; count: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
    <div style={{
      width: "8px",
      height: "8px",
      borderRadius: "2px",
      background: color
    }} />
    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
      {count} <span style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
    </span>
  </div>
);

// ====== MAIN RESULTS ======
function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState<"original" | "ocr" | "heatmap">("original");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
  const mockId = searchParams.get("mock");
  const uploadedFileData = sessionStorage.getItem("uploadedFileData");
  
  async function fetchAnalysis() {
    try {
      setLoading(true);
      let data: AnalysisResult;
      
      // PRIORITY 1: Real uploaded file → Call actual backend
      if (uploadedFileData && !mockId) {
        try {
          const fileName = sessionStorage.getItem("uploadedFileName") || "upload.jpg";
          const fileType = sessionStorage.getItem("uploadedFileType") || "image/jpeg";
          
          // Convert base64 back to File
          const response = await fetch(uploadedFileData);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: fileType });
          
          // Call real backend API
          const { analyzeDocument } = await import('@/lib/api');
          data = await analyzeDocument(file);
          
          console.log('✅ Real API success!');
          
          // Clear storage after successful analysis
          sessionStorage.removeItem("uploadedFileData");
          sessionStorage.removeItem("uploadedFileName");
          sessionStorage.removeItem("uploadedFileType");
        } catch (apiError) {
          console.warn('⚠️ Backend unavailable, using fallback:', apiError);
          // Fallback to simulation
          data = {
            ...MOCK_TAMPERED_MARKS,
            document_id: `upload-${Date.now()}`,
            officer_summary: "Uploaded document analyzed in fallback mode. Backend connection unavailable."
          };
        }
      } 
      // PRIORITY 2: Sample from backend (mock param present)
      else if (mockId) {
        try {
          data = await getSampleAnalysis(mockId);
          console.log('✅ Sample fetched from backend:', mockId);
        } catch {
          console.warn('⚠️ Sample API failed, using local mock');
          // Fallback to local mock data based on ID
          if (mockId.includes("genuine")) {
            data = MOCK_GENUINE;
          } else if (mockId.includes("tamil")) {
            data = MOCK_TAMIL;
          } else {
            data = MOCK_TAMPERED_MARKS;
          }
        }
      }
      // PRIORITY 3: Default fallback
      else {
        data = MOCK_TAMPERED_MARKS;
      }
      
      setResult(data);
    } catch (error) {
      console.error("Analysis failed:", error);
      setResult(MOCK_TAMPERED_MARKS);
    } finally {
      setLoading(false);
    }
  }
  
  fetchAnalysis();
}, [searchParams]);

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case "LIKELY_GENUINE":
        return {
          bg: "rgba(16, 185, 129, 0.15)",
          border: "rgba(16, 185, 129, 0.3)",
          text: "#10b981",
          icon: "✓",
          label: "Likely Genuine"
        };
      case "HIGH_TAMPER_RISK":
        return {
          bg: "rgba(239, 68, 68, 0.15)",
          border: "rgba(239, 68, 68, 0.3)",
          text: "#ef4444",
          icon: "⚠",
          label: "High Tamper Risk"
        };
      default:
        return {
          bg: "rgba(245, 158, 11, 0.15)",
          border: "rgba(245, 158, 11, 0.3)",
          text: "#f59e0b",
          icon: "🔍",
          label: "Review Needed"
        };
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 24px",
            border: "2px solid rgba(255,255,255,0.1)",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
          <p style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: "18px",
            marginBottom: "8px"
          }}>
            Analyzing Document
          </p>
          <p style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: "14px"
          }}>
            OCR • ELA • Layout Analysis
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!result) return null;

  const currentPageData = result.pages[currentPage];
  const verdictStyle = getVerdictStyle(result.verdict);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)",
      padding: "24px"
    }}>
      <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => router.push("/")}
              style={{
                padding: "10px 20px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
                backdropFilter: "blur(10px)",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              ← Back to Upload
            </button>
            
            <div>
              <h1 style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "white",
                margin: 0,
                letterSpacing: "-0.5px"
              }}>
                Analysis Results
              </h1>
              <p style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: "14px",
                margin: "4px 0 0"
              }}>
                Document ID: {result.document_id}
              </p>
            </div>
          </div>
          
          {/* Verdict Badge */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            padding: "12px 24px",
            background: verdictStyle.bg,
            border: `1px solid ${verdictStyle.border}`,
            borderRadius: "60px",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: verdictStyle.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              color: "white",
              boxShadow: `0 0 20px ${verdictStyle.text}40`
            }}>
              {verdictStyle.icon}
            </div>
            <div>
              <div style={{
                fontSize: "18px",
                fontWeight: 700,
                color: verdictStyle.text
              }}>
                {verdictStyle.label}
              </div>
              <div style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.5)"
              }}>
                {result.confidence_score > 0.65 ? "Strong evidence" : "Moderate evidence"}
              </div>
            </div>
            <ConfidenceRing score={result.confidence_score} />
          </div>
        </div>

        {/* Page Tabs */}
        {result.pages.length > 1 && (
          <div style={{
            display: "flex",
            gap: "8px",
            marginBottom: "24px"
          }}>
            {result.pages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx)}
                style={{
                  padding: "10px 20px",
                  background: currentPage === idx 
                    ? "rgba(59, 130, 246, 0.2)" 
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${currentPage === idx 
                    ? "rgba(59, 130, 246, 0.4)" 
                    : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "12px",
                  color: currentPage === idx ? "#60a5fa" : "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                  backdropFilter: "blur(10px)",
                  transition: "all 0.2s"
                }}
              >
                📄 Page {idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Main Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: "24px"
        }}>
          
          {/* Left: Document Viewer */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px",
            padding: "24px",
            backdropFilter: "blur(10px)"
          }}>
            {/* Layer Toggle */}
            <div style={{
              display: "flex",
              gap: "8px",
              marginBottom: "20px",
              background: "rgba(0,0,0,0.3)",
              padding: "4px",
              borderRadius: "14px"
            }}>
              {(["original", "ocr", "heatmap"] as const).map((layer) => (
                <button
                  key={layer}
                  onClick={() => setActiveLayer(layer)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: activeLayer === layer 
                      ? "rgba(59, 130, 246, 0.2)" 
                      : "transparent",
                    border: activeLayer === layer 
                      ? "1px solid rgba(59, 130, 246, 0.4)" 
                      : "1px solid transparent",
                    borderRadius: "10px",
                    color: activeLayer === layer ? "#60a5fa" : "rgba(255,255,255,0.5)",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {layer === "original" && "📄 Original"}
                  {layer === "ocr" && "🔤 OCR Analysis"}
                  {layer === "heatmap" && "🔥 ELA Heatmap"}
                </button>
              ))}
            </div>
            
            {/* Image Container */}
            <div style={{
              background: "rgba(0,0,0,0.4)",
              borderRadius: "16px",
              padding: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              minHeight: "500px"
            }}>
              <img 
                src={
                  activeLayer === "heatmap" && currentPageData.ela_heatmap_url 
                    ? currentPageData.ela_heatmap_url 
                    : currentPageData.preview_image_url
                }
                alt="Document"
                style={{
                  maxWidth: "100%",
                  maxHeight: "650px",
                  borderRadius: "8px",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
                }}
              />
              
              {/* OCR Boxes */}
              {activeLayer === "ocr" && currentPageData.suspicious_regions.map((region) => {
                const isSelected = selectedRegion === region.region_id;
                const severityColor = region.severity === "high" 
                  ? "#ef4444" 
                  : region.severity === "medium" ? "#f59e0b" : "#10b981";
                
                return (
                  <div
                    key={region.region_id}
                    style={{
                      position: "absolute",
                      left: `${(region.box.x / 800) * 100}%`,
                      top: `${(region.box.y / 1000) * 100}%`,
                      width: `${(region.box.w / 800) * 100}%`,
                      height: `${(region.box.h / 1000) * 100}%`,
                      border: `2px solid ${isSelected ? "#60a5fa" : severityColor}`,
                      background: isSelected 
                        ? "rgba(59, 130, 246, 0.15)"
                        : `${severityColor}15`,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: isSelected ? `0 0 0 4px rgba(59, 130, 246, 0.3)` : "none",
                      borderRadius: "4px"
                    }}
                    onClick={() => setSelectedRegion(region.region_id)}
                  />
                );
              })}
            </div>
          </div>

          {/* Right: Trust Lens */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px",
            padding: "24px",
            backdropFilter: "blur(10px)",
            height: "fit-content",
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px"
            }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px"
              }}>
                🔍
              </div>
              <div>
                <h2 style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "white",
                  margin: 0
                }}>
                  Trust Lens
                </h2>
                <p style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.4)",
                  margin: "2px 0 0"
                }}>
                  Explainable AI Evidence
                </p>
              </div>
            </div>
            
            {/* Officer Summary */}
            <div style={{
              padding: "20px",
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.05))",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "16px",
              marginBottom: "24px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px"
              }}>
                <span style={{ fontSize: "16px" }}>👮</span>
                <span style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.9)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Officer Summary
                </span>
              </div>
              <p style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "14px",
                lineHeight: 1.6,
                margin: 0
              }}>
                {result.officer_summary}
              </p>
            </div>
            
            {/* Severity Chart */}
            <SeverityChart regions={currentPageData.suspicious_regions} />
            
            {/* Evidence List */}
            <div style={{ marginTop: "24px" }}>
              <h3 style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "16px"
              }}>
                📋 Evidence & Red Flags
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {result.top_reasons.map((reason, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px",
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.15)",
                      borderRadius: "12px",
                      borderLeft: "3px solid #ef4444"
                    }}
                  >
                    <p style={{
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "13px",
                      margin: 0,
                      lineHeight: 1.5
                    }}>
                      {reason}
                    </p>
                  </div>
                ))}
                
                {currentPageData.suspicious_regions.map((region) => {
                  const isSelected = selectedRegion === region.region_id;
                  const severityColor = region.severity === "high" 
                    ? "#ef4444" 
                    : region.severity === "medium" ? "#f59e0b" : "#10b981";
                  
                  return (
                    <div
                      key={region.region_id}
                      style={{
                        padding: "16px",
                        background: isSelected 
                          ? "rgba(59, 130, 246, 0.1)"
                          : `rgba(255,255,255,0.03)`,
                        border: `1px solid ${isSelected 
                          ? "rgba(59, 130, 246, 0.3)" 
                          : "rgba(255,255,255,0.06)"}`,
                        borderRadius: "12px",
                        borderLeft: `3px solid ${severityColor}`,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onClick={() => setSelectedRegion(region.region_id)}
                    >
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "8px",
                        flexWrap: "wrap"
                      }}>
                        <span style={{
                          padding: "4px 10px",
                          background: `${severityColor}20`,
                          borderRadius: "20px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: severityColor,
                          textTransform: "uppercase",
                          letterSpacing: "0.3px"
                        }}>
                          {region.severity}
                        </span>
                        <span style={{
                          fontSize: "12px",
                          color: "rgba(255,255,255,0.4)"
                        }}>
                          {region.field_label}
                        </span>
                        {region.language !== "en" && (
                          <span style={{
                            padding: "4px 8px",
                            background: "rgba(59, 130, 246, 0.15)",
                            borderRadius: "20px",
                            fontSize: "11px",
                            color: "#60a5fa"
                          }}>
                            {region.language.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "13px",
                        margin: 0,
                        lineHeight: 1.5
                      }}>
                        {region.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Download Button */}
            <button
              style={{
                width: "100%",
                marginTop: "24px",
                padding: "14px",
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                border: "none",
                borderRadius: "12px",
                color: "white",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(59, 130, 246, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
              }}
              onClick={() => alert("📄 Report download ready!")}
            >
              📥 Download Officer Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0a0f" }} />}>
      <ResultsContent />
    </Suspense>
  );
}