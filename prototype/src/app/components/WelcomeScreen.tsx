import { motion } from "motion/react";
import { Zap, Apple } from "lucide-react";

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const features = [
  { icon: "🧠", label: "AI-Personalised Meal Plans" },
  { icon: "📊", label: "Real-Time Nutrition Tracking" },
  { icon: "🏆", label: "Gamified Progress & Streaks" },
];

export function WelcomeScreen({ onGetStarted, onLogin }: WelcomeScreenProps) {
  return (
    <div className="relative h-full flex flex-col overflow-hidden bg-[#0F172A]">
      {/* Gradient orbs */}
      <div className="absolute top-[-80px] left-[-60px] w-[280px] h-[280px] rounded-full bg-[#F59E0B] opacity-20 blur-[80px]" />
      <div className="absolute bottom-[200px] right-[-80px] w-[240px] h-[240px] rounded-full bg-[#F59E0B] opacity-15 blur-[60px]" />

      {/* Logo + headline */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          className="w-20 h-20 rounded-[22px] flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
        >
          <Zap size={40} className="text-white fill-white" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-white text-center mb-3"
          style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}
        >
          Diet<span style={{ color: "#F59E0B" }}>Buddy</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="text-center text-[#94A3B8] mb-10"
          style={{ fontSize: "1rem", fontWeight: 400, lineHeight: 1.6 }}
        >
          Your AI-powered nutrition coach.{"\n"}Smarter eating, better results.
        </motion.p>

        {/* ── CTA buttons (moved up, right below headline) ── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="w-full flex flex-col gap-3 mb-10"
        >
          <button
            onClick={onGetStarted}
            className="w-full py-4 rounded-2xl text-white transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              fontSize: "1rem",
              fontWeight: 700,
              letterSpacing: "0.01em",
              boxShadow: "0 8px 32px rgba(245, 158, 11, 0.4)",
            }}
          >
            Get Started — It's Free
          </button>
          <button
            onClick={onLogin}
            className="w-full py-4 rounded-2xl transition-all active:scale-[0.98]"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#CBD5E1",
              fontSize: "1rem",
              fontWeight: 500,
            }}
          >
            I already have an account
          </button>
        </motion.div>

        {/* ── Feature bullet points ── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="w-full flex flex-col gap-3"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ x: -12, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.55 + i * 0.08, duration: 0.35 }}
              className="flex items-center gap-3"
            >
              {/* Bullet dot */}
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "#F59E0B" }}
              />
              {/* Icon */}
              <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{f.icon}</span>
              {/* Label */}
              <span style={{ color: "#CBD5E1", fontSize: "0.9rem", fontWeight: 500 }}>
                {f.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom fine print */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85, duration: 0.4 }}
        className="text-center pb-8 px-8"
        style={{ color: "#334155", fontSize: "0.7rem" }}
      >
        No credit card required · Cancel anytime
      </motion.p>
    </div>
  );
}
