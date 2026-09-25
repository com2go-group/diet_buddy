import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, ChevronRight, Plus, Search, X, Play } from "lucide-react";

const mealCategories = [
  {
    id: "breakfast",
    label: "Breakfast",
    emoji: "🌅",
    time: "8:00 AM",
    cals: 380,
    target: 400,
    items: [
      { name: "Oatmeal with Almond Milk", portion: "250g", cals: 220, protein: 8, carbs: 38, fat: 5, logged: true },
      { name: "Mixed Berries", portion: "100g", cals: 60, protein: 1, carbs: 14, fat: 0, logged: true },
      { name: "Coffee with Oat Milk", portion: "200ml", cals: 40, protein: 1, carbs: 6, fat: 1, logged: true },
      { name: "Chia Seeds", portion: "15g", cals: 60, protein: 2, carbs: 5, fat: 4, logged: true },
    ],
  },
  {
    id: "lunch",
    label: "Lunch",
    emoji: "☀️",
    time: "12:30 PM",
    cals: 520,
    target: 550,
    items: [
      { name: "Grilled Chicken Breast", portion: "150g", cals: 248, protein: 46, carbs: 0, fat: 5, logged: true },
      { name: "Mixed Salad", portion: "200g", cals: 60, protein: 2, carbs: 10, fat: 1, logged: true },
      { name: "Olive Oil Dressing", portion: "15ml", cals: 120, protein: 0, carbs: 0, fat: 14, logged: true },
      { name: "Sourdough Bread", portion: "1 slice", cals: 92, protein: 3, carbs: 17, fat: 1, logged: true },
    ],
  },
  {
    id: "snack",
    label: "Snack",
    emoji: "🍎",
    time: "3:30 PM",
    cals: 0,
    target: 180,
    items: [],
  },
  {
    id: "dinner",
    label: "Dinner",
    emoji: "🌙",
    time: "7:00 PM",
    cals: 0,
    target: 650,
    items: [],
  },
];

const suggestions = [
  { name: "Greek Yogurt Parfait", cals: 180, protein: 15, emoji: "🫙", match: "92%" },
  { name: "Apple with Almond Butter", cals: 210, protein: 6, emoji: "🍎", match: "88%" },
  { name: "Protein Shake", cals: 160, protein: 25, emoji: "🥤", match: "85%" },
];

// ── Item row ──────────────────────────────────────────────────────────────────
function ItemRow({ item, blurred }: { item: typeof mealCategories[0]["items"][0]; blurred: boolean }) {
  return (
    <div
      className="p-3 rounded-2xl flex items-center gap-3 transition-all"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        filter: blurred ? "blur(5px)" : "none",
        userSelect: blurred ? "none" : "auto",
        pointerEvents: blurred ? "none" : "auto",
        transition: "filter 0.35s ease",
      }}
    >
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span style={{ color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 600 }}>{item.name}</span>
          <span style={{ color: "#F59E0B", fontSize: "0.85rem", fontWeight: 700 }}>{item.cals} kcal</span>
        </div>
        <div className="flex gap-3 mt-1">
          {[
            { l: "P", v: item.protein, c: "#10B981" },
            { l: "C", v: item.carbs, c: "#3B82F6" },
            { l: "F", v: item.fat, c: "#8B5CF6" },
          ].map((mac) => (
            <span key={mac.l} style={{ color: mac.c, fontSize: "0.72rem", fontWeight: 600 }}>{mac.l}: {mac.v}g</span>
          ))}
          <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>· {item.portion}</span>
        </div>
      </div>
    </div>
  );
}

