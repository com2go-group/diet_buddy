import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, ChevronLeft, ScanLine, RefreshCw, Check, Pencil, X } from "lucide-react";

interface BodyScanScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

interface ScanResult {
  key: string;
  label: string;
  value: string;
  rawValue: string;   // numeric portion only
  unit: string;       // suffix e.g. "%" | "kg" | "kcal" | ""
  change: string;
  color: string;
  min: number;
  max: number;
  step: number;
  description: string;
}

const DEFAULT_RESULTS: ScanResult[] = [
  {
    key: "bodyFat", label: "Body Fat %", rawValue: "24.2", unit: "%",
    value: "24.2%", change: "Estimated", color: "#F59E0B",
    min: 3, max: 60, step: 0.1,
    description: "Percentage of total body mass that is fat tissue.",
  },
  {
    key: "leanMass", label: "Lean Mass", rawValue: "51.5", unit: " kg",
    value: "51.5 kg", change: "Calculated", color: "#10B981",
    min: 20, max: 150, step: 0.1,
    description: "Total body mass minus fat mass — includes muscle, bone and water.",
  },
  {
    key: "fatMass", label: "Fat Mass", rawValue: "16.5", unit: " kg",
    value: "16.5 kg", change: "Calculated", color: "#3B82F6",
    min: 2, max: 100, step: 0.1,
    description: "Absolute weight of stored body fat.",
  },
  {
    key: "bmr", label: "BMR", rawValue: "1412", unit: " kcal",
    value: "1,412 kcal", change: "Metabolic rate", color: "#8B5CF6",
    min: 800, max: 4000, step: 1,
    description: "Basal Metabolic Rate — calories burned at complete rest.",
  },
  {
    key: "tdee", label: "TDEE", rawValue: "1977", unit: " kcal",
    value: "1,977 kcal", change: "With activity", color: "#EF4444",
    min: 1000, max: 6000, step: 1,
    description: "Total Daily Energy Expenditure — BMR × activity multiplier.",
  },
  {
    key: "bmi", label: "BMI", rawValue: "24.9", unit: "",
    value: "24.9", change: "Normal weight", color: "#06B6D4",
    min: 10, max: 60, step: 0.1,
    description: "Body Mass Index — weight (kg) ÷ height² (m). 18.5–24.9 is normal range.",
  },
];

function bmiLabel(v: number) {
  if (v < 18.5) return "Underweight";
  if (v < 25) return "Normal weight";
  if (v < 30) return "Overweight";
  return "Obese";
}

function formatValue(r: ScanResult, raw: string): string {
  const n = parseFloat(raw);
  if (isNaN(n)) return raw + r.unit;
  if (r.key === "bmr" || r.key === "tdee") return `${Math.round(n).toLocaleString()}${r.unit}`;
  if (r.key === "bmi") return `${n.toFixed(1)}`;
  return `${n.toFixed(r.step < 1 ? 1 : 0)}${r.unit}`;
}

// Inline editable stat card
function StatCard({
  result,
  onChange,
}: {
  result: ScanResult;
  onChange: (key: string, raw: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(result.rawValue);
  const [showInfo, setShowInfo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(result.rawValue);
      setTimeout(() => inputRef.current?.select(), 30);
    }
  }, [editing, result.rawValue]);

  const commit = () => {
    const n = parseFloat(draft);
    if (!isNaN(n)) {
      const clamped = Math.min(result.max, Math.max(result.min, n));
      onChange(result.key, String(clamped));
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(result.rawValue);
    setEditing(false);
  };

  const displayLabel = result.key === "bmi"
    ? bmiLabel(parseFloat(result.rawValue))
    : result.change;

  return (
    <div
      className="p-4 rounded-2xl transition-all"
      style={{
        background: editing ? `${result.color}10` : "var(--card)",
        border: `1.5px solid ${editing ? result.color : "var(--border)"}`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => setShowInfo(!showInfo)}
          style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", fontWeight: 600, textAlign: "left" }}
        >
          {result.label} {showInfo ? "▲" : "ⓘ"}
        </button>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg transition-all"
            style={{ background: `${result.color}15`, color: result.color }}
          >
            <Pencil size={10} />
            <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>Edit</span>
          </button>
        ) : (
          <button onClick={cancel}>
            <X size={14} style={{ color: "var(--muted-foreground)" }} />
          </button>
        )}
      </div>

      {/* Info tooltip */}
      <AnimatePresence>
        {showInfo && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", lineHeight: 1.5, marginBottom: 6, overflow: "hidden" }}
          >
            {result.description}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Value — display or edit */}
      {editing ? (
        <div className="flex items-center gap-2 mt-1">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="number"
              value={draft}
              min={result.min}
              max={result.max}
              step={result.step}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") cancel();
              }}
              className="w-full outline-none rounded-xl px-3 py-2 pr-12"
              style={{
                background: "var(--input-background)",
                border: `1.5px solid ${result.color}`,
                color: result.color,
                fontSize: "1.1rem",
                fontWeight: 800,
                fontFamily: "inherit",
              }}
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", fontWeight: 600, pointerEvents: "none" }}
            >
              {result.unit.trim() || "—"}
            </span>
          </div>
          <button
            onClick={commit}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: result.color }}
          >
            <Check size={16} style={{ color: "#fff" }} />
          </button>
        </div>
      ) : (
        <button className="w-full text-left" onClick={() => setEditing(true)}>
          <p style={{ color: result.color, fontSize: "1.3rem", fontWeight: 800, lineHeight: 1, marginTop: 4 }}>
            {result.value}
          </p>
        </button>
      )}

      {/* Range hint + sub-label */}
      <div className="flex items-center justify-between mt-2">
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.68rem" }}>{displayLabel}</p>
        {editing && (
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.65rem" }}>
            Range: {result.min}–{result.max}
          </p>
        )}
      </div>

      {/* Subtle progress bar for body fat / BMI */}
      {(result.key === "bodyFat" || result.key === "bmi") && !editing && (
        <div className="mt-2 h-1 rounded-full" style={{ background: "var(--muted)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, (parseFloat(result.rawValue) / (result.key === "bmi" ? 40 : 50)) * 100)}%`,
              background: result.color,
            }}
          />
        </div>
      )}
    </div>
  );
}

