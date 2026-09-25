import { useState } from "react";
import { X, Camera, Search, ScanLine, Zap, Check } from "lucide-react";

interface RestaurantScreenProps {
  onClose: () => void;
}

const restaurantItems = [
  { name: "Grilled Salmon Bowl", cals: 520, protein: 38, carbs: 45, fat: 14, score: 95, badge: "Best Choice", emoji: "🐟", badgeColor: "#10B981" },
  { name: "Caesar Salad (dressing side)", cals: 380, protein: 22, carbs: 18, fat: 24, score: 82, badge: "Good Choice", emoji: "🥗", badgeColor: "#F59E0B" },
  { name: "Chicken Tacos (2)", cals: 640, protein: 32, carbs: 62, fat: 22, score: 74, badge: "Moderate", emoji: "🌮", badgeColor: "#F59E0B" },
  { name: "Beef Burger + Fries", cals: 1120, protein: 42, carbs: 98, fat: 56, score: 35, badge: "High Cal", emoji: "🍔", badgeColor: "#EF4444" },
  { name: "Margherita Pizza (2 sl)", cals: 580, protein: 22, carbs: 78, fat: 18, score: 52, badge: "Moderate", emoji: "🍕", badgeColor: "#F59E0B" },
  { name: "Poke Bowl (tuna)", cals: 490, protein: 30, carbs: 58, fat: 12, score: 88, badge: "Great Choice", emoji: "🍱", badgeColor: "#10B981" },
];

