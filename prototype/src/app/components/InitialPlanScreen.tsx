import { motion } from "motion/react";
import { ChevronRight, Droplets, Dumbbell, TrendingDown, Zap } from "lucide-react";

interface InitialPlanScreenProps {
  onContinue: () => void;
}

const tabs = ["Nutrition", "Water", "Exercise", "Forecast"];

export function InitialPlanScreen({ onContinue }: InitialPlanScreenProps) {
  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      {/* Top */}
      <div
        className="px-5 pt-14 pb-6 flex flex-col items-center text-center"
        style={{ background: "linear-gradient(160deg,#1A1A2E 0%,#0F172A 60%,var(--background) 100%)" }}
      >
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.7 }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto" style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", boxShadow: "0 8px 32px rgba(245,158,11,0.4)" }}>
            <Zap size={32} style={{ color: "#fff" }} />
          </div>
        </motion.div>
        <motion.h1 initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ color: "#F1F5F9", fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Your AI Plan is Ready! 🎉
        </motion.h1>
        <motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ color: "#94A3B8", fontSize: "0.875rem", lineHeight: 1.6 }}>
          Personalized for Alex Johnson · Goal: Lose Weight · Moderately Active
        </motion.p>
      </div>

      <div className="px-5 pb-10">
        {/* Nutrition summary */}
        <div className="p-4 rounded-3xl mb-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
              <span style={{ fontSize: "1rem" }}>🍽️</span>
            </div>
            <h3 style={{ color: "var(--foreground)", fontSize: "0.95rem", fontWeight: 800 }}>Daily Nutrition Plan</h3>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Calories", value: "1,650", unit: "kcal/day", color: "#F59E0B" },
              { label: "Protein", value: "125g", unit: "per day", color: "#10B981" },
              { label: "Carbohydrates", value: "185g", unit: "per day", color: "#3B82F6" },
              { label: "Fat", value: "55g", unit: "per day", color: "#8B5CF6" },
              { label: "Fiber", value: "28g", unit: "per day", color: "#06B6D4" },
              { label: "Calorie Deficit", value: "−327", unit: "kcal/day", color: "#EF4444" },
            ].map((n) => (
              <div key={n.label} className="p-3 rounded-2xl" style={{ background: "var(--muted)" }}>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", fontWeight: 600 }}>{n.label}</p>
                <p style={{ color: n.color, fontSize: "1.1rem", fontWeight: 800, lineHeight: 1, marginTop: 3 }}>{n.value}</p>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.65rem", marginTop: 1 }}>{n.unit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sample meal plan */}
        <div className="p-4 rounded-3xl mb-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 style={{ color: "var(--foreground)", fontSize: "0.95rem", fontWeight: 800, marginBottom: 12 }}>📅 Sample Day Plan</h3>
          {[
            { meal: "Breakfast", time: "8:00 AM", cals: 380, desc: "Oatmeal, berries, almond milk + coffee", emoji: "🥣" },
            { meal: "Lunch", time: "12:30 PM", cals: 520, desc: "Grilled chicken salad + sourdough", emoji: "🥗" },
            { meal: "Snack", time: "3:30 PM", cals: 180, desc: "Greek yogurt with honey", emoji: "🫙" },
            { meal: "Dinner", time: "7:00 PM", cals: 570, desc: "Salmon, quinoa, steamed broccoli", emoji: "🐟" },
          ].map((m) => (
            <div key={m.meal} className="flex items-center gap-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "1.4rem" }}>{m.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 700 }}>{m.meal}</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{m.time}</span>
                </div>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{m.desc}</p>
              </div>
              <span style={{ color: "#F59E0B", fontSize: "0.82rem", fontWeight: 700 }}>{m.cals} kcal</span>
            </div>
          ))}
        </div>

        {/* Water plan */}
        <div className="p-4 rounded-3xl mb-4 flex items-center gap-4" style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.2)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.15)" }}>
            <Droplets size={24} style={{ color: "#06B6D4" }} />
          </div>
          <div>
            <h3 style={{ color: "var(--foreground)", fontSize: "0.95rem", fontWeight: 800 }}>Daily Hydration Goal</h3>
            <p style={{ color: "#06B6D4", fontSize: "1.3rem", fontWeight: 900, lineHeight: 1, marginTop: 2 }}>2.5L / day</p>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginTop: 2 }}>≈ 10 glasses · Start with 500ml on waking</p>
          </div>
        </div>

        {/* Exercise plan */}
        <div className="p-4 rounded-3xl mb-4" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell size={18} style={{ color: "#10B981" }} />
            <h3 style={{ color: "var(--foreground)", fontSize: "0.95rem", fontWeight: 800 }}>Weekly Exercise Recommendation</h3>
          </div>
          {[
            { day: "Mon / Wed / Fri", type: "Strength Training", dur: "45 min", burn: "~320 kcal" },
            { day: "Tue / Thu", type: "Cardio (brisk walk / cycle)", dur: "30 min", burn: "~200 kcal" },
            { day: "Sat", type: "Active rest (yoga / stretch)", dur: "30 min", burn: "~80 kcal" },
            { day: "Sun", type: "Full rest", dur: "—", burn: "—" },
          ].map((e) => (
            <div key={e.day} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(16,185,129,0.1)" }}>
              <div>
                <p style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 700 }}>{e.day}</p>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{e.type}</p>
              </div>
              <div className="text-right">
                <p style={{ color: "#10B981", fontSize: "0.78rem", fontWeight: 700 }}>{e.dur}</p>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.65rem" }}>{e.burn}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Goal forecast */}
        <div className="p-4 rounded-3xl mb-6" style={{ background: "linear-gradient(135deg,#1A1A2E,#16213E)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={18} style={{ color: "#F59E0B" }} />
            <h3 style={{ color: "#F1F5F9", fontSize: "0.95rem", fontWeight: 800 }}>Goal Forecast</h3>
          </div>
          {[
            { milestone: "−1 kg", date: "Jun 24, 2026", note: "2 weeks in", color: "#F59E0B" },
            { milestone: "−2.5 kg", date: "Jul 15, 2026", note: "5 weeks in", color: "#10B981" },
            { milestone: "Goal: 65 kg", date: "Sep 2, 2026", note: "12 weeks · target", color: "#3B82F6" },
          ].map((f) => (
            <div key={f.milestone} className="flex items-center gap-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${f.color}20` }}>
                <div className="w-3 h-3 rounded-full" style={{ background: f.color }} />
              </div>
              <div className="flex-1">
                <p style={{ color: "#F1F5F9", fontSize: "0.875rem", fontWeight: 700 }}>{f.milestone}</p>
                <p style={{ color: "#64748B", fontSize: "0.72rem" }}>{f.note}</p>
              </div>
              <span style={{ color: f.color, fontSize: "0.78rem", fontWeight: 700 }}>{f.date}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-2xl text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", fontSize: "1rem", fontWeight: 800, boxShadow: "0 8px 32px rgba(245,158,11,0.4)" }}
        >
          Start My Journey 🚀 <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
