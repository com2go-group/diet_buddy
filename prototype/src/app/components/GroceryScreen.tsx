import { useState } from "react";
import { X, Plus, ShoppingCart, Zap, Trash2, Check } from "lucide-react";

interface GroceryScreenProps {
  onClose: () => void;
}

const suggested = [
  { name: "Greek Yogurt (Plain)", qty: "2 × 500g", cat: "Dairy", cals: 59, protein: 10, emoji: "🫙", added: false },
  { name: "Chicken Breast (Skinless)", qty: "1.5 kg", cat: "Protein", cals: 165, protein: 31, emoji: "🍗", added: false },
  { name: "Salmon Fillets", qty: "4 × 150g", cat: "Protein", cals: 208, protein: 28, emoji: "🐟", added: false },
  { name: "Brown Rice", qty: "1 kg bag", cat: "Grains", cals: 216, protein: 5, emoji: "🍚", added: false },
  { name: "Broccoli", qty: "500g", cat: "Vegetables", cals: 34, protein: 3, emoji: "🥦", added: false },
  { name: "Mixed Berries (frozen)", qty: "600g bag", cat: "Fruit", cals: 46, protein: 1, emoji: "🫐", added: false },
  { name: "Almond Butter", qty: "250g jar", cat: "Fats", cals: 614, protein: 21, emoji: "🥜", added: false },
  { name: "Oats (Rolled)", qty: "1 kg", cat: "Grains", cals: 389, protein: 17, emoji: "🌾", added: false },
  { name: "Eggs (Free Range)", qty: "12 pack", cat: "Protein", cals: 155, protein: 13, emoji: "🥚", added: false },
  { name: "Avocado", qty: "3 pack", cat: "Fats", cals: 160, protein: 2, emoji: "🥑", added: false },
];

const categories = ["All", "Protein", "Dairy", "Grains", "Vegetables", "Fruit", "Fats"];

export function GroceryScreen({ onClose }: GroceryScreenProps) {
  const [items, setItems] = useState(suggested.map((s, i) => ({ ...s, id: i, added: i < 4 })));
  const [activeCategory, setActiveCategory] = useState("All");
  const [generating, setGenerating] = useState(false);

  const toggle = (id: number) => setItems((prev) => prev.map((i) => i.id === id ? { ...i, added: !i.added } : i));
  const addedItems = items.filter((i) => i.added);
  const filteredItems = activeCategory === "All" ? items : items.filter((i) => i.cat === activeCategory);

  const regenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); }, 1200);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 pt-14 pb-4" style={{ background: "linear-gradient(180deg,rgba(245,158,11,0.06) 0%,transparent 100%)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
              <X size={16} style={{ color: "var(--muted-foreground)" }} />
            </button>
            <div>
              <h1 style={{ color: "var(--foreground)", fontSize: "1.2rem", fontWeight: 800 }}>Grocery List</h1>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>AI-generated for your weekly plan</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", fontSize: "0.72rem", fontWeight: 700 }}>
              <ShoppingCart size={11} /> {addedItems.length} items
            </span>
          </div>
        </div>

        {/* AI bar */}
        <button
          onClick={regenerate}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
          style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.1),rgba(245,158,11,0.04))", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div className="flex items-center gap-2">
            <Zap size={16} style={{ color: "#F59E0B" }} />
            <span style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 700 }}>AI-optimized for 1,650 kcal / day</span>
          </div>
          <span style={{ color: "#F59E0B", fontSize: "0.78rem", fontWeight: 700 }}>
            {generating ? "Generating..." : "Regenerate"}
          </span>
        </button>
      </div>

      {/* Category filter */}
      <div className="px-5 py-3">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full transition-all"
              style={{
                background: activeCategory === c ? "#F59E0B" : "var(--card)",
                border: `1px solid ${activeCategory === c ? "#F59E0B" : "var(--border)"}`,
                color: activeCategory === c ? "#fff" : "var(--muted-foreground)",
                fontSize: "0.78rem",
                fontWeight: 700,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 px-5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex flex-col gap-2 pb-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3.5 rounded-2xl transition-all"
              style={{
                background: "var(--card)",
                border: `1px solid ${item.added ? "rgba(16,185,129,0.2)" : "var(--border)"}`,
                opacity: item.added ? 1 : 0.75,
              }}
            >
              <button
                onClick={() => toggle(item.id)}
                className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: item.added ? "#10B981" : "var(--muted)", border: `1.5px solid ${item.added ? "#10B981" : "var(--border)"}` }}
              >
                {item.added && <Check size={14} style={{ color: "#fff" }} />}
              </button>
              <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 600, textDecoration: item.added ? "none" : "none" }}>{item.name}</p>
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{item.qty}</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.65rem" }}>·</span>
                  <span className="px-1.5 py-0.5 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "0.65rem", fontWeight: 600 }}>{item.cat}</span>
                </div>
              </div>
              <div className="text-right">
                <span style={{ color: "#F59E0B", fontSize: "0.78rem", fontWeight: 700 }}>{item.protein}g P</span>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.68rem" }}>{item.cals} kcal</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom summary */}
      <div className="px-5 pb-8 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>{addedItems.length} items selected</span>
          <span style={{ color: "#10B981", fontSize: "0.82rem", fontWeight: 700 }}>Est. ~$72 / week</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setItems((prev) => prev.map((i) => ({ ...i, added: false })))}
            className="py-3 px-4 rounded-2xl flex items-center gap-1.5"
            style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "0.82rem", fontWeight: 700 }}
          >
            <Trash2 size={14} /> Clear
          </button>
          <button
            className="flex-1 py-3 rounded-2xl text-white flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", fontSize: "0.9rem", fontWeight: 700 }}
          >
            <ShoppingCart size={16} /> Share List
          </button>
        </div>
      </div>
    </div>
  );
}
