import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Apple, Zap, ChevronLeft } from "lucide-react";

interface AuthScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function AuthScreen({ onSuccess, onBack }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: "", email: "alex@example.com", password: "••••••••", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = () => {
    if (!form.email) { setError("Email is required"); return; }
    if (!form.password) { setError("Password is required"); return; }
    if (mode === "register" && form.password !== form.confirm) { setError("Passwords don't match"); return; }
    setError("");
    setLoading(true);
    setTimeout(() => { setLoading(false); onSuccess(); }, 1200);
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      {/* Top bar */}
      <div className="px-5 pt-14 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
          <ChevronLeft size={18} style={{ color: "var(--muted-foreground)" }} />
        </button>
        <div className="flex rounded-2xl p-1 flex-1" style={{ background: "var(--muted)" }}>
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className="flex-1 py-2 rounded-xl capitalize transition-all"
              style={{
                background: mode === m ? "var(--card)" : "transparent",
                color: mode === m ? "var(--foreground)" : "var(--muted-foreground)",
                fontSize: "0.85rem", fontWeight: 700,
                boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 pb-8">
        {/* Branding */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
            <Zap size={20} className="text-white fill-white" />
          </div>
          <span style={{ color: "var(--foreground)", fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Diet<span style={{ color: "#F59E0B" }}>Buddy</span>
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === "register" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, marginBottom: 4, letterSpacing: "-0.02em" }}>
              {mode === "login" ? "Welcome back 👋" : "Create your account"}
            </h2>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginBottom: 24 }}>
              {mode === "login" ? "Sign in to continue your journey" : "Start your 7-day free trial today"}
            </p>

            {/* Social auth */}
            <div className="flex gap-3 mb-5">
              <button
                onClick={onSuccess}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all active:scale-[0.97]"
                style={{ background: "#000", color: "#fff", fontSize: "0.875rem", fontWeight: 600 }}
              >
                <Apple size={18} /> Apple
              </button>
              <button
                onClick={onSuccess}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all active:scale-[0.97]"
                style={{ background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 600 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", fontWeight: 500 }}>or continue with email</span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-3 mb-4">
              {mode === "register" && (
                <div>
                  <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Full Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Alex Johnson"
                    className="w-full px-4 py-3.5 rounded-xl outline-none"
                    style={{ background: "var(--input-background)", border: "1.5px solid var(--border)", color: "var(--foreground)", fontSize: "0.95rem" }}
                  />
                </div>
              )}
              <div>
                <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="alex@example.com"
                  className="w-full px-4 py-3.5 rounded-xl outline-none"
                  style={{ background: "var(--input-background)", border: `1.5px solid ${error && !form.email ? "#EF4444" : "var(--border)"}`, color: "var(--foreground)", fontSize: "0.95rem" }}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 600 }}>Password</label>
                  {mode === "login" && <button style={{ color: "#F59E0B", fontSize: "0.78rem", fontWeight: 600 }}>Forgot password?</button>}
                </div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 rounded-xl outline-none pr-12"
                    style={{ background: "var(--input-background)", border: "1.5px solid var(--border)", color: "var(--foreground)", fontSize: "0.95rem" }}
                  />
                  <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPw ? <EyeOff size={18} style={{ color: "var(--muted-foreground)" }} /> : <Eye size={18} style={{ color: "var(--muted-foreground)" }} />}
                  </button>
                </div>
              </div>
              {mode === "register" && (
                <div>
                  <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Confirm Password</label>
                  <input
                    type="password"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 rounded-xl outline-none"
                    style={{ background: "var(--input-background)", border: `1.5px solid ${error.includes("match") ? "#EF4444" : "var(--border)"}`, color: "var(--foreground)", fontSize: "0.95rem" }}
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p style={{ color: "#EF4444", fontSize: "0.82rem", fontWeight: 600 }}>⚠️ {error}</p>
              </div>
            )}

            <button
              onClick={submit}
              disabled={loading}
              className="w-full py-4 rounded-2xl text-white flex items-center justify-center transition-all active:scale-[0.98]"
              style={{ background: loading ? "#D97706" : "linear-gradient(135deg,#F59E0B,#D97706)", fontSize: "1rem", fontWeight: 700, boxShadow: "0 8px 24px rgba(245,158,11,0.35)" }}
            >
              {loading ? (
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : mode === "login" ? "Sign In" : "Create Account"}
            </button>

            {mode === "register" && (
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", textAlign: "center", marginTop: 12 }}>
                By signing up you agree to our{" "}
                <span style={{ color: "#F59E0B", fontWeight: 600 }}>Terms of Service</span> and{" "}
                <span style={{ color: "#F59E0B", fontWeight: 600 }}>Privacy Policy</span>
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