export function BodyScanScreen({ onComplete, onBack }: BodyScanScreenProps) {
  const [mode, setMode] = useState<"choose" | "manual" | "ai" | "result">("choose");
  const [scanning, setScanning] = useState(false);
  const [measurements, setMeasurements] = useState({
    weight: "68", height: "165", waist: "76", hips: "92", chest: "88", neck: "34",
  });
  const [results, setResults] = useState<ScanResult[]>(DEFAULT_RESULTS);

  const handleResultChange = (key: string, raw: string) => {
    setResults((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        return { ...r, rawValue: raw, value: formatValue(r, raw) };
      })
    );
  };

  const startScan = () => {
    setMode("ai");
    setScanning(true);
    setTimeout(() => { setScanning(false); setMode("result"); }, 3200);
  };

  const resetResults = () => setResults(DEFAULT_RESULTS);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center gap-3" style={{ background: "linear-gradient(180deg,rgba(245,158,11,0.06) 0%,transparent 100%)" }}>
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
          <ChevronLeft size={18} style={{ color: "var(--muted-foreground)" }} />
        </button>
        <h1 style={{ color: "var(--foreground)", fontSize: "1.2rem", fontWeight: 800 }}>Body Scan</h1>
        {mode === "result" && (
          <button
            onClick={resetResults}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "0.75rem", fontWeight: 700 }}
          >
            <RefreshCw size={12} /> Reset
          </button>
        )}
      </div>

      <div className="flex-1 px-5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <AnimatePresence mode="wait">

          {/* Choose mode */}
          {mode === "choose" && (
            <motion.div key="choose" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: 24 }}>
                Choose how you'd like to capture your body measurements. AI Scan uses your camera for a quick estimate.
              </p>
              <div className="flex flex-col gap-4">
                <button
                  onClick={startScan}
                  className="p-5 rounded-3xl text-left transition-all active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg,#1A1A2E,#16213E)", border: "1.5px solid rgba(245,158,11,0.3)" }}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(245,158,11,0.15)" }}>
                    <ScanLine size={28} style={{ color: "#F59E0B" }} />
                  </div>
                  <p style={{ color: "#F1F5F9", fontSize: "1rem", fontWeight: 800 }}>AI Camera Scan</p>
                  <p style={{ color: "#94A3B8", fontSize: "0.8rem", marginTop: 4, lineHeight: 1.5 }}>
                    Point your camera at yourself for an AI-estimated body composition in under 30 seconds.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-2.5 py-1 rounded-full" style={{ background: "rgba(245,158,11,0.2)", color: "#F59E0B", fontSize: "0.7rem", fontWeight: 700 }}>Premium</span>
                    <span style={{ color: "#64748B", fontSize: "0.72rem" }}>~30 seconds</span>
                  </div>
                </button>

                <button
                  onClick={() => setMode("manual")}
                  className="p-5 rounded-3xl text-left transition-all active:scale-[0.98]"
                  style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--muted)" }}>
                    <span style={{ fontSize: "1.6rem" }}>📏</span>
                  </div>
                  <p style={{ color: "var(--foreground)", fontSize: "1rem", fontWeight: 800 }}>Manual Entry</p>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: 4, lineHeight: 1.5 }}>
                    Enter your measurements manually using a measuring tape and scale.
                  </p>
                  <span style={{ color: "#64748B", fontSize: "0.72rem", marginTop: 8, display: "block" }}>Most accurate</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Manual entry */}
          {mode === "manual" && (
            <motion.div key="manual" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginBottom: 20 }}>Enter measurements in cm and kg:</p>
              <div className="flex flex-col gap-3">
                {Object.entries(measurements).map(([key, val]) => (
                  <div key={key}>
                    <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "capitalize" }}>
                      {key === "weight" ? "Weight (kg)" : key === "height" ? "Height (cm)" : `${key.charAt(0).toUpperCase() + key.slice(1)} circumference (cm)`}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => setMeasurements({ ...measurements, [key]: e.target.value })}
                        className="w-full px-4 py-3.5 rounded-xl outline-none pr-14"
                        style={{ background: "var(--input-background)", border: "1.5px solid var(--border)", color: "var(--foreground)", fontSize: "1rem", fontWeight: 600, fontFamily: "inherit" }}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                        {key === "weight" ? "kg" : "cm"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setMode("result")}
                className="w-full mt-6 py-4 rounded-2xl text-white active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", fontSize: "1rem", fontWeight: 700, boxShadow: "0 8px 24px rgba(245,158,11,0.35)" }}
              >
                Calculate My Stats
              </button>
            </motion.div>
          )}

          {/* AI scanning */}
          {mode === "ai" && (
            <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-12">
              <div
                className="relative w-52 h-72 rounded-3xl flex items-center justify-center mb-6"
                style={{ background: "linear-gradient(135deg,#1A1A2E,#16213E)", border: "2px solid rgba(245,158,11,0.3)" }}
              >
                <motion.div
                  className="absolute w-full h-1 rounded-full"
                  style={{ background: "linear-gradient(90deg,transparent,#F59E0B,transparent)", top: "10%" }}
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                />
                <div className="flex flex-col items-center">
                  <span style={{ fontSize: "4rem" }}>🧍</span>
                  <div className="mt-4 flex gap-1">
                    {[0, 0.15, 0.3].map((d) => (
                      <motion.div key={d} className="w-2 h-2 rounded-full" style={{ background: "#F59E0B" }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, delay: d, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </div>
                {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 }].map((pos, i) => (
                  <div key={i} className="absolute w-6 h-6" style={{ ...pos as any, border: "2.5px solid #F59E0B", borderRadius: 3 }} />
                ))}
              </div>
              <p style={{ color: "var(--foreground)", fontSize: "1rem", fontWeight: 700 }}>Scanning your body...</p>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", marginTop: 6 }}>AI is estimating your composition</p>
            </motion.div>
          )}

          {/* Results */}
          {mode === "result" && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Success banner */}
              <div className="flex items-center gap-3 p-4 rounded-2xl mb-4" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#10B981" }}>
                  <Check size={20} style={{ color: "#fff" }} />
                </div>
                <div>
                  <p style={{ color: "var(--foreground)", fontSize: "0.95rem", fontWeight: 700 }}>Scan Complete</p>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
                    Tap <span style={{ color: "#F59E0B", fontWeight: 700 }}>Edit</span> on any value to adjust it manually
                  </p>
                </div>
              </div>

              {/* Editable stat grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {results.map((r) => (
                  <StatCard key={r.key} result={r} onChange={handleResultChange} />
                ))}
              </div>

              {/* Body composition silhouette */}
              <div className="p-4 rounded-2xl mb-5 flex items-center gap-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex flex-col items-center">
                  <span style={{ fontSize: "4rem" }}>🧍‍♀️</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", marginTop: 4 }}>Alex, 28</span>
                </div>
                <div className="flex-1">
                  <p style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 700, marginBottom: 10 }}>Body Composition</p>
                  {(() => {
                    const fatPct = parseFloat(results.find(r => r.key === "bodyFat")?.rawValue ?? "24");
                    const leanPct = Math.max(0, 100 - fatPct - 6 - 28);
                    const bars = [
                      { label: "Fat", pct: Math.round(fatPct), color: "#F59E0B" },
                      { label: "Muscle", pct: Math.round(leanPct), color: "#10B981" },
                      { label: "Water", pct: 28, color: "#3B82F6" },
                      { label: "Bone", pct: 6, color: "#8B5CF6" },
                    ];
                    return bars.map((b) => (
                      <div key={b.label} className="flex items-center gap-2 mb-2">
                        <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", width: 38 }}>{b.label}</span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--muted)" }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${b.pct}%`, background: b.color }} />
                        </div>
                        <span style={{ color: b.color, fontSize: "0.72rem", fontWeight: 700, width: 28 }}>{b.pct}%</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="flex gap-3 pb-6">
                <button onClick={() => setMode("choose")} className="flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2" style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "0.875rem", fontWeight: 700 }}>
                  <RefreshCw size={15} /> Rescan
                </button>
                <button onClick={onComplete} className="flex-1 py-3.5 rounded-2xl text-white" style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", fontSize: "0.875rem", fontWeight: 700 }}>
                  Save & Continue →
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
