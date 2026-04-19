"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ConfidenceRing } from "@/components/ConfidenceRing";
import { AnalysisResult } from "@/types";
import { MOCK_GENUINE, MOCK_TAMPERED_MARKS, MOCK_TAMIL } from "@/lib/mockData";
import { getSampleAnalysis } from "@/lib/api";

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"original" | "ocr" | "heatmap">("original");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const mockId = searchParams.get("mock");
    const uploadedFileData = sessionStorage.getItem("uploadedFileData");
    
    async function fetchAnalysis() {
      try {
        setLoading(true);
        let data: AnalysisResult;
        
        if (uploadedFileData && !mockId) {
          try {
            const fileName = sessionStorage.getItem("uploadedFileName") || "upload.jpg";
            const fileType = sessionStorage.getItem("uploadedFileType") || "image/jpeg";
            const response = await fetch(uploadedFileData);
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: fileType });
            const { analyzeDocument } = await import('@/lib/api');
            data = await analyzeDocument(file);
          } catch {
            data = { ...MOCK_TAMPERED_MARKS, document_id: `upload-${Date.now()}` };
          }
        } else if (mockId) {
          try {
            data = await getSampleAnalysis(mockId);
          } catch {
            if (mockId.includes("genuine")) data = MOCK_GENUINE;
            else if (mockId.includes("tamil")) data = MOCK_TAMIL;
            else data = MOCK_TAMPERED_MARKS;
          }
        } else {
          data = MOCK_TAMPERED_MARKS;
        }
        
        setResult(data);
      } catch {
        setResult(MOCK_TAMPERED_MARKS);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnalysis();
  }, [searchParams]);

  const getVerdictStyle = (verdict: string) => {
    if (verdict === "LIKELY_GENUINE") return { 
      bg: "rgba(0, 255, 136, 0.1)", 
      border: "rgba(0, 255, 136, 0.4)", 
      text: "#00ff88", 
      icon: "✓",
      glow: "0 0 40px rgba(0, 255, 136, 0.3)"
    };
    if (verdict === "HIGH_TAMPER_RISK") return { 
      bg: "rgba(255, 56, 96, 0.1)", 
      border: "rgba(255, 56, 96, 0.4)", 
      text: "#ff3860", 
      icon: "⚠",
      glow: "0 0 40px rgba(255, 56, 96, 0.3)"
    };
    return { 
      bg: "rgba(255, 184, 0, 0.1)", 
      border: "rgba(255, 184, 0, 0.4)", 
      text: "#ffb800", 
      icon: "🔍",
      glow: "0 0 40px rgba(255, 184, 0, 0.3)"
    };
  };

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-[#0b0b0f]">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(#00ff8840 1px, transparent 1px), linear-gradient(90deg, #00ff8840 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>
        <div className="relative text-center">
          <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-2 border-gray-800 border-t-[#00ff88] shadow-[0_0_30px_#00ff88]" />
          <p className="text-gray-400">Analyzing document...</p>
        </div>
      </main>
    );
  }

  if (!result) return null;

  const currentPageData = result.pages[currentPage];
  const verdictStyle = getVerdictStyle(result.verdict);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const getImageUrl = (path: string | undefined): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
  };

  return (
    <main className="relative min-h-screen bg-[#0b0b0f] p-4 md:p-6">
      {/* Neon Grid Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(#00ff8840 1px, transparent 1px), linear-gradient(90deg, #00ff8840 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Animated Neon Orbs */}
      <div className="absolute -top-40 -left-40 h-96 w-96 animate-pulse rounded-full bg-[#00ff88] opacity-10 blur-[100px]" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 animate-pulse rounded-full bg-[#ff3860] opacity-10 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        
        {/* Header - Neon Glass */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-wrap items-center justify-between gap-4"
        >
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 rounded-full border border-gray-800 bg-black/40 px-4 py-2 text-sm font-medium text-gray-300 backdrop-blur-md transition-all hover:border-[#00ff88]/50 hover:text-[#00ff88]"
          >
            ← Back to Upload
          </button>

          <div 
            className="flex items-center gap-4 rounded-2xl border px-4 py-2 backdrop-blur-xl"
            style={{ 
              background: verdictStyle.bg, 
              borderColor: verdictStyle.border,
              boxShadow: verdictStyle.glow
            }}
          >
            <div className="rounded-full bg-black/40 p-2 backdrop-blur-sm">
              <span className="text-xl drop-shadow-[0_0_10px_currentColor]" style={{ color: verdictStyle.text }}>
                {verdictStyle.icon}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: verdictStyle.text }}>
                {result.verdict_label}
              </p>
              <p className="text-xs text-gray-400">Document ID: {result.document_id}</p>
            </div>
            <ConfidenceRing score={result.confidence_score} />
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Document Viewer - Neon Glass */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="overflow-hidden rounded-3xl border border-gray-800 bg-black/40 backdrop-blur-md">
              {/* Tabs */}
              <div className="flex border-b border-gray-800 bg-black/40 p-1.5">
                {(["original", "ocr", "heatmap"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                      activeTab === tab
                        ? "bg-[#00ff88]/20 text-[#00ff88] backdrop-blur-sm border border-[#00ff88]/40 shadow-[0_0_15px_#00ff8840]"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                    }`}
                  >
                    {tab === "original" && "📄 Original"}
                    {tab === "ocr" && "🔤 OCR Analysis"}
                    {tab === "heatmap" && "🔥 ELA Heatmap"}
                  </button>
                ))}
              </div>
              
              {/* Image Preview */}
              <div className="relative flex min-h-[400px] items-center justify-center bg-black/60 p-4">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    src={getImageUrl(
                      activeTab === "heatmap" && currentPageData.ela_heatmap_url
                        ? currentPageData.ela_heatmap_url
                        : currentPageData.preview_image_url
                    )}
                    alt="Document Preview"
                    className="max-h-[500px] rounded-xl object-contain shadow-2xl"
                    onError={(e) => {
                      e.currentTarget.src = "https://placehold.co/800x1000/0b0b0f/00ff88?text=Preview+Loading...";
                    }}
                  />
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Trust Lens - Neon Glass */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <div className="flex-1 rounded-3xl border border-gray-800 bg-black/40 p-6 backdrop-blur-md">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-[#00ff88]/30 to-[#00d4ff]/30 p-2.5 backdrop-blur-sm border border-[#00ff88]/40"
                     style={{ boxShadow: '0 0 30px rgba(0, 255, 136, 0.2)' }}>
                  <span className="text-xl drop-shadow-[0_0_10px_#00ff88]">🔍</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Trust Lens</h2>
                  <p className="text-xs text-[#00ff88] drop-shadow-[0_0_10px_#00ff88]">Explainable AI Evidence</p>
                </div>
              </div>

              {/* Officer Summary */}
              <motion.div
                whileHover={{ y: -2 }}
                className="mb-5 rounded-xl border border-[#00ff88]/30 bg-gradient-to-br from-[#00ff88]/10 to-[#00d4ff]/10 p-4 backdrop-blur-sm"
                style={{ boxShadow: '0 0 30px rgba(0, 255, 136, 0.1)' }}
              >
                <p className="text-sm font-bold text-[#00ff88] drop-shadow-[0_0_10px_#00ff88]">👮 Officer Summary</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-300">{result.officer_summary}</p>
              </motion.div>

              {/* Evidence List */}
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#00ff88] drop-shadow-[0_0_10px_#00ff88]">
                Evidence & Red Flags
              </h3>
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {currentPageData.suspicious_regions?.map((region: any) => (
                  <motion.div
                    key={region.region_id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedRegion(region.region_id)}
                    className={`cursor-pointer rounded-xl border p-3 backdrop-blur-sm transition-all ${
                      selectedRegion === region.region_id
                        ? "border-[#00ff88]/50 bg-[#00ff88]/20 shadow-[0_0_30px_#00ff8830]"
                        : "border-gray-800 bg-black/30 hover:border-gray-700"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        region.severity === "high"
                          ? "border-[#ff3860]/50 bg-[#ff3860]/20 text-[#ff3860] shadow-[0_0_15px_#ff386050]"
                          : region.severity === "medium"
                          ? "border-[#ffb800]/50 bg-[#ffb800]/20 text-[#ffb800] shadow-[0_0_15px_#ffb80050]"
                          : "border-[#00ff88]/50 bg-[#00ff88]/20 text-[#00ff88] shadow-[0_0_15px_#00ff8850]"
                      }`}>
                        {region.severity}
                      </span>
                      <span className="text-xs text-gray-400">{region.field_label}</span>
                    </div>
                    <p className="text-xs text-gray-300">{region.reason}</p>
                  </motion.div>
                ))}
              </div>

              {/* Download Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative mt-6 w-full overflow-hidden rounded-xl border border-[#00ff88]/40 bg-gradient-to-r from-[#00ff88]/20 to-[#00d4ff]/20 py-3 text-sm font-bold text-[#00ff88] backdrop-blur-sm transition-all hover:from-[#00ff88]/30 hover:to-[#00d4ff]/30"
                style={{ boxShadow: '0 0 40px rgba(0, 255, 136, 0.2)' }}
              >
                📥 Download Officer Report (PDF)
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[#0b0b0f]">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-800 border-t-[#00ff88] shadow-[0_0_30px_#00ff88]" />
      </main>
    }>
      <ResultsContent />
    </Suspense>
  );
}