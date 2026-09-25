import { Bell, ChevronRight, Droplets, Flame, TrendingUp, Zap } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
}

const macros = [
  { name: "Calories", current: 1240, target: 1650, color: "#F59E0B", unit: "kcal" },
  { name: "Protein", current: 87, target: 125, color: "#10B981", unit: "g" },
  { name: "Carbs", current: 142, target: 185, color: "#3B82F6", unit: "g" },
  { name: "Fat", current: 38, target: 55, color: "#8B5CF6", unit: "g" },
];

const meals = [
  { name: "Oatmeal & Berries", time: "8:00 AM", cals: 380, logged: true, emoji: "🥣" },
  { name: "Grilled Chicken Salad", time: "12:30 PM", cals: 520, logged: true, emoji: "🥗" },
  { name: "Greek Yogurt", time: "3:30 PM", cals: 180, logged: false, emoji: "🫙" },
  { name: "Salmon & Veggies", time: "7:00 PM", cals: 650, logged: false, emoji: "🐟" },
];

function HydrationRing({ current, target }: { current: number; target: number }) {
  const pct = Math.min(current / target, 1);
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 88, height: 88 }}>
      <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--muted)" strokeWidth="7" />
        <circle
          cx="44" cy="44" r={radius} fill="none"
          stroke="#06B6D4" strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <Droplets size={16} style={{ color: '#06B6D4' }} />
        <span style={{ color: '#06B6D4', fontSize: '0.8rem', fontWeight: 700 }}>{current}L</span>
      </div>
    </div>
  );
}

