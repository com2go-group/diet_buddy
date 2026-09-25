import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft, Plus, X } from "lucide-react";
import { BannerAd } from "./BannerAd";

interface OnboardingScreenProps {
  onComplete: () => void;
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface OnboardingData {
  name: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  goals: string[];
  goalWeight: string;
  pace: "Sustainable" | "Balanced" | "Fast";
  goalDate: string;
  customDate: string;
  motivations: string[];
  activity: string;
  trainingFreq: string;
  dietStyles: string[];
  restrictions: string[];
  otherRestriction: string;
  avoidFoods: string[];
  allergies: string[];
  customAllergy: string;
  connectedApps: string[];
  connectedScale: string;
  connectedWearables: string[];
}

// ─── Static data ─────────────────────────────────────────────────────────────
const GOALS = [
  { id: "Lose Fat", emoji: "🔥", desc: "Calorie deficit + fat-burning plan" },
  { id: "Build Muscle", emoji: "💪", desc: "Progressive overload + protein focus" },
  { id: "Body Recomposition", emoji: "⚖️", desc: "Lose fat & gain muscle simultaneously" },
  { id: "Improve Performance", emoji: "⚡", desc: "Fuel for sport & athletic output" },
  { id: "Healthy Lifestyle", emoji: "❤️", desc: "Balance, longevity & well-being" },
];

const ACTIVITY_LEVELS = [
  { id: "Sedentary", label: "Sedentary", sub: "Desk job · little or no exercise", mul: 1.2 },
  { id: "Lightly Active", label: "Lightly Active", sub: "Walking regularly · 1–2 workouts/week", mul: 1.375 },
  { id: "Active", label: "Active", sub: "3–5 workouts/week", mul: 1.55 },
  { id: "Very Active", label: "Very Active", sub: "Physical job OR 6+ workouts/week", mul: 1.725 },
];

const TRAINING_FREQS = [
  { id: "0-1 days", label: "0–1 days", sub: "Rarely or not at all" },
  { id: "2-3 days", label: "2–3 days", sub: "Moderate training" },
  { id: "4-5 days", label: "4–5 days", sub: "Regular training" },
  { id: "6+ days", label: "6+ days", sub: "Daily athlete" },
];

const DIET_STYLES = [
  { id: "No preference", emoji: "🍽️" },
  { id: "Mediterranean", emoji: "🫒" },
  { id: "Vegetarian", emoji: "🥦" },
  { id: "Vegan", emoji: "🌱" },
  { id: "Keto", emoji: "🥑" },
  { id: "Low Carb", emoji: "🥩" },
];

const RESTRICTIONS = ["Halal", "Kosher", "Gluten Free", "Lactose Free", "Other"];

const AVOID_FOODS: Record<string, { items: string[]; emoji: string }> = {
  "Fish & Seafood": { emoji: "🐟", items: ["Salmon", "Tuna", "Shrimp", "Shellfish", "Cod", "Tilapia", "Sardines"] },
  "Meat": { emoji: "🥩", items: ["Beef", "Pork", "Lamb", "Turkey", "Chicken", "Bacon", "Sausage"] },
  "Dairy": { emoji: "🧀", items: ["Milk", "Cheese", "Butter", "Yogurt", "Cream", "Ice Cream"] },
  "Eggs": { emoji: "🥚", items: ["Eggs", "Egg whites", "Egg yolks"] },
  "Carbs & Grains": { emoji: "🍞", items: ["Bread", "Pasta", "Rice", "Oats", "Wheat", "Barley", "Rye"] },
  "Legumes": { emoji: "🫘", items: ["Beans", "Lentils", "Chickpeas", "Peanuts", "Soy", "Tofu", "Edamame"] },
  "Nuts & Seeds": { emoji: "🥜", items: ["Almonds", "Walnuts", "Cashews", "Sunflower Seeds", "Flaxseed", "Chia Seeds"] },
  "Vegetables": { emoji: "🥦", items: ["Mushrooms", "Onions", "Garlic", "Brussels Sprouts", "Broccoli", "Cauliflower"] },
  "Fruits": { emoji: "🍌", items: ["Bananas", "Grapes", "Mango", "Pineapple", "Watermelon", "Dates"] },
  "Sweeteners": { emoji: "🍬", items: ["Sugar", "Honey", "Maple Syrup", "Artificial Sweeteners", "Stevia"] },
};

const COMMON_ALLERGIES = [
  "Peanuts", "Tree Nuts", "Milk / Dairy", "Eggs", "Wheat / Gluten",
  "Soy", "Fish", "Shellfish", "Sesame", "Mustard",
];

const MOTIVATIONS = [
  { id: "Improve appearance", emoji: "✨" },
  { id: "Improve health", emoji: "❤️" },
  { id: "Increase confidence", emoji: "🧠" },
  { id: "Build muscle", emoji: "💪" },
  { id: "Sports performance", emoji: "🏅" },
  { id: "Special event", emoji: "🎉" },
  { id: "Other", emoji: "🎯" },
];

const GOAL_DATES = ["3 Months", "6 Months", "12 Months", "Custom Date"];

const PACE_OPTIONS = [
  {
    id: "Sustainable" as const,
    label: "Sustainable",
    desc: "Easier to maintain long-term",
    rate: "0.25 kg/week",
    deficit: 250,
    color: "#10B981",
    emoji: "🌱",
  },
  {
    id: "Balanced" as const,
    label: "Balanced",
    desc: "Best for most users",
    rate: "0.50 kg/week",
    deficit: 500,
    color: "#F59E0B",
    emoji: "⚖️",
    recommended: true,
  },
  {
    id: "Fast" as const,
    label: "Fast",
    desc: "Faster results, larger adjustments",
    rate: "0.75–1.00 kg/week",
    deficit: 750,
    color: "#EF4444",
    emoji: "⚡",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function computePlan(data: OnboardingData) {
  const w = parseFloat(data.weight) || 75;
  const h = parseFloat(data.height) || 170;
  const a = parseFloat(data.age) || 28;
  const isMale = data.gender === "Male";

  // Mifflin-St Jeor BMR
  const bmr = isMale
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161;

  const actMul = ACTIVITY_LEVELS.find((x) => x.id === data.activity)?.mul ?? 1.375;
  const tdee = Math.round(bmr * actMul);

  const paceObj = PACE_OPTIONS.find((p) => p.id === data.pace)!;
  const deficit = data.goals.includes("Lose Fat") ? paceObj.deficit : data.goals.includes("Build Muscle") ? -250 : 0;
  const targetCals = Math.max(1200, tdee - deficit);
  const protein = Math.round(w * (data.goals.includes("Build Muscle") ? 2.2 : 1.8));

  const goalW = parseFloat(data.goalWeight) || w - 7;
  const diff = Math.abs(w - goalW);
  const weeklyRate = paceObj.deficit / 7700; // kg lost per week
  const weeksNeeded = weeklyRate > 0 ? Math.ceil(diff / weeklyRate) : 26;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weeksNeeded * 7);
  const dateStr = targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return { tdee, targetCals, protein, weeksNeeded, dateStr, deficit, goalW };
}

function weeksToMonths(w: number) {
  if (w <= 13) return `${w} weeks`;
  return `${Math.round(w / 4.3)} months`;
}

// ─── Health platforms & devices ───────────────────────────────────────────────
const HEALTH_PLATFORMS = [
  {
    id: "apple_health",
    name: "Apple Health",
    sub: "Syncs steps, workouts, weight & heart rate",
    emoji: "🍎",
    color: "#EF4444",
    platform: "ios",
  },
  {
    id: "google_health",
    name: "Google Health Connect",
    sub: "Syncs activity, nutrition & body metrics",
    emoji: "🟢",
    color: "#10B981",
    platform: "android",
  },
  {
    id: "google_fit",
    name: "Google Fit",
    sub: "Heart points, activity & sleep tracking",
    emoji: "💚",
    color: "#34D399",
    platform: "android",
  },
  {
    id: "samsung_health",
    name: "Samsung Health",
    sub: "Galaxy Watch, steps & stress data",
    emoji: "📱",
    color: "#3B82F6",
    platform: "android",
  },
];

const SMART_SCALES = [
  { id: "withings", name: "Withings Body+", sub: "Body fat, BMI, muscle & bone mass", emoji: "⚖️", color: "#6366F1" },
  { id: "garmin_index", name: "Garmin Index S2", sub: "Wi-Fi scale with body composition", emoji: "🟣", color: "#8B5CF6" },
  { id: "eufy", name: "Eufy Smart Scale P2", sub: "15 body measurements via Bluetooth", emoji: "📊", color: "#F59E0B" },
  { id: "xiaomi", name: "Xiaomi Mi Scale 2", sub: "Affordable BIA body composition", emoji: "🔵", color: "#06B6D4" },
  { id: "renpho", name: "RENPHO Smart Scale", sub: "13 body metrics · app sync", emoji: "📡", color: "#10B981" },
  { id: "fitbit_aria", name: "Fitbit Aria Air", sub: "BMI & body fat, Fitbit ecosystem", emoji: "🔴", color: "#EF4444" },
];

const WEARABLES = [
  { id: "apple_watch", name: "Apple Watch", sub: "Heart rate, ECG, workout detection", emoji: "⌚", color: "#374151" },
  { id: "fitbit", name: "Fitbit", sub: "Sleep, heart rate & calorie burn", emoji: "🟠", color: "#F97316" },
  { id: "garmin", name: "Garmin", sub: "GPS, VO2 max & recovery tracking", emoji: "🟣", color: "#7C3AED" },
  { id: "whoop", name: "WHOOP 4.0", sub: "Strain, recovery & sleep coach", emoji: "⚫", color: "#111827" },
  { id: "oura", name: "Oura Ring", sub: "Readiness score, HRV & sleep stages", emoji: "💍", color: "#D97706" },
  { id: "polar", name: "Polar", sub: "Training load & cardio analysis", emoji: "🔴", color: "#DC2626" },
  { id: "samsung_watch", name: "Galaxy Watch", sub: "Body composition, BP & ECG", emoji: "🟦", color: "#2563EB" },
  { id: "amazfit", name: "Amazfit", sub: "PAI health score & 24h monitoring", emoji: "🟢", color: "#059669" },
];

// ─── Step definitions (some conditional) ─────────────────────────────────────
function buildSteps(goals: string[]) {
  const base = [
    "personal",
    "measurements",
    "goal",
    ...(goals.includes("Lose Fat") ? ["goalWeight", "pace"] : []),
    "goalDate",
    "motivation",
    "activity",
    "trainingFreq",
    "dietStyle",
    "restrictions",
    "avoidFoods",
    "allergies",
    "healthApps",
    "devices",
    "aiPlan",
  ];
  return base;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PaceTimeline({ pace, data }: { pace: string; data: OnboardingData }) {
  const gw = parseFloat(data.goalWeight) || parseFloat(data.weight) - 7;
  const w = parseFloat(data.weight) || 75;
  const diff = Math.max(0, w - gw);

  const scenarios = PACE_OPTIONS.map((p) => {
    const weeks = p.deficit > 0 ? Math.ceil(diff / (p.deficit / 7700)) : 52;
    return { ...p, weeks };
  });

  return (
    <div className="mt-5 p-4 rounded-2xl" style={{ background: "var(--muted)" }}>
      <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
        Estimated Timeline to {gw} kg
      </p>
      <div className="flex flex-col gap-3">
        {scenarios.map((s) => {
          const maxW = Math.max(...scenarios.map((x) => x.weeks));
          const barPct = (s.weeks / maxW) * 100;
          const isActive = s.id === pace;
          return (
            <div key={s.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ color: isActive ? s.color : "var(--muted-foreground)", fontSize: "0.8rem", fontWeight: isActive ? 700 : 500 }}>
                  {s.emoji} {s.label}
                </span>
                <span style={{ color: isActive ? s.color : "var(--muted-foreground)", fontSize: "0.8rem", fontWeight: 700 }}>
                  {weeksToMonths(s.weeks)}
                </span>
              </div>
              <div className="h-2 rounded-full" style={{ background: "var(--border)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${barPct}%`, background: isActive ? s.color : `${s.color}40` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", marginTop: 12 }}>
        Based on {diff.toFixed(1)} kg to lose · 7,700 kcal = 1 kg fat
      </p>
    </div>
  );
}

function AIPlanOverview({ data }: { data: OnboardingData }) {
  const plan = computePlan(data);

  const macros = [
    { label: "Protein", value: `${plan.protein}g`, color: "#10B981", pct: 30 },
    { label: "Carbs", value: `${Math.round((plan.targetCals * 0.4) / 4)}g`, color: "#3B82F6", pct: 40 },
    { label: "Fat", value: `${Math.round((plan.targetCals * 0.3) / 9)}g`, color: "#8B5CF6", pct: 30 },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
      {/* Header card */}
      <div
        className="p-5 rounded-3xl"
        style={{ background: "linear-gradient(135deg,#1A1A2E,#16213E)", border: "1px solid rgba(245,158,11,0.25)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
            <span style={{ fontSize: "1.1rem" }}>🧠</span>
          </div>
          <div>
            <p style={{ color: "#94A3B8", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Your AI Plan</p>
            <p style={{ color: "#F1F5F9", fontSize: "1rem", fontWeight: 800 }}>{data.name || "Your"} · {data.goals.join(", ") || "Goals"}</p>
          </div>
        </div>

        {/* Goal badges row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {data.goals.map((g) => {
            const def = GOALS.find((x) => x.id === g);
            return (
              <span
                key={g}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(245,158,11,0.18)", color: "#F59E0B", fontSize: "0.72rem", fontWeight: 800 }}
              >
                {def?.emoji} {g}
              </span>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Current Weight", value: `${data.weight || "—"} kg`, color: "#94A3B8" },
            ...(data.goals.includes("Lose Fat")
              ? [
                  { label: "Goal Weight", value: `${data.goalWeight || plan.goalW.toFixed(0)} kg`, color: "#F59E0B" },
                  { label: "Weekly Rate", value: PACE_OPTIONS.find((p) => p.id === data.pace)?.rate ?? "0.50 kg", color: "#EF4444" },
                ]
              : []),
            { label: "Daily Calories", value: `${plan.targetCals.toLocaleString()} kcal`, color: "#10B981" },
            { label: "Protein Target", value: `${plan.protein} g`, color: "#3B82F6" },
            { label: "Estimated Date", value: plan.dateStr, color: "#8B5CF6" },
          ].map((item) => (
            <div key={item.label} className="py-3 px-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ color: "#64748B", fontSize: "0.68rem", fontWeight: 600 }}>{item.label}</p>
              <p style={{ color: item.color, fontSize: "0.95rem", fontWeight: 800, marginTop: 2, lineHeight: 1 }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Macro split */}
      <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <p style={{ color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 700, marginBottom: 12 }}>Daily Macro Split</p>
        <div className="flex h-3 rounded-full overflow-hidden mb-3">
          {macros.map((m) => (
            <div key={m.label} style={{ width: `${m.pct}%`, background: m.color }} />
          ))}
        </div>
        <div className="flex gap-4">
          {macros.map((m) => (
            <div key={m.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
              <div>
                <p style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 700 }}>{m.value}</p>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.65rem" }}>{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Motivation tags */}
      {data.motivations.length > 0 && (
        <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p style={{ color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 700, marginBottom: 10 }}>Your Motivations</p>
          <div className="flex flex-wrap gap-2">
            {data.motivations.map((m) => {
              const mot = MOTIVATIONS.find((x) => x.id === m);
              return (
                <span key={m} className="px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B", fontSize: "0.78rem", fontWeight: 600 }}>
                  {mot?.emoji} {m}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary pills */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Activity", value: data.activity || "—" },
          { label: "Training", value: data.trainingFreq || "—" },
          { label: "Diet Style", value: data.dietStyles.length ? data.dietStyles.join(", ") : "No preference" },
          { label: "Restrictions", value: data.restrictions.length ? data.restrictions.join(", ") : "None" },
        ].map((s) => (
          <div key={s.label} className="px-3 py-2.5 rounded-xl" style={{ background: "var(--muted)" }}>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.65rem", fontWeight: 600 }}>{s.label}</p>
            <p style={{ color: "var(--foreground)", fontSize: "0.8rem", fontWeight: 700, marginTop: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Connected devices */}
      {(data.connectedApps.length > 0 || data.connectedScale || data.connectedWearables.length > 0) && (
        <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p style={{ color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 700, marginBottom: 10 }}>Connected Devices</p>
          <div className="flex flex-wrap gap-2">
            {data.connectedApps.map((id) => {
              const p = HEALTH_PLATFORMS.find((x) => x.id === id);
              return p ? (
                <span key={id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full" style={{ background: `${p.color}12`, border: `1px solid ${p.color}30`, color: p.color, fontSize: "0.72rem", fontWeight: 700 }}>
                  {p.emoji} {p.name}
                </span>
              ) : null;
            })}
            {data.connectedScale && (() => {
              const s = SMART_SCALES.find((x) => x.id === data.connectedScale);
              return s ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full" style={{ background: `${s.color}12`, border: `1px solid ${s.color}30`, color: s.color, fontSize: "0.72rem", fontWeight: 700 }}>
                  ⚖️ {s.name}
                </span>
              ) : null;
            })()}
            {data.connectedWearables.map((id) => {
              const w = WEARABLES.find((x) => x.id === id);
              return w ? (
                <span key={id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full" style={{ background: `${w.color}12`, border: `1px solid ${w.color}30`, color: w.color, fontSize: "0.72rem", fontWeight: 700 }}>
                  {w.emoji} {w.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    age: "",
    gender: "Female",
    weight: "",
    height: "",
    goals: [],
    goalWeight: "",
    pace: "Balanced",
    goalDate: "6 Months",
    customDate: "",
    motivations: [],
    activity: "",
    trainingFreq: "",
    dietStyles: [],
    restrictions: [],
    otherRestriction: "",
    avoidFoods: [],
    allergies: [],
    customAllergy: "",
    connectedApps: [],
    connectedScale: "",
    connectedWearables: [],
  });
  const [openFoodCategory, setOpenFoodCategory] = useState<string | null>(null);
  const [customAllergyInput, setCustomAllergyInput] = useState("");

  const steps = useMemo(() => buildSteps(data.goals), [data.goals]);
  const currentStep = steps[stepIndex];
  const totalSteps = steps.length;
  const progress = ((stepIndex) / (totalSteps - 1)) * 100;

  const next = () => {
    if (stepIndex < totalSteps - 1) {
      setDirection(1);
      setStepIndex((i) => i + 1);
    } else {
      onComplete();
    }
  };

  const back = () => {
    if (stepIndex > 0) {
      setDirection(-1);
      setStepIndex((i) => i - 1);
    }
  };

  const toggle = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const toggleGoal = (g: string) => {
    setData((d) => {
      const next = d.goals.includes(g)
        ? d.goals.filter((x) => x !== g)
        : [...d.goals, g];
      // Clear fat-loss-specific fields if Lose Fat is deselected
      const clearFat = !next.includes("Lose Fat");
      return {
        ...d,
        goals: next,
        ...(clearFat ? { goalWeight: "", pace: "Balanced" } : {}),
      };
    });
  };

  const plan = useMemo(() => computePlan(data), [data]);

  // Derived BMI for display
  const w = parseFloat(data.weight) || 0;
  const h = parseFloat(data.height) || 0;
  const bmi = h > 0 ? (w / ((h / 100) ** 2)).toFixed(1) : "—";
  const bmiLabel = h > 0
    ? parseFloat(bmi) < 18.5 ? "Underweight" : parseFloat(bmi) < 25 ? "Normal" : parseFloat(bmi) < 30 ? "Overweight" : "Obese"
    : "";

  const ctaLabel = stepIndex === totalSteps - 1 ? "Start My Journey 🚀" : "Continue";
  const ctaDisabled = currentStep === "goal" && data.goals.length === 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 pt-14 pb-3">
        <div className="flex items-center justify-between mb-3">
          {stepIndex > 0 ? (
            <button onClick={back} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
              <ChevronLeft size={18} style={{ color: "var(--muted-foreground)" }} />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <span style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", fontWeight: 600 }}>
            {stepIndex + 1} / {totalSteps}
          </span>
          <div className="w-9" />
        </div>
        <div className="h-1.5 rounded-full" style={{ background: "var(--muted)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg,#F59E0B,#D97706)" }}
            animate={{ width: `${Math.max(progress, 4)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep + stepIndex}
            custom={direction}
            initial={{ x: direction * 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -32, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="pb-4"
          >

            {/* ── PERSONAL INFO ─────────────────────────────── */}
            {currentStep === "personal" && (
              <>
                <div className="pt-4 pb-6">
                  <div className="text-4xl mb-3">👤</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Tell us about yourself</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>Personalizes your AI nutrition plan</p>
                </div>
                <div className="flex flex-col gap-4">
                  <Field label="Full Name">
                    <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Alex Johnson" className="field-input" style={fieldStyle} />
                  </Field>
                  <Field label="Age">
                    <input type="number" value={data.age} onChange={(e) => setData({ ...data, age: e.target.value })} placeholder="28" className="field-input" style={fieldStyle} />
                  </Field>
                  <Field label="Biological Sex">
                    <div className="flex gap-2">
                      {["Male", "Female", "Other"].map((g) => (
                        <Chip key={g} active={data.gender === g} onClick={() => setData({ ...data, gender: g })}>{g}</Chip>
                      ))}
                    </div>
                  </Field>
                </div>
              </>
            )}

            {/* ── MEASUREMENTS ─────────────────────────────── */}
            {currentStep === "measurements" && (
              <>
                <div className="pt-4 pb-6">
                  <div className="text-4xl mb-3">⚖️</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Current measurements</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>Used to calculate your TDEE and calorie targets</p>
                </div>
                <div className="flex flex-col gap-4">
                  <Field label="Current Weight (kg)">
                    <div className="relative">
                      <input type="number" value={data.weight} onChange={(e) => setData({ ...data, weight: e.target.value })} placeholder="75" style={{ ...fieldStyle, paddingRight: "3rem" }} />
                      <Unit>kg</Unit>
                    </div>
                  </Field>
                  <Field label="Height (cm)">
                    <div className="relative">
                      <input type="number" value={data.height} onChange={(e) => setData({ ...data, height: e.target.value })} placeholder="170" style={{ ...fieldStyle, paddingRight: "3rem" }} />
                      <Unit>cm</Unit>
                    </div>
                  </Field>
                  {w > 0 && h > 0 && (
                    <div className="p-3.5 rounded-2xl flex items-center justify-between" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>Your BMI</span>
                      <span style={{ color: "#F59E0B", fontSize: "1rem", fontWeight: 800 }}>{bmi} · {bmiLabel}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── GOAL SELECTION ───────────────────────────── */}
            {currentStep === "goal" && (
              <>
                <div className="pt-4 pb-4">
                  <div className="text-4xl mb-3">🎯</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>What are your goals?</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>Select all that apply — your plan will be blended to match</p>
                </div>

                {/* Selected count badge */}
                <div className="flex items-center justify-between mb-3">
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
                    {data.goals.length === 0
                      ? "Tap to select one or more"
                      : `${data.goals.length} selected`}
                  </span>
                  {data.goals.length > 0 && (
                    <button
                      onClick={() => setData({ ...data, goals: [], goalWeight: "", pace: "Balanced" })}
                      style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", fontWeight: 600 }}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  {GOALS.map((g) => {
                    const active = data.goals.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGoal(g.id)}
                        className="flex items-center gap-3.5 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                        style={{
                          background: active ? "rgba(245,158,11,0.1)" : "var(--card)",
                          border: `1.5px solid ${active ? "#F59E0B" : "var(--border)"}`,
                        }}
                      >
                        <span style={{ fontSize: "1.6rem", flexShrink: 0 }}>{g.emoji}</span>
                        <div className="flex-1">
                          <p style={{ color: active ? "#F59E0B" : "var(--foreground)", fontSize: "0.95rem", fontWeight: 700 }}>{g.id}</p>
                          <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginTop: 1 }}>{g.desc}</p>
                        </div>
                        {/* Checkbox */}
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            border: `2px solid ${active ? "#F59E0B" : "var(--border)"}`,
                            background: active ? "#F59E0B" : "transparent",
                          }}
                        >
                          {active && <span style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 900 }}>✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Lose Fat note */}
                {data.goals.includes("Lose Fat") && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 px-4 py-3 rounded-2xl flex items-center gap-2"
                    style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}
                  >
                    <span style={{ fontSize: "1rem" }}>🏁</span>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", lineHeight: 1.5 }}>
                      You'll set a goal weight and pace on the next screens.
                    </p>
                  </motion.div>
                )}

                {/* Blended plan note when multiple selected */}
                {data.goals.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 px-4 py-3 rounded-2xl flex items-center gap-2"
                    style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)" }}
                  >
                    <span style={{ fontSize: "1rem" }}>🧠</span>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", lineHeight: 1.5 }}>
                      AI will blend your goals into a balanced plan — prioritising the order you selected.
                    </p>
                  </motion.div>
                )}
              </>
            )}

            {/* ── GOAL WEIGHT (Lose Fat only) ───────────────── */}
            {currentStep === "goalWeight" && (
              <>
                <div className="pt-4 pb-6">
                  <div className="text-4xl mb-3">🏁</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>What's your goal weight?</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>We'll calculate a realistic timeline to get there</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <input
                      type="number"
                      value={data.goalWeight}
                      onChange={(e) => setData({ ...data, goalWeight: e.target.value })}
                      placeholder="68"
                      style={{
                        ...fieldStyle,
                        fontSize: "2.2rem",
                        fontWeight: 900,
                        textAlign: "center",
                        paddingTop: "1.5rem",
                        paddingBottom: "1.5rem",
                        paddingRight: "4rem",
                        letterSpacing: "-0.03em",
                      }}
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)", fontSize: "1.1rem", fontWeight: 600 }}>kg</span>
                  </div>

                  {data.goalWeight && data.weight && (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "To lose", value: `${Math.max(0, parseFloat(data.weight) - parseFloat(data.goalWeight)).toFixed(1)} kg`, color: "#EF4444" },
                          { label: "Goal BMI", value: h > 0 ? (parseFloat(data.goalWeight) / ((h / 100) ** 2)).toFixed(1) : "—", color: "#10B981" },
                          { label: "Body fat est.", value: "~18%", color: "#8B5CF6" },
                        ].map((s) => (
                          <div key={s.label} className="py-3 px-2 rounded-2xl text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                            <p style={{ color: s.color, fontSize: "1rem", fontWeight: 800 }}>{s.value}</p>
                            <p style={{ color: "var(--muted-foreground)", fontSize: "0.65rem", marginTop: 2 }}>{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="p-3.5 rounded-2xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                        <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", lineHeight: 1.5 }}>
                          💡 A healthy loss rate is <strong style={{ color: "#F59E0B" }}>0.25–1 kg/week</strong>. You'll choose your pace on the next screen.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── PACE ────────────────────────────────────── */}
            {currentStep === "pace" && (
              <>
                <div className="pt-4 pb-6">
                  <div className="text-4xl mb-3">📈</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>How fast do you want to lose?</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>Choose a pace that fits your lifestyle</p>
                </div>
                <div className="flex flex-col gap-3">
                  {PACE_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setData({ ...data, pace: p.id })}
                      className="p-4 rounded-2xl text-left transition-all"
                      style={{
                        background: data.pace === p.id ? `${p.color}10` : "var(--card)",
                        border: `1.5px solid ${data.pace === p.id ? p.color : "var(--border)"}`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: "1.2rem" }}>{p.emoji}</span>
                          <span style={{ color: data.pace === p.id ? p.color : "var(--foreground)", fontSize: "0.95rem", fontWeight: 700 }}>{p.label}</span>
                          {p.recommended && (
                            <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", fontSize: "0.65rem", fontWeight: 800 }}>Recommended</span>
                          )}
                        </div>
                        <span style={{ color: data.pace === p.id ? p.color : "var(--muted-foreground)", fontSize: "0.82rem", fontWeight: 700 }}>{p.rate}</span>
                      </div>
                      <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>{p.desc}</p>
                      {data.pace === p.id && (
                        <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                          <span style={{ color: p.color, fontSize: "0.78rem", fontWeight: 600 }}>−{p.deficit} kcal/day deficit</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <PaceTimeline pace={data.pace} data={data} />
              </>
            )}

            {/* ── GOAL DATE ───────────────────────────────── */}
            {currentStep === "goalDate" && (
              <>
                <div className="pt-4 pb-6">
                  <div className="text-4xl mb-3">📅</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>By when?</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>Set a target to keep you accountable</p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {GOAL_DATES.map((d) => {
                    const isCustom = d === "Custom Date";
                    return (
                      <button
                        key={d}
                        onClick={() => setData({ ...data, goalDate: d })}
                        className="flex items-center justify-between px-4 py-4 rounded-2xl"
                        style={{
                          background: data.goalDate === d ? "rgba(245,158,11,0.1)" : "var(--card)",
                          border: `1.5px solid ${data.goalDate === d ? "#F59E0B" : "var(--border)"}`,
                        }}
                      >
                        <span style={{ color: data.goalDate === d ? "#F59E0B" : "var(--foreground)", fontSize: "0.95rem", fontWeight: 700 }}>{d}</span>
                        {!isCustom && (
                          <span style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                            {d === "3 Months" ? "~13 weeks" : d === "6 Months" ? "~26 weeks" : "~52 weeks"}
                          </span>
                        )}
                        {data.goalDate === d && <span style={{ color: "#F59E0B", fontSize: "0.8rem" }}>✓</span>}
                      </button>
                    );
                  })}
                  {data.goalDate === "Custom Date" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <input
                        type="date"
                        value={data.customDate}
                        onChange={(e) => setData({ ...data, customDate: e.target.value })}
                        style={{ ...fieldStyle, marginTop: 8 }}
                      />
                    </motion.div>
                  )}
                </div>
              </>
            )}

            {/* ── MOTIVATION ──────────────────────────────── */}
            {currentStep === "motivation" && (
              <>
                <div className="pt-4 pb-6">
                  <div className="text-4xl mb-3">✨</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>What are you looking to achieve?</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>Select all that apply — helps us personalise your coaching</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {MOTIVATIONS.map((m) => {
                    const active = data.motivations.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => setData({ ...data, motivations: toggle(data.motivations, m.id) })}
                        className="flex flex-col items-center py-4 px-3 rounded-2xl gap-2 transition-all"
                        style={{
                          background: active ? "rgba(245,158,11,0.1)" : "var(--card)",
                          border: `1.5px solid ${active ? "#F59E0B" : "var(--border)"}`,
                        }}
                      >
                        <span style={{ fontSize: "1.6rem" }}>{m.emoji}</span>
                        <span style={{ color: active ? "#F59E0B" : "var(--foreground)", fontSize: "0.78rem", fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>{m.id}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── ACTIVITY LEVEL ───────────────────────────── */}
            {currentStep === "activity" && (
              <>
                <div className="pt-4 pb-6">
                  <div className="text-4xl mb-3">🏃</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Activity level</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>Affects your calorie and macro calculations</p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {ACTIVITY_LEVELS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setData({ ...data, activity: a.id })}
                      className="flex items-center gap-3.5 px-4 py-4 rounded-2xl text-left transition-all"
                      style={{
                        background: data.activity === a.id ? "rgba(245,158,11,0.1)" : "var(--card)",
                        border: `1.5px solid ${data.activity === a.id ? "#F59E0B" : "var(--border)"}`,
                      }}
                    >
                      <div className="flex-1">
                        <p style={{ color: data.activity === a.id ? "#F59E0B" : "var(--foreground)", fontSize: "0.95rem", fontWeight: 700 }}>{a.label}</p>
                        <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginTop: 1 }}>{a.sub}</p>
                      </div>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", fontWeight: 600 }}>×{a.mul}</span>
                      {data.activity === a.id && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#F59E0B" }}>
                          <span style={{ color: "#fff", fontSize: "0.65rem" }}>✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── TRAINING FREQUENCY ───────────────────────── */}
            {currentStep === "trainingFreq" && (
              <>
                <div className="pt-4 pb-6">
                  <div className="text-4xl mb-3">🏋️</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Training frequency</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>How many days per week do you train?</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {TRAINING_FREQS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setData({ ...data, trainingFreq: t.id })}
                      className="py-5 px-4 rounded-2xl text-left transition-all"
                      style={{
                        background: data.trainingFreq === t.id ? "rgba(245,158,11,0.1)" : "var(--card)",
                        border: `1.5px solid ${data.trainingFreq === t.id ? "#F59E0B" : "var(--border)"}`,
                      }}
                    >
                      <p style={{ color: data.trainingFreq === t.id ? "#F59E0B" : "var(--foreground)", fontSize: "1rem", fontWeight: 800 }}>{t.label}</p>
                      <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", marginTop: 3 }}>{t.sub}</p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── DIET STYLE ───────────────────────────────── */}
            {currentStep === "dietStyle" && (
              <>
                <div className="pt-4 pb-4">
                  <div className="text-4xl mb-3">🥗</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Dietary preferences</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>Select all that apply — shapes every meal suggestion</p>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
                    {data.dietStyles.length === 0 ? "Tap to select" : `${data.dietStyles.length} selected`}
                  </span>
                  {data.dietStyles.length > 0 && (
                    <button
                      onClick={() => setData({ ...data, dietStyles: [] })}
                      style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", fontWeight: 600 }}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {DIET_STYLES.map((d) => {
                    const active = data.dietStyles.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        onClick={() => setData({ ...data, dietStyles: toggle(data.dietStyles, d.id) })}
                        className="py-4 px-3 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-[0.97] relative"
                        style={{
                          background: active ? "rgba(245,158,11,0.1)" : "var(--card)",
                          border: `1.5px solid ${active ? "#F59E0B" : "var(--border)"}`,
                        }}
                      >
                        {active && (
                          <div
                            className="absolute top-2 right-2 w-4 h-4 rounded-md flex items-center justify-center"
                            style={{ background: "#F59E0B" }}
                          >
                            <span style={{ color: "#fff", fontSize: "0.55rem", fontWeight: 900 }}>✓</span>
                          </div>
                        )}
                        <span style={{ fontSize: "1.8rem" }}>{d.emoji}</span>
                        <span style={{ color: active ? "#F59E0B" : "var(--foreground)", fontSize: "0.82rem", fontWeight: 700 }}>{d.id}</span>
                      </button>
                    );
                  })}
                </div>

                {data.dietStyles.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 px-4 py-3 rounded-2xl flex items-center gap-2"
                    style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}
                  >
                    <span style={{ fontSize: "1rem" }}>🧠</span>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", lineHeight: 1.5 }}>
                      AI will balance your selections — e.g. Mediterranean + Keto = high-fat, whole-food meals.
                    </p>
                  </motion.div>
                )}
              </>
            )}

            {/* ── DIETARY RESTRICTIONS ─────────────────────── */}
            {currentStep === "restrictions" && (
              <>
                <div className="pt-4 pb-6">
                  <div className="text-4xl mb-3">🚫</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Dietary restrictions</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>Select all that apply</p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {RESTRICTIONS.map((r) => {
                    const active = data.restrictions.includes(r);
                    return (
                      <button
                        key={r}
                        onClick={() => setData({ ...data, restrictions: toggle(data.restrictions, r) })}
                        className="flex items-center justify-between px-4 py-4 rounded-2xl transition-all"
                        style={{
                          background: active ? "rgba(245,158,11,0.1)" : "var(--card)",
                          border: `1.5px solid ${active ? "#F59E0B" : "var(--border)"}`,
                        }}
                      >
                        <span style={{ color: active ? "#F59E0B" : "var(--foreground)", fontSize: "0.95rem", fontWeight: 700 }}>{r}</span>
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center"
                          style={{ border: `2px solid ${active ? "#F59E0B" : "var(--border)"}`, background: active ? "#F59E0B" : "transparent" }}
                        >
                          {active && <span style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 900 }}>✓</span>}
                        </div>
                      </button>
                    );
                  })}
                  {data.restrictions.includes("Other") && (
                    <motion.input
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      placeholder="Describe your restriction..."
                      value={data.otherRestriction}
                      onChange={(e) => setData({ ...data, otherRestriction: e.target.value })}
                      style={{ ...fieldStyle, marginTop: 4 }}
                    />
                  )}
                  <button
                    onClick={() => setData({ ...data, restrictions: [] })}
                    className="py-3 rounded-2xl"
                    style={{ border: "1.5px dashed var(--border)", color: "var(--muted-foreground)", fontSize: "0.875rem", fontWeight: 600 }}
                  >
                    No restrictions
                  </button>
                </div>
              </>
            )}

            {/* ── FOODS TO AVOID ───────────────────────────── */}
            {currentStep === "avoidFoods" && (
              <>
                <div className="pt-4 pb-4">
                  <div className="text-4xl mb-3">🙅</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Foods to avoid</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>Optional — we'll never suggest these in your plan</p>
                </div>
                {data.avoidFoods.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {data.avoidFoods.map((f) => (
                      <span
                        key={f}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", fontSize: "0.75rem", fontWeight: 600 }}
                      >
                        {f}
                        <button onClick={() => setData({ ...data, avoidFoods: data.avoidFoods.filter((x) => x !== f) })}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {Object.entries(AVOID_FOODS).map(([cat, { emoji, items }]) => {
                    const isOpen = openFoodCategory === cat;
                    const selectedInCat = items.filter((i) => data.avoidFoods.includes(i));
                    return (
                      <div key={cat} className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                        <button
                          onClick={() => setOpenFoodCategory(isOpen ? null : cat)}
                          className="w-full flex items-center justify-between px-4 py-3.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <span style={{ fontSize: "1.2rem" }}>{emoji}</span>
                            <span style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 700 }}>{cat}</span>
                            {selectedInCat.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444", fontSize: "0.65rem", fontWeight: 800 }}>
                                {selectedInCat.length} avoided
                              </span>
                            )}
                          </div>
                          <ChevronRight size={16} style={{ color: "var(--muted-foreground)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3 flex flex-wrap gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                            {items.map((item) => {
                              const avoided = data.avoidFoods.includes(item);
                              return (
                                <button
                                  key={item}
                                  onClick={() => setData({ ...data, avoidFoods: toggle(data.avoidFoods, item) })}
                                  className="px-3 py-1.5 rounded-full transition-all"
                                  style={{
                                    marginTop: 8,
                                    background: avoided ? "rgba(239,68,68,0.1)" : "var(--muted)",
                                    border: `1.5px solid ${avoided ? "#EF4444" : "transparent"}`,
                                    color: avoided ? "#EF4444" : "var(--foreground)",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  {avoided ? "✕ " : ""}{item}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── ALLERGIES ────────────────────────────────── */}
            {currentStep === "allergies" && (
              <>
                <div className="pt-4 pb-6">
                  <div className="text-4xl mb-3">⚠️</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Allergies</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>We'll strictly exclude these from your meal plan</p>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {COMMON_ALLERGIES.map((a) => {
                    const active = data.allergies.includes(a);
                    return (
                      <button
                        key={a}
                        onClick={() => setData({ ...data, allergies: toggle(data.allergies, a) })}
                        className="px-3.5 py-2 rounded-full transition-all"
                        style={{
                          background: active ? "rgba(239,68,68,0.12)" : "var(--card)",
                          border: `1.5px solid ${active ? "#EF4444" : "var(--border)"}`,
                          color: active ? "#EF4444" : "var(--foreground)",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                        }}
                      >
                        {active ? "⚠️ " : ""}{a}
                      </button>
                    );
                  })}
                </div>

                {/* Custom allergy entry */}
                <div className="flex gap-2">
                  <input
                    placeholder="Add custom allergy..."
                    value={customAllergyInput}
                    onChange={(e) => setCustomAllergyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customAllergyInput.trim()) {
                        setData({ ...data, allergies: [...data.allergies, customAllergyInput.trim()] });
                        setCustomAllergyInput("");
                      }
                    }}
                    style={{ ...fieldStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => {
                      if (customAllergyInput.trim()) {
                        setData({ ...data, allergies: [...data.allergies, customAllergyInput.trim()] });
                        setCustomAllergyInput("");
                      }
                    }}
                    className="px-4 py-3 rounded-xl"
                    style={{ background: "#F59E0B", color: "#fff", fontSize: "0.875rem", fontWeight: 700, flexShrink: 0 }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {data.allergies.length > 0 && (
                  <div className="mt-4 p-3.5 rounded-2xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <p style={{ color: "#EF4444", fontSize: "0.78rem", fontWeight: 700, marginBottom: 6 }}>⚠️ Strictly avoided in your plan:</p>
                    <p style={{ color: "var(--foreground)", fontSize: "0.82rem" }}>{data.allergies.join(", ")}</p>
                  </div>
                )}
                <button
                  onClick={() => setData({ ...data, allergies: [] })}
                  className="w-full mt-3 py-3 rounded-2xl"
                  style={{ border: "1.5px dashed var(--border)", color: "var(--muted-foreground)", fontSize: "0.875rem", fontWeight: 600 }}
                >
                  No allergies
                </button>
              </>
            )}

            {/* ── HEALTH APPS ──────────────────────────────── */}
            {currentStep === "healthApps" && (
              <>
                <div className="pt-4 pb-5">
                  <div className="text-4xl mb-3">📲</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Connect health apps</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>
                    Sync steps, workouts, sleep & more — your data stays private and on-device
                  </p>
                </div>

                {/* Privacy note */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl mb-4" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)" }}>
                  <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🔒</span>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", lineHeight: 1.5 }}>
                    DietBuddy reads data from your health app but <strong style={{ color: "var(--foreground)" }}>never writes to it</strong> without your permission. Data is encrypted and never sold.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {HEALTH_PLATFORMS.map((platform) => {
                    const connected = data.connectedApps.includes(platform.id);
                    return (
                      <div
                        key={platform.id}
                        className="flex items-center gap-3.5 p-4 rounded-2xl transition-all"
                        style={{
                          background: connected ? `${platform.color}0d` : "var(--card)",
                          border: `1.5px solid ${connected ? platform.color : "var(--border)"}`,
                        }}
                      >
                        {/* Platform icon */}
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                          style={{ background: connected ? `${platform.color}18` : "var(--muted)" }}
                        >
                          {platform.emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p style={{ color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 700 }}>{platform.name}</p>
                          <p style={{ color: "var(--muted-foreground)", fontSize: "0.74rem", marginTop: 1, lineHeight: 1.4 }}>{platform.sub}</p>
                          {connected && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
                              <span style={{ color: "#10B981", fontSize: "0.7rem", fontWeight: 700 }}>Connected · Syncing</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            setData({
                              ...data,
                              connectedApps: connected
                                ? data.connectedApps.filter((id) => id !== platform.id)
                                : [...data.connectedApps, platform.id],
                            })
                          }
                          className="flex-shrink-0 px-4 py-2 rounded-xl transition-all active:scale-[0.96]"
                          style={{
                            background: connected ? "rgba(239,68,68,0.08)" : platform.color,
                            color: connected ? "#EF4444" : "#fff",
                            border: connected ? "1px solid rgba(239,68,68,0.2)" : "none",
                            fontSize: "0.8rem",
                            fontWeight: 800,
                          }}
                        >
                          {connected ? "Disconnect" : "Connect"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* What syncs */}
                {data.connectedApps.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-2xl"
                    style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)" }}
                  >
                    <p style={{ color: "#10B981", fontSize: "0.78rem", fontWeight: 800, marginBottom: 8 }}>
                      ✓ What DietBuddy will read:
                    </p>
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
                      {[
                        "Steps & distance",
                        "Active calories burned",
                        "Workout history",
                        "Resting heart rate",
                        "Sleep duration",
                        "Body weight entries",
                        "VO2 max (if available)",
                        "Mindful minutes",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-1.5">
                          <span style={{ color: "#10B981", fontSize: "0.7rem" }}>✓</span>
                          <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </>
            )}

            {/* ── DEVICES ──────────────────────────────────── */}
            {currentStep === "devices" && (
              <>
                <div className="pt-4 pb-5">
                  <div className="text-4xl mb-3">📡</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Connect your devices</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>
                    Smart scales and wearables auto-log your weight and activity
                  </p>
                </div>

                {/* Smart scales */}
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
                  Smart Scales
                </p>
                <div className="flex flex-col gap-2.5 mb-5">
                  {SMART_SCALES.map((scale) => {
                    const connected = data.connectedScale === scale.id;
                    return (
                      <div
                        key={scale.id}
                        className="flex items-center gap-3 p-3.5 rounded-2xl transition-all"
                        style={{
                          background: connected ? `${scale.color}0d` : "var(--card)",
                          border: `1.5px solid ${connected ? scale.color : "var(--border)"}`,
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                          style={{ background: connected ? `${scale.color}18` : "var(--muted)" }}
                        >
                          {scale.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 700 }}>{scale.name}</p>
                          <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{scale.sub}</p>
                          {connected && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
                              <span style={{ color: "#10B981", fontSize: "0.68rem", fontWeight: 700 }}>Paired via Bluetooth</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            setData({ ...data, connectedScale: connected ? "" : scale.id })
                          }
                          className="flex-shrink-0 px-3.5 py-2 rounded-xl transition-all active:scale-[0.96]"
                          style={{
                            background: connected ? "rgba(239,68,68,0.08)" : `${scale.color}18`,
                            color: connected ? "#EF4444" : scale.color,
                            border: `1px solid ${connected ? "rgba(239,68,68,0.2)" : `${scale.color}30`}`,
                            fontSize: "0.78rem",
                            fontWeight: 800,
                          }}
                        >
                          {connected ? "Remove" : "Pair"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Wearables */}
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
                  Wearables
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {WEARABLES.map((w) => {
                    const connected = data.connectedWearables.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        onClick={() =>
                          setData({
                            ...data,
                            connectedWearables: connected
                              ? data.connectedWearables.filter((id) => id !== w.id)
                              : [...data.connectedWearables, w.id],
                          })
                        }
                        className="flex flex-col p-3.5 rounded-2xl text-left transition-all active:scale-[0.97]"
                        style={{
                          background: connected ? `${w.color}0d` : "var(--card)",
                          border: `1.5px solid ${connected ? w.color : "var(--border)"}`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span style={{ fontSize: "1.4rem" }}>{w.emoji}</span>
                          {connected && (
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center"
                              style={{ background: w.color }}
                            >
                              <span style={{ color: "#fff", fontSize: "0.55rem", fontWeight: 900 }}>✓</span>
                            </div>
                          )}
                        </div>
                        <p style={{ color: connected ? w.color : "var(--foreground)", fontSize: "0.82rem", fontWeight: 800, lineHeight: 1.2 }}>
                          {w.name}
                        </p>
                        <p style={{ color: "var(--muted-foreground)", fontSize: "0.68rem", marginTop: 2, lineHeight: 1.3 }}>{w.sub}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Connection summary */}
                {(data.connectedScale || data.connectedWearables.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-2xl"
                    style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
                  >
                    <p style={{ color: "#F59E0B", fontSize: "0.78rem", fontWeight: 800, marginBottom: 6 }}>
                      🔗 Connected devices
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.connectedScale && (
                        <span className="px-2.5 py-1 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B", fontSize: "0.72rem", fontWeight: 700 }}>
                          ⚖️ {SMART_SCALES.find((s) => s.id === data.connectedScale)?.name}
                        </span>
                      )}
                      {data.connectedWearables.map((id) => {
                        const w = WEARABLES.find((x) => x.id === id);
                        return w ? (
                          <span key={id} className="px-2.5 py-1 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B", fontSize: "0.72rem", fontWeight: 700 }}>
                            {w.emoji} {w.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", marginTop: 6 }}>
                      Weight & activity will sync automatically. You can manage this in Settings.
                    </p>
                  </motion.div>
                )}
              </>
            )}

            {/* ── AI PLAN OVERVIEW ─────────────────────────── */}
            {currentStep === "aiPlan" && (
              <>
                <div className="pt-4 pb-4">
                  <div className="text-4xl mb-3">🎉</div>
                  <h2 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Your AI Plan</h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginTop: 4 }}>Personalized based on your profile · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
                <AIPlanOverview data={data} />
              </>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Banner ad — shown on every step except personal info (0) and AI plan (last) */}
      {currentStep !== "personal" && currentStep !== "aiPlan" && (
        <div className="px-5 pt-2 shrink-0">
          <BannerAd key={currentStep} variant="slim" dismissible />
        </div>
      )}

      {/* CTA */}
      <div className="px-5 pb-10 pt-2 shrink-0">
        <button
          onClick={next}
          disabled={ctaDisabled}
          className="w-full py-4 rounded-2xl text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{
            background: ctaDisabled
              ? "var(--muted)"
              : "linear-gradient(135deg,#F59E0B,#D97706)",
            fontSize: "1rem",
            fontWeight: 800,
            boxShadow: ctaDisabled ? "none" : "0 8px 24px rgba(245,158,11,0.35)",
            color: ctaDisabled ? "var(--muted-foreground)" : "#fff",
            cursor: ctaDisabled ? "not-allowed" : "pointer",
          }}
        >
          {ctaDisabled ? "Select at least one goal" : ctaLabel}
          {!ctaDisabled && stepIndex < totalSteps - 1 && <ChevronRight size={18} />}
        </button>
        {/* Skip optional steps */}
        {["avoidFoods", "allergies", "motivation", "healthApps", "devices"].includes(currentStep) && (
          <button
            onClick={next}
            className="w-full mt-2.5 py-2.5 rounded-2xl"
            style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", fontWeight: 600 }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1.5px solid var(--border)",
  background: "var(--input-background)",
  color: "var(--foreground)",
  fontSize: "1rem",
  fontFamily: "inherit",
  outline: "none",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 700, display: "block", marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)", fontSize: "0.9rem", fontWeight: 600, pointerEvents: "none" }}>
      {children}
    </span>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-3 rounded-xl transition-all"
      style={{
        background: active ? "#F59E0B" : "var(--input-background)",
        border: `1.5px solid ${active ? "#F59E0B" : "var(--border)"}`,
        color: active ? "#fff" : "var(--muted-foreground)",
        fontSize: "0.875rem",
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}