export function RestaurantScreen({ onClose }: RestaurantScreenProps) {
  const [mode, setMode] = useState<"home" | "scan" | "results">("home");
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const startScan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); setMode("results"); }, 2200);
  };

  const filteredItems = restaurantItems.filter((i) =>
    search === "" || i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center gap-3" style={{ background: "linear-gradient(180deg,rgba(245,158,11,0.06) 0%,transparent 100%)", borderBottom: "1px solid var(--border)" }}>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
          <X size={16} style={{ color: "var(--muted-foreground)" }} />
        </button>
        <div>
          <h1 style={{ color: "var(--foreground)", fontSize: "1.2rem", fontWeight: 800 }}>Restaurant Mode</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>AI-smart menu analysis</p>
        </div>
        <span className="ml-auto px-2.5 py-1 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", fontSize: "0.7rem", fontWeight: 700 }}>Premium</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>
        {mode === "home" && (
          <>
            {/* Budget bar */}
            <div className="p-4 rounded-2xl mb-5" style={{ background: "linear-gradient(135deg,#1A1A2E,#16213E)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <p style={{ color: "#94A3B8", fontSize: "0.75rem", fontWeight: 600, marginBottom: 4 }}>Remaining calories for dinner</p>
              <p style={{ color: "#F59E0B", fontSize: "2rem", fontWeight: 900, lineHeight: 1 }}>650</p>
              <p style={{ color: "#64748B", fontSize: "0.75rem" }}>kcal budget · 45g protein still needed</p>
            </div>

            {/* Scan menu */}
            <button
              onClick={startScan}
              className="w-full p-5 rounded-3xl mb-4 flex flex-col items-center transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.1),rgba(245,158,11,0.03))", border: "2px dashed rgba(245,158,11,0.3)" }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(245,158,11,0.15)" }}>
                <ScanLine size={28} style={{ color: "#F59E0B" }} />
              </div>
              <p style={{ color: "var(--foreground)", fontSize: "1rem", fontWeight: 800 }}>Scan Menu</p>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: 4 }}>Point camera at the restaurant menu</p>
            </button>

            {/* Or search */}
            <button
              onClick={() => setMode("results")}
              className="w-full p-4 rounded-2xl flex items-center gap-3 mb-4"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <Search size={18} style={{ color: "var(--muted-foreground)" }} />
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>Search restaurant or menu item...</span>
            </button>

            {/* Recent restaurants */}
            <h3 style={{ color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 700, marginBottom: 10 }}>Recent Restaurants</h3>
            {[
              { name: "Sweetgreen", cuisine: "Salads", emoji: "🥗", lastVisit: "3 days ago" },
              { name: "Chipotle", cuisine: "Mexican", emoji: "🌯", lastVisit: "1 week ago" },
              { name: "The Protein Bar", cuisine: "Health Food", emoji: "💪", lastVisit: "2 weeks ago" },
            ].map((r) => (
              <button
                key={r.name}
                onClick={() => setMode("results")}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-2"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <span style={{ fontSize: "1.6rem" }}>{r.emoji}</span>
                <div className="flex-1 text-left">
                  <p style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 700 }}>{r.name}</p>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{r.cuisine} · {r.lastVisit}</p>
                </div>
                <span style={{ color: "#F59E0B", fontSize: "0.72rem", fontWeight: 600 }}>View menu →</span>
              </button>
            ))}
          </>
        )}

        {/* Scanning animation */}
        {scanning && (
          <div className="flex flex-col items-center justify-center py-16">
            <div
              className="relative w-52 h-36 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: "var(--muted)", border: "2px solid rgba(245,158,11,0.3)" }}
            >
              <span style={{ fontSize: "2rem" }}>🍽️</span>
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginLeft: 8 }}>Menu text here</span>
              <div
                className="absolute w-full h-0.5 rounded-full"
                style={{ background: "linear-gradient(90deg,transparent,#F59E0B,transparent)" }}
              />
            </div>
            <p style={{ color: "var(--foreground)", fontSize: "1rem", fontWeight: 700 }}>Analyzing menu...</p>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", marginTop: 6 }}>AI is scoring items for your goals</p>
            <div className="flex gap-1.5 mt-4">
              {[0, 0.2, 0.4].map((d) => (
                <div key={d} className="w-2 h-2 rounded-full" style={{ background: "#F59E0B", animation: `pulse ${0.8}s ${d}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {mode === "results" && !scanning && (
          <>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter menu items..."
                autoFocus
                className="w-full pl-9 pr-4 py-3 rounded-xl outline-none"
                style={{ background: "var(--input-background)", border: "1.5px solid var(--border)", color: "var(--foreground)", fontSize: "0.9rem" }}
              />
            </div>

            <div className="p-3 rounded-2xl mb-4 flex items-center gap-2" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <Zap size={14} style={{ color: "#F59E0B" }} />
              <span style={{ color: "var(--foreground)", fontSize: "0.78rem", fontWeight: 600 }}>Sorted by match to your 650 kcal / 45g protein goal</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {filteredItems.map((item, i) => (
                <button
                  key={item.name}
                  onClick={() => setSelected(selected === i ? null : i)}
                  className="w-full p-4 rounded-2xl text-left transition-all"
                  style={{
                    background: selected === i ? "rgba(245,158,11,0.06)" : "var(--card)",
                    border: `1.5px solid ${selected === i ? "#F59E0B" : "var(--border)"}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span style={{ fontSize: "1.6rem" }}>{item.emoji}</span>
                      <div>
                        <p style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 700 }}>{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span style={{ color: item.badgeColor, fontSize: "0.68rem", fontWeight: 800 }}>{item.badge}</span>
                          <span style={{ color: "var(--muted-foreground)", fontSize: "0.68rem" }}>· {item.cals} kcal</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${item.badgeColor}15` }}
                      >
                        <span style={{ color: item.badgeColor, fontSize: "0.85rem", fontWeight: 900 }}>{item.score}</span>
                      </div>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "0.62rem", marginTop: 2 }}>AI score</span>
                    </div>
                  </div>

                  {selected === i && (
                    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="flex gap-4 mb-3">
                        {[
                          { l: "Protein", v: item.protein, c: "#10B981", u: "g" },
                          { l: "Carbs", v: item.carbs, c: "#3B82F6", u: "g" },
                          { l: "Fat", v: item.fat, c: "#8B5CF6", u: "g" },
                        ].map((m) => (
                          <div key={m.l} className="flex-1 text-center">
                            <p style={{ color: m.c, fontSize: "1rem", fontWeight: 800 }}>{m.v}{m.u}</p>
                            <p style={{ color: "var(--muted-foreground)", fontSize: "0.65rem" }}>{m.l}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2"
                        style={{ background: "#F59E0B", color: "#fff", fontSize: "0.875rem", fontWeight: 700 }}
                      >
                        <Check size={15} /> Log This Meal
                      </button>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