function AdherenceRing({ score }: { score: number }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (score / 100);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 124, height: 124 }}>
      <svg width="124" height="124" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="62" cy="62" r={radius} fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="10" />
        <circle
          cx="62" cy="62" r={radius} fill="none"
          stroke="#F59E0B" strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span style={{ color: 'var(--foreground)', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{score}%</span>
        <span style={{ color: 'var(--muted-foreground)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>On Track</span>
      </div>
    </div>
  );
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  return (
    <div className="h-full flex flex-col overflow-y-auto bg-background" style={{ scrollbarWidth: 'none' }}>
      {/* Header */}
      <div
        className="px-5 pt-14 pb-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(180deg, rgba(245,158,11,0.06) 0%, transparent 100%)' }}
      >
        <div>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', fontWeight: 500 }}>Good morning ☀️</p>
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>Alex Johnson</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginTop: '2px' }}>Tuesday, June 10</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <Bell size={18} style={{ color: 'var(--foreground)' }} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
          </button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', fontSize: '1rem', fontWeight: 700 }}>A</div>
        </div>
      </div>

      {/* Daily adherence + streak */}
      <div className="px-5 mb-4">
        <div className="p-4 rounded-3xl flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #1A1A2E, #16213E)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <AdherenceRing score={78} />
          <div className="flex-1">
            <p style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Today's Score</p>
            <p style={{ color: '#F1F5F9', fontSize: '0.9rem', fontWeight: 500, marginTop: 4 }}>Keep it up! Log your next meal to stay on track.</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1">
                <Flame size={14} style={{ color: '#F59E0B' }} />
                <span style={{ color: '#F59E0B', fontSize: '0.85rem', fontWeight: 700 }}>12 Day Streak</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap size={14} style={{ color: '#10B981' }} />
                <span style={{ color: '#10B981', fontSize: '0.85rem', fontWeight: 700 }}>340 XP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Macro cards */}
      <div className="px-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ color: 'var(--foreground)', fontSize: '1rem', fontWeight: 700 }}>Today's Nutrition</h2>
          <button onClick={() => onNavigate('meals')} className="flex items-center gap-1" style={{ color: '#F59E0B', fontSize: '0.8rem', fontWeight: 600 }}>
            Details <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {macros.map((m) => {
            const pct = Math.min(m.current / m.target, 1);
            return (
              <div
                key={m.name}
                className="p-3.5 rounded-2xl"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: 600 }}>{m.name}</span>
                  <span style={{ color: m.color, fontSize: '0.7rem', fontWeight: 700 }}>{Math.round(pct * 100)}%</span>
                </div>
                <div style={{ color: 'var(--foreground)', fontSize: '1.1rem', fontWeight: 700, lineHeight: 1 }}>
                  {m.current}<span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: 400 }}>{m.unit}</span>
                </div>
                <div style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem', marginBottom: 8 }}>of {m.target}{m.unit}</div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--muted)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: m.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hydration */}
      <div className="px-5 mb-4">
        <div className="p-4 rounded-2xl flex items-center gap-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <HydrationRing current={1.8} target={2.5} />
          <div className="flex-1">
            <h3 style={{ color: 'var(--foreground)', fontSize: '0.95rem', fontWeight: 700 }}>Hydration</h3>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginTop: 2 }}>1.8L of 2.5L daily goal</p>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {Array.from({ length: 8 }).map((_, i) => (
                <button
                  key={i}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: i < 7 ? '#06B6D4' : 'var(--muted)',
                    border: '1px solid transparent',
                  }}
                >
                  <Droplets size={12} style={{ color: i < 7 ? '#fff' : 'var(--muted-foreground)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Today's meals */}
      <div className="px-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ color: 'var(--foreground)', fontSize: '1rem', fontWeight: 700 }}>Today's Meals</h2>
          <button onClick={() => onNavigate('meals')} className="flex items-center gap-1" style={{ color: '#F59E0B', fontSize: '0.8rem', fontWeight: 600 }}>
            Log meal <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {meals.map((meal) => (
            <div
              key={meal.name}
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{
                background: meal.logged ? 'var(--card)' : 'var(--card)',
                border: `1px solid ${meal.logged ? 'var(--border)' : 'rgba(245,158,11,0.2)'}`,
                opacity: meal.logged ? 1 : 0.75,
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--muted)' }}>
                {meal.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p style={{ color: 'var(--foreground)', fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meal.name}</p>
                  {meal.logged && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: '0.65rem', fontWeight: 700 }}>✓ Logged</span>}
                </div>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{meal.time} · {meal.cals} kcal</p>
              </div>
              {!meal.logged && (
                <button className="px-3 py-1.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontSize: '0.75rem', fontWeight: 700 }}>
                  Log
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Daily check-in banner */}
      <div className="px-5 mb-4">
        <button
          onClick={() => onNavigate('checkin')}
          className="w-full p-4 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <span style={{ fontSize: '1.5rem' }}>✅</span>
          <div className="flex-1 text-left">
            <p style={{ color: 'var(--foreground)', fontSize: '0.9rem', fontWeight: 700 }}>Daily Check-In</p>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.78rem' }}>Log your mood, energy & weight · earn 20 XP</p>
          </div>
          <span style={{ color: '#10B981', fontSize: '0.85rem', fontWeight: 700 }}>Start →</span>
        </button>
      </div>

      {/* AI Insights */}
      <div className="px-5 mb-6">
        <button
          onClick={() => onNavigate('coach')}
          className="w-full p-4 rounded-2xl flex items-center gap-3 transition-all"
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
            <Zap size={18} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p style={{ color: 'var(--foreground)', fontSize: '0.9rem', fontWeight: 700 }}>AI Coach Insight</p>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.78rem' }}>You're low on protein today — tap to get suggestions</p>
          </div>
          <ChevronRight size={16} style={{ color: '#F59E0B' }} />
        </button>
      </div>

      {/* Premium features quick access */}
      <div className="px-5 mb-4">
        <div className="flex gap-2.5">
          {[
            { label: "Grocery AI", emoji: "🛒", screen: "grocery", color: "#10B981" },
            { label: "Restaurant", emoji: "🍽️", screen: "restaurant", color: "#3B82F6" },
            { label: "Subscribe", emoji: "⭐", screen: "subscriptions", color: "#F59E0B" },
          ].map((f) => (
            <button
              key={f.label}
              onClick={() => onNavigate(f.screen)}
              className="flex-1 flex flex-col items-center py-3 rounded-2xl gap-1 transition-all active:scale-[0.97]"
              style={{ background: `${f.color}10`, border: `1px solid ${f.color}22` }}
            >
              <span style={{ fontSize: '1.3rem' }}>{f.emoji}</span>
              <span style={{ color: f.color, fontSize: '0.66rem', fontWeight: 700 }}>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Weekly trend */}
      <div className="px-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ color: 'var(--foreground)', fontSize: '1rem', fontWeight: 700 }}>Weekly Adherence</h2>
          <button onClick={() => onNavigate('progress')} className="flex items-center gap-1" style={{ color: '#F59E0B', fontSize: '0.8rem', fontWeight: 600 }}>
            View all <ChevronRight size={14} />
          </button>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-end justify-between gap-2">
            {[
              { day: "Mon", pct: 92 },
              { day: "Tue", pct: 78 },
              { day: "Wed", pct: 85 },
              { day: "Thu", pct: 65 },
              { day: "Fri", pct: 88 },
              { day: "Sat", pct: 70 },
              { day: "Sun", pct: 95 },
            ].map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                <span style={{ color: 'var(--muted-foreground)', fontSize: '0.65rem', fontWeight: 700 }}>{d.pct}%</span>
                <div className="w-full rounded-t-lg" style={{ height: `${(d.pct / 100) * 60}px`, background: d.day === 'Tue' ? '#F59E0B' : 'var(--muted)', transition: 'all 0.3s' }} />
                <span style={{ color: d.day === 'Tue' ? '#F59E0B' : 'var(--muted-foreground)', fontSize: '0.7rem', fontWeight: 600 }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
