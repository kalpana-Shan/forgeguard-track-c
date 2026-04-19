"use client";

import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getSamples } from "@/lib/api";
import { SAMPLE_DOCS as FALLBACK_SAMPLES } from "@/lib/mockData";

export default function UploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [samples, setSamples] = useState<any[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSamples() {
      try {
        const data = await getSamples();
        setSamples(data);
      } catch (error) {
        console.error("Failed to fetch samples:", error);
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
    const reader = new FileReader();
    reader.onload = () => {
      sessionStorage.setItem("uploadedFileData", reader.result as string);
      sessionStorage.setItem("uploadedFileName", file.name);
      sessionStorage.setItem("uploadedFileType", file.type);
      router.push("/results");
    };
    reader.readAsDataURL(file);
  }, [router]);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png"], "application/pdf": [".pdf"] },
    maxFiles: 1,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false)
  });

  const loadSample = (sampleId: string) => router.push(`/results?mock=${sampleId}`);

  const getVerdictStyle = (verdict: string) => {
    if (verdict === "GENUINE") return { 
      bg: "rgba(0, 255, 136, 0.15)", 
      border: "rgba(0, 255, 136, 0.6)", 
      icon: "✓", 
      color: "#00ff88",
      glow: "0 0 30px rgba(0, 255, 136, 0.5)"
    };
    if (verdict === "HIGH_TAMPER_RISK") return { 
      bg: "rgba(255, 56, 96, 0.15)", 
      border: "rgba(255, 56, 96, 0.6)", 
      icon: "⚠", 
      color: "#ff3860",
      glow: "0 0 30px rgba(255, 56, 96, 0.5)"
    };
    return { 
      bg: "rgba(255, 184, 0, 0.15)", 
      border: "rgba(255, 184, 0, 0.6)", 
      icon: "🔍", 
      color: "#ffb800",
      glow: "0 0 30px rgba(255, 184, 0, 0.5)"
    };
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0b0f] p-6">
      {/* Neon Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(#00ff8840 1px, transparent 1px), linear-gradient(90deg, #00ff8840 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      {/* Animated Neon Orbs */}
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] animate-pulse rounded-full bg-[#00ff88] opacity-10 blur-[150px]" />
      <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] animate-pulse rounded-full bg-[#ff3860] opacity-10 blur-[150px]" />
      <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-[#7b2ff7] opacity-10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        
        {/* Header with Neon Glow */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-10 text-center"
        >
          <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/40 bg-black/40 px-5 py-2 backdrop-blur-xl"
               style={{ boxShadow: '0 0 40px rgba(0, 255, 136, 0.2)' }}>
            <span className="text-2xl drop-shadow-[0_0_10px_#00ff88]">🛡️</span>
            <span className="text-sm font-bold uppercase tracking-wider text-[#00ff88] drop-shadow-[0_0_10px_#00ff88]">
              ForgeGuard
            </span>
          </div>
          <h1 className="text-6xl font-black md:text-7xl">
            <span className="bg-gradient-to-r from-[#00ff88] via-[#00d4ff] to-[#7b2ff7] bg-clip-text text-transparent drop-shadow-[0_0_30px_#00ff8840]">
              Detect Forgery
            </span>
            <br />
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Instantly
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
            AI-powered document analysis with <span className="text-[#00ff88] drop-shadow-[0_0_10px_#00ff88]">explainable evidence</span>
          </p>
        </motion.div>

        {/* Upload Zone - Neon Glass */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12"
        >
          <div
            {...getRootProps()}
            className={`group relative cursor-pointer overflow-hidden rounded-3xl border-2 p-12 text-center transition-all duration-500 ${
              isDragging
                ? "border-[#00ff88] bg-[#00ff88]/10 backdrop-blur-xl"
                : "border-gray-800 bg-black/40 backdrop-blur-md hover:border-[#00ff88]/50"
            }`}
            style={isDragging ? { boxShadow: '0 0 60px rgba(0, 255, 136, 0.3)' } : {}}
          >
            {/* Neon scan line effect */}
            <div className="absolute inset-0 h-px w-full animate-scan bg-gradient-to-r from-transparent via-[#00ff88] to-transparent opacity-0 group-hover:opacity-100" />
            
            <input {...getInputProps()} />
            <motion.div
              animate={{ scale: isDragging ? 1.05 : 1 }}
              className="relative z-10 flex flex-col items-center"
            >
              <div className="mb-6 rounded-2xl border border-[#00ff88]/30 bg-black/40 p-6 backdrop-blur-sm"
                   style={{ boxShadow: '0 0 40px rgba(0, 255, 136, 0.1)' }}>
                <span className="text-7xl drop-shadow-[0_0_20px_#00ff88]">📄</span>
              </div>
              <h3 className="text-2xl font-bold text-white">
                {isDragging ? "Drop your document" : "Drag & drop your document"}
              </h3>
              <p className="mt-2 text-gray-400">or</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); open(); }}
                className="relative mt-4 overflow-hidden rounded-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] px-8 py-3 font-bold text-black shadow-[0_0_30px_#00ff88] transition-all hover:scale-105 hover:shadow-[0_0_50px_#00ff88]"
              >
                Browse Files
              </button>
              <p className="mt-4 text-xs text-gray-500">Supports JPG, PNG, PDF (Max 10MB)</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Neon Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="my-10 flex items-center gap-4"
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#00ff88]/50 to-transparent" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#00ff88] drop-shadow-[0_0_10px_#00ff88]">
            Or explore a demo
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#00ff88]/50 to-transparent" />
        </motion.div>

        {/* Sample Cards - Neon Glass Grid */}
        {loadingSamples ? (
          <div className="flex justify-center py-10">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-800 border-t-[#00ff88] shadow-[0_0_20px_#00ff88]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {samples.map((sample, index) => {
              const verdictStyle = getVerdictStyle(sample.verdict_hint);
              
              return (
                <motion.div
                  key={sample.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  onMouseEnter={() => setHoveredCard(sample.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-800 bg-black/40 p-5 backdrop-blur-md transition-all duration-300 hover:border-[#00ff88]/50"
                  style={hoveredCard === sample.id ? { boxShadow: `0 0 40px ${verdictStyle.color}30` } : {}}
                  onClick={() => loadSample(sample.id)}
                >
                  {/* Neon border glow on hover */}
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                       style={{ boxShadow: `inset 0 0 30px ${verdictStyle.color}20` }} />

                  <div className="relative z-10">
                    <div className="mb-4 flex items-start justify-between">
                      <div 
                        className="rounded-xl p-2.5 backdrop-blur-sm"
                        style={{ 
                          background: verdictStyle.bg, 
                          border: `1.5px solid ${verdictStyle.border}`,
                          boxShadow: verdictStyle.glow
                        }}
                      >
                        <span className="text-xl font-bold drop-shadow-[0_0_10px_currentColor]" style={{ color: verdictStyle.color }}>
                          {verdictStyle.icon}
                        </span>
                      </div>
                      <span
                        className={`rounded-lg border px-2.5 py-1 text-xs font-bold uppercase backdrop-blur-sm ${
                          sample.format_badge === "PDF"
                            ? "border-[#ff3860]/50 bg-[#ff3860]/20 text-[#ff3860]"
                            : "border-[#00d4ff]/50 bg-[#00d4ff]/20 text-[#00d4ff]"
                        }`}
                        style={sample.format_badge === "PDF" 
                          ? { boxShadow: '0 0 15px rgba(255, 56, 96, 0.3)' }
                          : { boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)' }
                        }
                      >
                        {sample.format_badge}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-white">{sample.label}</h4>
                    <p className="mt-1 text-sm text-gray-400">{sample.description}</p>
                    <div className="mt-4 flex items-center text-sm font-bold text-[#00ff88] drop-shadow-[0_0_10px_#00ff88]">
                      Load Demo
                      <motion.span
                        animate={{ x: hoveredCard === sample.id ? 5 : 0 }}
                        className="ml-1"
                      >
                        →
                      </motion.span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center text-xs text-gray-600"
        >
          ForgeGuard • AI-Powered Document Verification
        </motion.p>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(500px); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </main>
  );
}