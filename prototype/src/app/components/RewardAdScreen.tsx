import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Volume2, VolumeX, Maximize2, Zap } from "lucide-react";

interface RewardAdScreenProps {
  onComplete: () => void;     // called after full watch — reward granted
  onSkip?: () => void;        // called if user skips early — no reward
  reward?: string;            // e.g. "Your AI Plan" | "Meal Plan"
  rewardXP?: number;
}

const AD_DURATION = 30;       // seconds
const SKIP_AFTER   = 5;       // seconds until skip button appears

// Fake ad content slots — rotates pseudo-randomly
const AD_SLOTS = [
  {
    brand: "NutriTrack Pro",
    tagline: "The #1 nutrition database — 14M+ foods",
    bg: ["#0F172A", "#1E3A5F"],
    accent: "#3B82F6",
    emoji: "🥦",
    cta: "Try Free",
  },
  {
    brand: "FitCoach AI",
    tagline: "Personalised workouts that adapt to you",
    bg: ["#1A0F2E", "#2D1A4E"],
    accent: "#8B5CF6",
    emoji: "💪",
    cta: "Start Today",
  },
  {
    brand: "Whey Gold Standard",
    tagline: "25g protein per serving · 30 flavours",
    bg: ["#0F1F0F", "#1A3A1A"],
    accent: "#10B981",
    emoji: "🥤",
    cta: "Shop Now",
  },
  {
    brand: "Withings Body+",
    tagline: "Smart scale that knows your body",
    bg: ["#1F1209", "#3A2010"],
    accent: "#F59E0B",
    emoji: "⚖️",
    cta: "Learn More",
  },
];

