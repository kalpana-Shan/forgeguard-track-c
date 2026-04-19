// components/ConfidenceRing.tsx
"use client";

import { motion } from "framer-motion";

interface ConfidenceRingProps {
  score: number; // 0 to 1
}

export const ConfidenceRing = ({ score }: ConfidenceRingProps) => {
  const percentage = Math.round(score * 100);
  
  const getColor = () => {
    if (score < 0.35) return { main: "#00ff88", glow: "rgba(0, 255, 136, 0.4)" };
    if (score < 0.65) return { main: "#ffb800", glow: "rgba(255, 184, 0, 0.4)" };
    return { main: "#ff3860", glow: "rgba(255, 56, 96, 0.4)" };
  };
  
  const colors = getColor();
  const circumference = 2 * Math.PI * 45;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="relative h-28 w-28"
    >
      {/* Neon Glow Effect */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute -inset-4 rounded-full blur-xl"
        style={{ background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)` }}
      />

      <svg width="112" height="112" viewBox="0 0 120 120" className="relative z-10">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.main} />
            <stop offset="100%" stopColor={`${colors.main}cc`} />
          </linearGradient>
        </defs>

        {/* Background Track */}
        <circle
          cx="60" cy="60" r="45"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="6"
        />

        {/* Animated Progress Circle */}
        <motion.circle
          cx="60" cy="60" r="45"
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (percentage / 100) * circumference }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          transform="rotate(-90 60 60)"
          style={{ filter: `drop-shadow(0 0 10px ${colors.main})` }}
        />
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
        <motion.span
          key={percentage}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white drop-shadow-[0_0_10px_currentColor]"
          style={{ color: colors.main }}
        >
          {percentage}
        </motion.span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          confidence
        </span>
      </div>
    </motion.div>
  );
};