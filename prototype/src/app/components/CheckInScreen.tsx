import { useState } from "react";
import { motion } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface CheckInScreenProps {
  onClose: () => void;
}

const moods = [
  { emoji: "😄", label: "Great" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😔", label: "Low" },
  { emoji: "😫", label: "Tough" },
];

const energyLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const questions = [
  { id: "mood", label: "How are you feeling today?" },
  { id: "energy", label: "Energy level (1–10)?" },
  { id: "sleep", label: "How many hours of sleep?" },
  { id: "hunger", label: "Hunger level today?" },
  { id: "weight", label: "Today's weight (optional)" },
];

export function CheckInScreen({ onClose }: CheckInScreenProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ mood: "Good", energy: 7, sleep: "7", hunger: "Normal", weight: "68.0" });
  const [done, setDone] = useState(false);

  const q = questions[step];

  const next = () => {
    if (step < questions.length - 1) setStep(step + 1);
    else setDone(true);
  };

  const back = () => { if (step > 0) setStep(step - 1); };

  const aiMessage = () => {
    const m = answers.mood;
    if (m === "Great" || m === "Good") return `Awesome! A ${m.toLowerCase()} mood with ${answers.energy}/10 energy — you're set up for a great day. Let's keep that momentum!`;
    return `Thanks for being honest. Energy at ${answers.energy}/10 is manageable — I'll adjust your meal timing suggestions to help boost your afternoon.`;
  };

  if (done) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 bg-background">
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.6 }} className="text-center">
          <div className="text-7xl mb-6">🎉</div>
          <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>Check-in complete!</h2>
          <div className="p-4 rounded-2xl mb-6 text-left" style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.03))", border: "1px solid rgba(245,158,11,0.2)" }}>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>🤖 Aria says</p>
            <p style={{ color: "var(--foreground)", fontSize: "0.875rem", lineHeight: 1.6 }}>{aiMessage()}</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {[
              { label: "Mood", val: answers.mood },
              { label: "Energy", val: `${answers.energy}/10` },
              { label: "Sleep", val: `${answers.sleep}h` },
              { label: "Weight", val: `${answers.weight} kg` },
            ].map((a) => (
              <div key={a.label} className="py-3 px-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", fontWeight: 600 }}>{a.label}</p>
                <p style={{ color: "#F59E0B", fontSize: "1rem", fontWeight: 700, marginTop: 2 }}>{a.val}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 justify-center mb-6">
            <span style={{ color: "#F59E0B", fontSize: "1rem" }}>🔥</span>
            <span style={{ color: "#F59E0B", fontSize: "0.9rem", fontWeight: 700 }}>+20 XP earned!</span>
          </div>
          <button onClick={onClose} className="w-full py-4 rounded-2xl text-white" style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", fontSize: "1rem", fontWeight: 700 }}>
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <button onClick={step > 0 ? back : onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
          {step > 0 ? <ChevronLeft size={18} style={{ color: "var(--muted-foreground)" }} /> : <X size={16} style={{ color: "var(--muted-foreground)" }} />}
        </button>
        <h1 style={{ color: "var(--foreground)", fontSize: "1rem", fontWeight: 700 }}>Daily Check-In</h1>
        <span style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", fontWeight: 500 }}>{step + 1}/{questions.length}</span>
      </div>

      {/* Progress */}
      <div className="px-5 mb-6">
        <div className="h-1.5 rounded-full" style={{ background: "var(--muted)" }}>
          <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#F59E0B,#D97706)" }}
            animate={{ width: `${((step + 1) / questions.length) * 100}%` }} transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="flex-1 px-5">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.22 }}
        >
          <h2 style={{ color: "var(--foreground)", fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>{q.label}</h2>

          {step === 0 && (
            <div className="flex gap-3 mt-6">
              {moods.map((m) => (
                <button
                  key={m.label}
                  onClick={() => setAnswers({ ...answers, mood: m.label })}
                  className="flex-1 flex flex-col items-center py-3.5 rounded-2xl transition-all"
                  style={{
                    background: answers.mood === m.label ? "rgba(245,158,11,0.12)" : "var(--card)",
                    border: `1.5px solid ${answers.mood === m.label ? "#F59E0B" : "var(--border)"}`,
                  }}
                >
                  <span style={{ fontSize: "1.8rem" }}>{m.emoji}</span>
                  <span style={{ color: answers.mood === m.label ? "#F59E0B" : "var(--muted-foreground)", fontSize: "0.68rem", fontWeight: 700, marginTop: 4 }}>{m.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <span style={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>1 — Very low</span>
                <span style={{ color: "#F59E0B", fontSize: "2rem", fontWeight: 900 }}>{answers.energy}</span>
                <span style={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>10 — Peak</span>
              </div>
              <div className="flex gap-1.5">
                {energyLevels.map((n) => (
                  <button
                    key={n}
                    onClick={() => setAnswers({ ...answers, energy: n })}
                    className="flex-1 rounded-xl py-3 transition-all"
                    style={{
                      background: n <= answers.energy ? "#F59E0B" : "var(--muted)",
                      color: n <= answers.energy ? "#fff" : "var(--muted-foreground)",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: 16, lineHeight: 1.5 }}>
                {answers.energy >= 8 ? "🔥 Excellent! High energy days are great for a longer workout." :
                  answers.energy >= 5 ? "👍 Decent energy. Stay hydrated and stick to the plan." :
                    "😴 Low energy. Rest up — I'll suggest lighter meals today."}
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex gap-2 flex-wrap">
                {["5", "6", "7", "8", "9", "10"].map((h) => (
                  <button
                    key={h}
                    onClick={() => setAnswers({ ...answers, sleep: h })}
                    className="px-4 py-3 rounded-2xl min-w-[56px]"
                    style={{
                      background: answers.sleep === h ? "#F59E0B" : "var(--card)",
                      border: `1.5px solid ${answers.sleep === h ? "#F59E0B" : "var(--border)"}`,
                      color: answers.sleep === h ? "#fff" : "var(--foreground)",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                    }}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              <div className="p-3 rounded-2xl" style={{ background: "var(--muted)" }}>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", lineHeight: 1.5 }}>
                  {parseInt(answers.sleep) >= 8 ? "😴 Well rested! Sleep quality directly impacts metabolism and hunger hormones." :
                    parseInt(answers.sleep) >= 6 ? "💤 Decent sleep. Try to get 8h for optimal fat-burning and muscle recovery." :
                      "⚠️ Under-sleeping increases ghrelin (hunger hormone) by up to 24%. Try resting more tonight."}
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-2 mt-6">
              {["Very Low", "Low", "Normal", "High", "Very High"].map((h) => (
                <button
                  key={h}
                  onClick={() => setAnswers({ ...answers, hunger: h })}
                  className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
                  style={{
                    background: answers.hunger === h ? "rgba(245,158,11,0.1)" : "var(--card)",
                    border: `1.5px solid ${answers.hunger === h ? "#F59E0B" : "var(--border)"}`,
                    color: answers.hunger === h ? "#F59E0B" : "var(--foreground)",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  {h}
                  {answers.hunger === h && <span style={{ color: "#F59E0B" }}>✓</span>}
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="mt-6">
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", marginBottom: 16 }}>Logged consistently = better trend data</p>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={answers.weight}
                  onChange={(e) => setAnswers({ ...answers, weight: e.target.value })}
                  className="w-full px-4 py-5 rounded-2xl outline-none pr-16 text-center"
                  style={{ background: "var(--input-background)", border: "1.5px solid var(--border)", color: "var(--foreground)", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)", fontSize: "1rem", fontWeight: 600 }}>kg</span>
              </div>
              <div className="flex items-center gap-2 mt-3 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <span style={{ fontSize: "1rem" }}>📉</span>
                <span style={{ color: "#10B981", fontSize: "0.8rem", fontWeight: 600 }}>Down 0.2kg since yesterday · Trending well!</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <div className="px-5 pb-10 pt-4">
        <button
          onClick={next}
          className="w-full py-4 rounded-2xl text-white flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", fontSize: "1rem", fontWeight: 700, boxShadow: "0 8px 24px rgba(245,158,11,0.35)" }}
        >
          {step === questions.length - 1 ? "Complete Check-In 🎉" : "Continue"}
          {step < questions.length - 1 && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
}