export function RewardAdScreen({ onComplete, onSkip, reward = "Your Content", rewardXP = 50 }: RewardAdScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [adIdx] = useState(() => Math.floor(Math.random() * AD_SLOTS.length));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ad = AD_SLOTS[adIdx];
  const remaining = Math.max(0, AD_DURATION - elapsed);
  const progress = Math.min(elapsed / AD_DURATION, 1);
  const canSkip = elapsed >= SKIP_AFTER;
  const isComplete = elapsed >= AD_DURATION;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e >= AD_DURATION) {
          clearInterval(intervalRef.current!);
          return AD_DURATION;
        }
        return e + 0.25;
      });
    }, 250);
    return () => clearInterval(intervalRef.current!);
  }, []);

  // Auto-trigger reward when ad completes
  useEffect(() => {
    if (isComplete && !rewarded) {
      setRewarded(true);
    }
  }, [isComplete, rewarded]);

  const handleSkip = () => {
    setSkipped(true);
    clearInterval(intervalRef.current!);
    onSkip?.();
    onComplete();
  };

  const handleClaim = () => {
    onComplete();
  };

  // ── Reward claimed screen ────────────────────────────────────────────────
  if (rewarded) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6" style={{ background: "#0F172A" }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6, bounce: 0.45 }}
          className="flex flex-col items-center text-center"
        >
          {/* Burst ring */}
          <div className="relative flex items-center justify-center mb-6">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-6 rounded-full"
                style={{ background: "#F59E0B", transformOrigin: "50% 48px", rotate: `${i * 45}deg` }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: [0, 1, 0] }}
                transition={{ delay: 0.2 + i * 0.04, duration: 0.6 }}
              />
            ))}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center z-10"
              style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", boxShadow: "0 0 40px rgba(245,158,11,0.5)" }}
            >
              <Zap size={36} style={{ color: "#fff" }} />
            </div>
          </div>

          <motion.h2
            initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}
            style={{ color: "#F1F5F9", fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 6 }}
          >
            Reward Unlocked!
          </motion.h2>

          <motion.div
            initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full mb-3"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
          >
            <span style={{ color: "#F59E0B", fontSize: "1.1rem" }}>+{rewardXP} XP</span>
            <span style={{ color: "#64748B", fontSize: "0.82rem" }}>earned for watching</span>
          </motion.div>

          <motion.p
            initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.52 }}
            style={{ color: "#94A3B8", fontSize: "0.875rem", marginBottom: 32 }}
          >
            {reward} is now unlocked
          </motion.p>

          <motion.button
            initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
            onClick={handleClaim}
            className="w-full py-4 rounded-2xl text-white transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", fontSize: "1rem", fontWeight: 800, boxShadow: "0 8px 32px rgba(245,158,11,0.4)", maxWidth: 320 }}
          >
            Continue to {reward} →
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Ad player ────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col" style={{ background: "#000" }}>

      {/* Video area */}
      <div
        className="relative flex-1 flex flex-col items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${ad.bg[0]} 0%, ${ad.bg[1]} 100%)` }}
      >
        {/* Simulated video content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          {/* Animated product blob */}
          <motion.div
            animate={{ y: [-8, 8, -8] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6"
            style={{
              background: `${ad.accent}20`,
              border: `2px solid ${ad.accent}40`,
              boxShadow: `0 0 60px ${ad.accent}30`,
              fontSize: "4rem",
            }}
          >
            {ad.emoji}
          </motion.div>

          <motion.p
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ color: "#fff", fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.02em", textAlign: "center", marginBottom: 8 }}
          >
            {ad.brand}
          </motion.p>
          <motion.p
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ color: "#94A3B8", fontSize: "0.9rem", textAlign: "center", maxWidth: 260, lineHeight: 1.5 }}
          >
            {ad.tagline}
          </motion.p>

          <motion.button
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
            className="mt-8 px-6 py-2.5 rounded-full"
            style={{ background: ad.accent, color: "#fff", fontSize: "0.875rem", fontWeight: 800 }}
          >
            {ad.cta}
          </motion.button>
        </motion.div>

        {/* Scanlines overlay for "video" feel */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
          }}
        />

        {/* Top HUD */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4">
          {/* Ad label */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#F59E0B" }} />
            <span style={{ color: "#fff", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em" }}>AD</span>
          </div>

          {/* Mute + fullscreen (decorative) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted(!muted)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            >
              {muted
                ? <VolumeX size={14} style={{ color: "#fff" }} />
                : <Volume2 size={14} style={{ color: "#fff" }} />}
            </button>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            >
              <Maximize2 size={13} style={{ color: "#fff" }} />
            </button>
          </div>
        </div>

        {/* Skip button (appears after SKIP_AFTER seconds) */}
        <div className="absolute bottom-4 right-4">
          <AnimatePresence>
            {canSkip ? (
              <motion.button
                key="skip-btn"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                onClick={handleSkip}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                style={{
                  background: "rgba(0,0,0,0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                }}
              >
                Skip ad <X size={12} />
              </motion.button>
            ) : (
              <motion.div
                key="skip-countdown"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-3 py-2 rounded-xl flex items-center gap-1.5"
                style={{
                  background: "rgba(0,0,0,0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span style={{ color: "#94A3B8", fontSize: "0.75rem" }}>Skip in</span>
                <span style={{ color: "#fff", fontSize: "0.82rem", fontWeight: 800, minWidth: 14, textAlign: "center" }}>
                  {Math.ceil(SKIP_AFTER - elapsed)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ background: "#0A0A0A", paddingBottom: 8 }}>
        {/* Progress bar */}
        <div className="relative h-1" style={{ background: "#1E293B" }}>
          <motion.div
            className="h-full"
            style={{ background: `linear-gradient(90deg, ${ad.accent}, #F59E0B)` }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.25, ease: "linear" }}
          />
        </div>

        {/* Reward strip */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.15)" }}
            >
              <Zap size={16} style={{ color: "#F59E0B" }} />
            </div>
            <div>
              <p style={{ color: "#94A3B8", fontSize: "0.65rem", fontWeight: 600 }}>WATCH TO UNLOCK</p>
              <p style={{ color: "#F1F5F9", fontSize: "0.82rem", fontWeight: 700 }}>{reward}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B", fontSize: "0.72rem", fontWeight: 800 }}>
              +{rewardXP} XP
            </span>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#1E293B", border: "1.5px solid #334155" }}
            >
              <span style={{ color: "#F59E0B", fontSize: "0.9rem", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                {remaining < 10 ? `0:0${Math.ceil(remaining)}` : `0:${Math.ceil(remaining)}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