// ── Watch-to-reveal gate ──────────────────────────────────────────────────────
function WatchGate({ count, onWatch }: { count: number; onWatch: () => void }) {
  return (
    <div className="relative my-1">
      {/* Gradient mask over blurred rows */}
      <div
        className="absolute inset-x-0 -top-4 h-8 pointer-events-none z-10"
        style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }}
      />

      <button
        onClick={onWatch}
        className="relative z-20 w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04))",
          border: "1.5px solid rgba(245,158,11,0.35)",
        }}
      >
        {/* Play icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", boxShadow: "0 4px 12px rgba(245,158,11,0.4)" }}
        >
          <Play size={16} className="text-white" style={{ marginLeft: 2 }} />
        </div>

        <div className="flex-1 text-left">
          <p style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 800 }}>
            Watch a short video to reveal
          </p>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", marginTop: 1 }}>
            {count} more item{count !== 1 ? "s" : ""} hidden · earn +50 XP
          </p>
        </div>

        <span
          className="px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: "#F59E0B", color: "#fff", fontSize: "0.68rem", fontWeight: 800 }}
        >
          FREE
        </span>
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface MealsScreenProps {
  onShowAd?: (onUnlock: () => void) => void;
}

export function MealsScreen({ onShowAd }: MealsScreenProps) {
  const [activeTab, setActiveTab] = useState("breakfast");
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  // Track which meal tabs have been unlocked via ad
  const [unlockedTabs, setUnlockedTabs] = useState<Set<string>>(new Set());
  // Track whether suggestions section is unlocked
  const [suggestionsUnlocked, setSuggestionsUnlocked] = useState(false);

  const activeMeal = mealCategories.find((m) => m.id === activeTab)!;
  const totalCals = mealCategories.reduce((sum, m) => sum + m.cals, 0);
  const targetCals = mealCategories.reduce((sum, m) => sum + m.target, 0);

  const tabUnlocked = unlockedTabs.has(activeTab);

  const unlockTab = (tabId: string) =>
    setUnlockedTabs((prev) => new Set([...prev, tabId]));

  const handleWatchForTab = () =>
    onShowAd?.(() => unlockTab(activeTab));

  const handleWatchForSuggestions = () =>
    onShowAd?.(() => setSuggestionsUnlocked(true));

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-5 pt-14 pb-4" style={{ background: "linear-gradient(180deg,rgba(245,158,11,0.06) 0%,transparent 100%)" }}>
        <div className="flex items-center justify-between mb-4">
          <h1 style={{ color: "var(--foreground)", fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Meals</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
            style={{ background: "#F59E0B", color: "#fff", fontSize: "0.85rem", fontWeight: 700 }}
          >
            <Plus size={16} /> Log Food
          </button>
        </div>

        {/* Calorie summary */}
        <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", fontWeight: 500 }}>Calories Today</span>
            <span style={{ color: "#F59E0B", fontSize: "0.85rem", fontWeight: 700 }}>{totalCals} / {targetCals} kcal</span>
          </div>
          <div className="h-2 rounded-full mb-3" style={{ background: "var(--muted)" }}>
            <div className="h-full rounded-full" style={{ width: `${(totalCals / targetCals) * 100}%`, background: "linear-gradient(90deg,#F59E0B,#D97706)" }} />
          </div>
          <div className="flex gap-4">
            {[
              { label: "Protein", val: "87g", color: "#10B981" },
              { label: "Carbs", val: "142g", color: "#3B82F6" },
              { label: "Fat", val: "38g", color: "#8B5CF6" },
              { label: "Remaining", val: "410 kcal", color: "#F59E0B" },
            ].map((m) => (
              <div key={m.label} className="flex flex-col items-center">
                <span style={{ color: m.color, fontSize: "0.85rem", fontWeight: 700 }}>{m.val}</span>
                <span style={{ color: "var(--muted-foreground)", fontSize: "0.65rem", fontWeight: 500 }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Meal tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-2">
          {mealCategories.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveTab(m.id)}
              className="flex-1 flex flex-col items-center py-2.5 rounded-2xl transition-all"
              style={{
                background: activeTab === m.id ? "#F59E0B" : "var(--card)",
                border: `1px solid ${activeTab === m.id ? "#F59E0B" : "var(--border)"}`,
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{m.emoji}</span>
              <span style={{ color: activeTab === m.id ? "#fff" : "var(--muted-foreground)", fontSize: "0.65rem", fontWeight: 700, marginTop: 2 }}>
                {m.label}
              </span>
              {/* Lock indicator */}
              {m.items.length > 1 && !unlockedTabs.has(m.id) && activeTab !== m.id && (
                <span style={{ color: activeTab === m.id ? "rgba(255,255,255,0.7)" : "var(--muted-foreground)", fontSize: "0.55rem", marginTop: 1 }}>🔒</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Meal content */}
      <div className="flex-1 px-5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 style={{ color: "var(--foreground)", fontSize: "1rem", fontWeight: 700 }}>
                  {activeMeal.label} · {activeMeal.time}
                </h2>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
                  {activeMeal.cals} of {activeMeal.target} kcal
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.1)" }}
              >
                <Plus size={16} style={{ color: "#F59E0B" }} />
              </button>
            </div>

            {activeMeal.items.length > 0 ? (
              <div className="flex flex-col gap-2 mb-4">
                {activeMeal.items.map((item, idx) => {
                  const isFirst = idx === 0;
                  const isLocked = !tabUnlocked && !isFirst;

                  return (
                    <div key={item.name}>
                      {/* Show the gate CTA right after the first row */}
                      {idx === 1 && !tabUnlocked && (
                        <WatchGate
                          count={activeMeal.items.length - 1}
                          onWatch={handleWatchForTab}
                        />
                      )}
                      <ItemRow item={item} blurred={isLocked} />
                    </div>
                  );
                })}

                {/* Unlock confirmation badge */}
                {tabUnlocked && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}
                  >
                    <span style={{ fontSize: "0.9rem" }}>✓</span>
                    <span style={{ color: "#10B981", fontSize: "0.75rem", fontWeight: 700 }}>All items unlocked · +50 XP earned</span>
                  </motion.div>
                )}
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-10 rounded-2xl mb-4"
                style={{ border: "2px dashed var(--border)" }}
              >
                <span style={{ fontSize: "2.5rem", marginBottom: 8 }}>{activeMeal.emoji}</span>
                <p style={{ color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 600 }}>Nothing logged yet</p>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: 4 }}>Target: {activeMeal.target} kcal</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 px-4 py-2 rounded-xl"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", fontSize: "0.85rem", fontWeight: 700 }}
                >
                  + Add food
                </button>
              </div>
            )}

            {/* AI Suggestions */}
            <div className="mb-6">
              <h3 style={{ color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 700, marginBottom: 8 }}>
                🤖 AI Suggestions for {activeMeal.label}
              </h3>

              {suggestionsUnlocked ? (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-2"
                  >
                    {suggestions.map((s) => (
                      <div
                        key={s.name}
                        className="flex items-center justify-between p-3 rounded-2xl"
                        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                      >
                        <div className="flex items-center gap-3">
                          <span style={{ fontSize: "1.4rem" }}>{s.emoji}</span>
                          <div>
                            <p style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 600 }}>{s.name}</p>
                            <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{s.cals} kcal · {s.protein}g protein</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", fontSize: "0.68rem", fontWeight: 700 }}>
                            {s.match} match
                          </span>
                          <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#F59E0B" }}>
                            <Plus size={14} style={{ color: "#fff" }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </>
              ) : (
                <>
                  {/* First suggestion — visible */}
                  <div
                    className="flex items-center justify-between p-3 rounded-2xl mb-2"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: "1.4rem" }}>{suggestions[0].emoji}</span>
                      <div>
                        <p style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 600 }}>{suggestions[0].name}</p>
                        <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{suggestions[0].cals} kcal · {suggestions[0].protein}g protein</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", fontSize: "0.68rem", fontWeight: 700 }}>
                      {suggestions[0].match} match
                    </span>
                  </div>

                  {/* Watch gate for the remaining suggestions */}
                  <WatchGate count={suggestions.length - 1} onWatch={handleWatchForSuggestions} />

                  {/* Blurred previews */}
                  {suggestions.slice(1).map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between p-3 rounded-2xl mb-1.5"
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        filter: "blur(5px)",
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: "1.4rem" }}>{s.emoji}</span>
                        <div>
                          <p style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 600 }}>{s.name}</p>
                          <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{s.cals} kcal · {s.protein}g protein</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", fontSize: "0.68rem", fontWeight: 700 }}>
                        {s.match} match
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Camera scan */}
            <button
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 mb-8"
              style={{ background: "var(--card)", border: "2px dashed rgba(245,158,11,0.3)" }}
            >
              <Camera size={18} style={{ color: "#F59E0B" }} />
              <span style={{ color: "#F59E0B", fontSize: "0.9rem", fontWeight: 700 }}>Scan food with AI camera</span>
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Add food modal */}
      {showAddModal && (
        <div
          className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="rounded-t-3xl p-5"
            style={{ background: "var(--background)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ color: "var(--foreground)", fontSize: "1.1rem", fontWeight: 700 }}>Log Food</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--muted)" }}
              >
                <X size={16} style={{ color: "var(--muted-foreground)" }} />
              </button>
            </div>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
              <input
                autoFocus
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search food or scan barcode..."
                className="w-full pl-9 pr-4 py-3 rounded-xl outline-none"
                style={{
                  background: "var(--input-background)",
                  border: "1.5px solid var(--border)",
                  color: "var(--foreground)",
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div className="flex gap-2 mb-4">
              {["Frequent", "Favorites", "Recent", "My Meals"].map((t) => (
                <button
                  key={t}
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    background: t === "Recent" ? "#F59E0B" : "var(--muted)",
                    color: t === "Recent" ? "#fff" : "var(--muted-foreground)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {["Greek Yogurt", "Banana", "Chicken Breast", "Brown Rice", "Almonds", "Protein Bar"]
                .filter((f) => !searchQ || f.toLowerCase().includes(searchQ.toLowerCase()))
                .map((food) => (
                  <div
                    key={food}
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                  >
                    <span style={{ color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 500 }}>{food}</span>
                    <button
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "#F59E0B" }}
                    >
                      <Plus size={14} style={{ color: "#fff" }} />
                    </button>
                  </div>
                ))}
            </div>
            <button
              className="w-full mt-4 py-3.5 rounded-2xl flex items-center justify-center gap-2"
              style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "0.9rem", fontWeight: 600 }}
            >
              <Camera size={16} /> AI Photo Scan
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
