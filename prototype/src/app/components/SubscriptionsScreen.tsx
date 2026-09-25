import { X, Check, Crown, Zap } from "lucide-react";
import { useState } from "react";

interface SubscriptionsScreenProps {
  onClose: () => void;
}

const freeFeatures = [
  "Daily calorie & macro tracking",
  "Basic meal logging",
  "7-day progress charts",
  "Basic AI nutrition tips",
  "5 recipe suggestions/week",
  "Streak tracking",
];

const premiumFeatures = [
  "Everything in Free",
  "AI Camera Body Scan",
  "Digital AI Twin avatar",
  "Restaurant Mode (menu scanning)",
  "Grocery AI assistant",
  "Before/After photo comparison",
  "Unlimited AI coach messages",
  "Advanced analytics & projections",
  "Custom AI meal plans",
  "Priority customer support",
  "Weekly Progress Story",
  "Detailed body composition",
];

const plans = [
  { id: "monthly", label: "Monthly", price: "$9.99", period: "/mo", badge: null },
  { id: "annual", label: "Annual", price: "$5.99", period: "/mo", badge: "Save 40%", original: "$9.99/mo" },
  { id: "lifetime", label: "Lifetime", price: "$149", period: " one-time", badge: "Best value" },
];

export function SubscriptionsScreen({ onClose }: SubscriptionsScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState("annual");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onClose(); }, 1500);
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      {/* Header */}
      <div
        className="relative px-5 pt-14 pb-8 flex flex-col items-center"
        style={{ background: "linear-gradient(160deg,#1A1A2E 0%,#0F172A 100%)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-14 right-5 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <X size={16} style={{ color: "#94A3B8" }} />
        </button>

        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", boxShadow: "0 8px 32px rgba(245,158,11,0.4)" }}
        >
          <Crown size={30} style={{ color: "#fff" }} />
        </div>
        <h1 style={{ color: "#F1F5F9", fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em", textAlign: "center" }}>
          Diet<span style={{ color: "#F59E0B" }}>Buddy</span> Premium
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "0.875rem", textAlign: "center", marginTop: 6, lineHeight: 1.5 }}>
          Unlock the full power of AI nutrition coaching
        </p>

        {/* Social proof */}
        <div className="flex items-center gap-2 mt-5 px-4 py-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex">
            {["👩", "👨", "👩‍🦱"].map((e, i) => (
              <span key={i} className="-ml-1 first:ml-0" style={{ fontSize: "1.2rem" }}>{e}</span>
            ))}
          </div>
          <span style={{ color: "#94A3B8", fontSize: "0.75rem" }}>
            <span style={{ color: "#F59E0B", fontWeight: 700 }}>47,381</span> active Premium members
          </span>
        </div>
      </div>

      <div className="px-5 py-5">
        {/* Plan selector */}
        <div className="flex flex-col gap-2.5 mb-6">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className="flex items-center justify-between p-4 rounded-2xl transition-all"
              style={{
                background: selectedPlan === plan.id
                  ? "linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04))"
                  : "var(--card)",
                border: `1.5px solid ${selectedPlan === plan.id ? "#F59E0B" : "var(--border)"}`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    border: `2px solid ${selectedPlan === plan.id ? "#F59E0B" : "var(--border)"}`,
                    background: selectedPlan === plan.id ? "#F59E0B" : "transparent",
                  }}
                >
                  {selectedPlan === plan.id && <div className="w-2 h-2 rounded-full" style={{ background: "#fff" }} />}
                </div>
                <div>
                  <span style={{ color: "var(--foreground)", fontSize: "0.95rem", fontWeight: 700 }}>{plan.label}</span>
                  {plan.original && (
                    <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", marginLeft: 6, textDecoration: "line-through" }}>{plan.original}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {plan.badge && (
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{
                      background: plan.badge === "Save 40%" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                      color: plan.badge === "Save 40%" ? "#10B981" : "#F59E0B",
                      fontSize: "0.68rem",
                      fontWeight: 800,
                    }}
                  >
                    {plan.badge}
                  </span>
                )}
                <div className="text-right">
                  <span style={{ color: selectedPlan === plan.id ? "#F59E0B" : "var(--foreground)", fontSize: "1.05rem", fontWeight: 800 }}>{plan.price}</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{plan.period}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Feature comparison */}
        <div className="mb-6">
          <h3 style={{ color: "var(--foreground)", fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>What you get with Premium</h3>
          <div className="grid grid-cols-2 gap-2">
            {premiumFeatures.slice(1).map((f) => (
              <div key={f} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(245,158,11,0.15)" }}>
                  <Check size={10} style={{ color: "#F59E0B" }} />
                </div>
                <span style={{ color: "var(--foreground)", fontSize: "0.78rem", fontWeight: 500, lineHeight: 1.4 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Free vs Premium */}
        <div className="p-4 rounded-2xl mb-5" style={{ background: "var(--muted)" }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", fontWeight: 700, marginBottom: 8 }}>FREE</p>
              {freeFeatures.map((f) => (
                <div key={f} className="flex items-center gap-2 mb-2">
                  <Check size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{f}</span>
                </div>
              ))}
            </div>
            <div>
              <p style={{ color: "#F59E0B", fontSize: "0.75rem", fontWeight: 700, marginBottom: 8 }}>PREMIUM ✨</p>
              {premiumFeatures.map((f) => (
                <div key={f} className="flex items-center gap-2 mb-2">
                  <Zap size={10} style={{ color: "#F59E0B", flexShrink: 0 }} />
                  <span style={{ color: "var(--foreground)", fontSize: "0.72rem", fontWeight: 500 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] mb-3"
          style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", fontSize: "1rem", fontWeight: 800, boxShadow: "0 8px 32px rgba(245,158,11,0.4)" }}
        >
          {loading ? (
            <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <>
              <Crown size={18} />
              {selectedPlan === "monthly" ? "Start 7-Day Free Trial" : selectedPlan === "annual" ? "Get Premium Annual" : "Get Lifetime Access"}
            </>
          )}
        </button>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", textAlign: "center", marginBottom: 16 }}>
          {selectedPlan === "monthly" ? "Free for 7 days, then $9.99/month. Cancel anytime." :
           selectedPlan === "annual" ? "Billed $71.88/year. Cancel anytime." :
           "One-time payment. All future updates included."}
        </p>

        {/* Testimonials */}
        <div className="flex flex-col gap-3">
          {[
            { name: "Sarah M.", text: "Lost 12kg in 4 months with Premium. The AI body scan alone is worth it!", stars: 5 },
            { name: "James K.", text: "Restaurant mode changed everything for me. I can eat out without guilt.", stars: 5 },
          ].map((t) => (
            <div key={t.name} className="p-3.5 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", fontSize: "0.75rem", fontWeight: 700 }}>
                  {t.name[0]}
                </div>
                <span style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 700 }}>{t.name}</span>
                <div className="flex gap-0.5 ml-auto">
                  {Array.from({ length: t.stars }).map((_, i) => <span key={i} style={{ color: "#F59E0B", fontSize: "0.75rem" }}>★</span>)}
                </div>
              </div>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", lineHeight: 1.4 }}>{t.text}</p>
            </div>
          ))}
        </div>

        <p style={{ color: "var(--muted-foreground)", fontSize: "0.68rem", textAlign: "center", marginTop: 16 }}>
          Restore purchases · Privacy Policy · Terms of Service
        </p>
      </div>
    </div>
  );
}
