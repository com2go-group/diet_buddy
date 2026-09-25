import { useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BannerAdProps {
  variant?: "slim" | "standard" | "large";
  dismissible?: boolean;
  onDismiss?: () => void;
}

// ── Ad inventory ──────────────────────────────────────────────────────────────
const BANNER_ADS = [
  {
    id: "myprotein",
    brand: "Myprotein",
    headline: "Up to 50% off protein",
    sub: "Impact Whey · 2.5kg from $39",
    emoji: "🥤",
    accent: "#10B981",
    bg: ["#0D2318", "#0F2D1E"],
    cta: "Shop now",
    tag: "SPONSORED",
  },
  {
    id: "whoop",
    brand: "WHOOP 4.0",
    headline: "First month free",
    sub: "Track strain, recovery & sleep 24/7",
    emoji: "⌚",
    accent: "#3B82F6",
    bg: ["#0A1628", "#0D1F3C"],
    cta: "Try free",
    tag: "AD",
  },
  {
    id: "mealkit",
    brand: "HelloFresh",
    headline: "16 free meals + free shipping",
    sub: "Chef-crafted macro-balanced recipes",
    emoji: "🥘",
    accent: "#84CC16",
    bg: ["#131A09", "#1A2810"],
    cta: "Claim offer",
    tag: "SPONSORED",
  },
  {
    id: "withings",
    brand: "Withings Body+",
    headline: "Know your body better",
    sub: "Wi-Fi smart scale · body composition",
    emoji: "⚖️",
    accent: "#F59E0B",
    bg: ["#1A1209", "#2A1C0C"],
    cta: "Learn more",
    tag: "AD",
  },
  {
    id: "calm",
    brand: "Calm",
    headline: "Sleep better, recover faster",
    sub: "Guided meditations tailored to fitness",
    emoji: "🧘",
    accent: "#8B5CF6",
    bg: ["#120D1A", "#1A1228"],
    cta: "Try free",
    tag: "SPONSORED",
  },
  {
    id: "huel",
    brand: "Huel",
    headline: "Complete nutrition, every meal",
    sub: "400 kcal · 40g protein · all micronutrients",
    emoji: "🫙",
    accent: "#F97316",
    bg: ["#1A1009", "#2A1A0D"],
    cta: "Get started",
    tag: "AD",
  },
];

function pickAd() {
  return BANNER_ADS[Math.floor(Math.random() * BANNER_ADS.length)];
}

// ── Slim banner (280 × 50 equivalent) ────────────────────────────────────────
function SlimBanner({ ad, onDismiss, dismissible }: { ad: typeof BANNER_ADS[0]; onDismiss?: () => void; dismissible?: boolean }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl relative overflow-hidden"
      style={{
        background: `linear-gradient(120deg, ${ad.bg[0]}, ${ad.bg[1]})`,
        border: `1px solid ${ad.accent}25`,
      }}
    >
      {/* Subtle glow */}
      <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full blur-xl" style={{ background: ad.accent, opacity: 0.15 }} />

      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg relative z-10"
        style={{ background: `${ad.accent}20`, border: `1px solid ${ad.accent}30` }}
      >
        {ad.emoji}
      </div>

      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-1.5">
          <p style={{ color: "#F1F5F9", fontSize: "0.8rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {ad.headline}
          </p>
          <span className="px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", color: "#64748B", fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.06em" }}>
            {ad.tag}
          </span>
        </div>
        <p style={{ color: "#64748B", fontSize: "0.68rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {ad.brand} · {ad.sub}
        </p>
      </div>

      <button
        className="flex-shrink-0 px-2.5 py-1.5 rounded-lg relative z-10"
        style={{ background: ad.accent, color: "#fff", fontSize: "0.68rem", fontWeight: 800 }}
      >
        {ad.cta}
      </button>

      {dismissible && (
        <button onClick={onDismiss} className="absolute top-1.5 right-1.5 z-10 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <X size={9} style={{ color: "#94A3B8" }} />
        </button>
      )}
    </div>
  );
}

// ── Standard banner (320 × 100 equivalent) ───────────────────────────────────
function StandardBanner({ ad, onDismiss, dismissible }: { ad: typeof BANNER_ADS[0]; onDismiss?: () => void; dismissible?: boolean }) {
  return (
    <div
      className="p-4 rounded-2xl relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${ad.bg[0]}, ${ad.bg[1]})`,
        border: `1px solid ${ad.accent}25`,
      }}
    >
      {/* Background glow blob */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full blur-2xl" style={{ background: ad.accent, opacity: 0.12 }} />

      <div className="flex items-center gap-3 relative z-10">
        {/* Product icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
          style={{ background: `${ad.accent}18`, border: `1.5px solid ${ad.accent}30` }}
        >
          {ad.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span style={{ color: "#94A3B8", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em" }}>{ad.tag} · {ad.brand}</span>
          </div>
          <p style={{ color: "#F1F5F9", fontSize: "0.9rem", fontWeight: 800, lineHeight: 1.2 }}>{ad.headline}</p>
          <p style={{ color: "#64748B", fontSize: "0.72rem", marginTop: 2 }}>{ad.sub}</p>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <button
            className="px-3 py-1.5 rounded-xl"
            style={{ background: ad.accent, color: "#fff", fontSize: "0.75rem", fontWeight: 800, whiteSpace: "nowrap" }}
          >
            {ad.cta}
          </button>
          {dismissible && (
            <button onClick={onDismiss} className="flex items-center gap-1" style={{ color: "#475569", fontSize: "0.62rem" }}>
              <X size={10} /> Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Large banner (320 × 160 equivalent) ──────────────────────────────────────
function LargeBanner({ ad, onDismiss, dismissible }: { ad: typeof BANNER_ADS[0]; onDismiss?: () => void; dismissible?: boolean }) {
  return (
    <div
      className="rounded-3xl overflow-hidden relative"
      style={{
        background: `linear-gradient(150deg, ${ad.bg[0]}, ${ad.bg[1]})`,
        border: `1px solid ${ad.accent}30`,
      }}
    >
      {/* Decorative circle */}
      <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full" style={{ background: `${ad.accent}12` }} />
      <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full" style={{ background: `${ad.accent}08` }} />

      <div className="p-5 relative z-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: `${ad.accent}18`, border: `1.5px solid ${ad.accent}35` }}
          >
            {ad.emoji}
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: "#475569", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em" }}>{ad.tag}</span>
            {dismissible && (
              <button
                onClick={onDismiss}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <X size={11} style={{ color: "#64748B" }} />
              </button>
            )}
          </div>
        </div>

        <p style={{ color: "#94A3B8", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 4 }}>{ad.brand}</p>
        <p style={{ color: "#F1F5F9", fontSize: "1.05rem", fontWeight: 900, lineHeight: 1.25, marginBottom: 4, letterSpacing: "-0.01em" }}>
          {ad.headline}
        </p>
        <p style={{ color: "#64748B", fontSize: "0.78rem", marginBottom: 16, lineHeight: 1.4 }}>{ad.sub}</p>

        <div className="flex items-center justify-between">
          <button
            className="px-4 py-2.5 rounded-xl flex items-center gap-1.5"
            style={{ background: ad.accent, color: "#fff", fontSize: "0.82rem", fontWeight: 800 }}
          >
            {ad.cta} <ExternalLink size={12} />
          </button>
          <span style={{ color: "#334155", fontSize: "0.62rem" }}>Advertising</span>
        </div>
      </div>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export function BannerAd({ variant = "standard", dismissible = true, onDismiss }: BannerAdProps) {
  const [ad] = useState(pickAd);
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.25 }}
        >
          {variant === "slim" && <SlimBanner ad={ad} onDismiss={handleDismiss} dismissible={dismissible} />}
          {variant === "standard" && <StandardBanner ad={ad} onDismiss={handleDismiss} dismissible={dismissible} />}
          {variant === "large" && <LargeBanner ad={ad} onDismiss={handleDismiss} dismissible={dismissible} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
