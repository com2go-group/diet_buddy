import { useState } from "react";
import { TrendingDown, Award, Camera, ChevronRight, Flame } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const weightData = [
  { date: "May 1", weight: 70.5 },
  { date: "May 8", weight: 70.1 },
  { date: "May 15", weight: 69.6 },
  { date: "May 22", weight: 69.2 },
  { date: "May 29", weight: 68.8 },
  { date: "Jun 5", weight: 68.4 },
  { date: "Jun 10", weight: 68.0 },
];

const calData = [
  { day: "M", cal: 1620 },
  { day: "T", cal: 1580 },
  { day: "W", cal: 1700 },
  { day: "T", cal: 1490 },
  { day: "F", cal: 1650 },
  { day: "S", cal: 1550 },
  { day: "S", cal: 1240 },
];

const achievements = [
  { emoji: "🔥", name: "12 Day Streak", desc: "Logged every day for 12 days", earned: true, xp: 120 },
  { emoji: "🥗", name: "Clean Eater", desc: "5 days under calorie target", earned: true, xp: 80 },
  { emoji: "💧", name: "Hydration Hero", desc: "Hit water goal 7 days in a row", earned: true, xp: 70 },
  { emoji: "💪", name: "Protein Pro", desc: "Hit protein target 10 days", earned: false, xp: 100 },
  { emoji: "⚖️", name: "Scale Master", desc: "Lost 2kg toward goal", earned: false, xp: 150 },
  { emoji: "🏆", name: "Two Week Warrior", desc: "Log for 14 consecutive days", earned: false, xp: 200 },
];

const measurements = [
  { label: "Weight", current: "68.0 kg", change: "-2.5 kg", up: false },
  { label: "BMI", current: "24.9", change: "-0.9", up: false },
  { label: "Waist", current: "76 cm", change: "-4 cm", up: false },
  { label: "Body Fat", current: "24.2%", change: "-1.8%", up: false },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        <p style={{ color: '#F59E0B', fontSize: '0.85rem', fontWeight: 700 }}>{payload[0].value} kg</p>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.72rem' }}>{payload[0].payload.date}</p>
      </div>
    );
  }
  return null;
};

export function ProgressScreen() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-background" style={{ scrollbarWidth: 'none' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-4" style={{ background: 'linear-gradient(180deg, rgba(245,158,11,0.06) 0%, transparent 100%)' }}>
        <h1 style={{ color: 'var(--foreground)', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>Progress</h1>

        {/* Tabs */}
        <div className="flex rounded-2xl p-1" style={{ background: 'var(--muted)' }}>
          {["overview", "body", "achievements", "insights"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex-1 py-2 rounded-xl capitalize transition-all"
              style={{
                background: activeTab === t ? 'var(--card)' : 'transparent',
                color: activeTab === t ? 'var(--foreground)' : 'var(--muted-foreground)',
                fontSize: '0.75rem',
                fontWeight: 700,
                boxShadow: activeTab === t ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-10">
        {activeTab === "overview" && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "Total Lost", value: "2.5 kg", icon: "📉", color: "#10B981" },
                { label: "Streak", value: "12 days", icon: "🔥", color: "#F59E0B" },
                { label: "Avg Calories", value: "1,590", icon: "🍽️", color: "#3B82F6" },
                { label: "Workouts", value: "8 this mo.", icon: "💪", color: "#8B5CF6" },
              ].map((s) => (
                <div key={s.label} className="p-3.5 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
                  <p style={{ color: 'var(--foreground)', fontSize: '1.2rem', fontWeight: 800, marginTop: 4, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', marginTop: 2 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Weight chart */}
            <div className="p-4 rounded-2xl mb-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 style={{ color: 'var(--foreground)', fontSize: '0.95rem', fontWeight: 700 }}>Weight Trend</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <TrendingDown size={14} style={{ color: '#10B981' }} />
                    <span style={{ color: '#10B981', fontSize: '0.8rem', fontWeight: 700 }}>−2.5 kg in 40 days</span>
                  </div>
                </div>
                <div className="text-right">
                  <p style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 800, lineHeight: 1 }}>68.0</p>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.72rem' }}>kg · today</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={weightData}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' as any }} axisLine={false} tickLine={false} />
                  <YAxis domain={[67, 71]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' as any }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="weight" stroke="#F59E0B" strokeWidth={2.5} fill="url(#wGrad)" dot={false} activeDot={{ r: 5, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Calorie chart */}
            <div className="p-4 rounded-2xl mb-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <h3 style={{ color: 'var(--foreground)', fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>Weekly Calories</h3>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={calData}>
                  <defs>
                    <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' as any }} axisLine={false} tickLine={false} />
                  <YAxis domain={[1200, 1800]} hide />
                  <Tooltip formatter={(v: number) => [`${v} kcal`, '']} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: '0.8rem' }} />
                  <Area type="monotone" dataKey="cal" stroke="#3B82F6" strokeWidth={2} fill="url(#cGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Projected goal */}
            <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={16} style={{ color: '#10B981' }} />
                <span style={{ color: '#10B981', fontSize: '0.85rem', fontWeight: 700 }}>Goal Projection</span>
              </div>
              <p style={{ color: 'var(--foreground)', fontSize: '0.9rem', fontWeight: 600 }}>At your current pace, you'll reach your goal weight of 65kg by <span style={{ color: '#10B981' }}>September 2, 2026</span>.</p>
            </div>
          </>
        )}

        {activeTab === "body" && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {measurements.map((m) => (
                <div key={m.label} className="p-4 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: 600 }}>{m.label}</p>
                  <p style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 800, lineHeight: 1, marginTop: 4 }}>{m.current}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingDown size={12} style={{ color: '#10B981' }} />
                    <span style={{ color: '#10B981', fontSize: '0.75rem', fontWeight: 700 }}>{m.change}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Camera progress */}
            <div className="p-4 rounded-2xl mb-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <h3 style={{ color: 'var(--foreground)', fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>Photo Progress</h3>
              <div className="flex gap-3">
                {["May 1", "Jun 10"].map((d, i) => (
                  <div key={d} className="flex-1 rounded-2xl overflow-hidden relative" style={{ aspectRatio: '3/4', background: 'var(--muted)' }}>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Camera size={24} style={{ color: 'var(--muted-foreground)' }} />
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.72rem', marginTop: 4 }}>{d}</span>
                    </div>
                    {i === 0 && <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>Before</div>}
                    {i === 1 && <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full" style={{ background: '#10B981', color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>Now</div>}
                  </div>
                ))}
              </div>
              <button className="w-full mt-3 py-3 rounded-xl flex items-center justify-center gap-2" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontSize: '0.85rem', fontWeight: 700 }}>
                <Camera size={16} />
                Take Progress Photo
              </button>
            </div>
          </>
        )}

        {activeTab === "achievements" && (
          <>
            <div className="p-3.5 rounded-2xl mb-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.25)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(245,158,11,0.15)' }}>🏅</div>
              <div>
                <p style={{ color: 'var(--foreground)', fontSize: '1rem', fontWeight: 700 }}>3 / 12 Badges Earned</p>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>340 XP · Rank: Consistent</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {achievements.map((a) => (
                <div
                  key={a.name}
                  className="flex items-center gap-3 p-3.5 rounded-2xl"
                  style={{
                    background: a.earned ? 'var(--card)' : 'var(--muted)',
                    border: `1px solid ${a.earned ? 'var(--border)' : 'transparent'}`,
                    opacity: a.earned ? 1 : 0.6,
                  }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: a.earned ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.05)' }}>
                    {a.earned ? a.emoji : '🔒'}
                  </div>
                  <div className="flex-1">
                    <p style={{ color: 'var(--foreground)', fontSize: '0.9rem', fontWeight: 700 }}>{a.name}</p>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{a.desc}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span style={{ color: a.earned ? '#F59E0B' : 'var(--muted-foreground)', fontSize: '0.8rem', fontWeight: 700 }}>+{a.xp} XP</span>
                    {a.earned && <span style={{ color: '#10B981', fontSize: '0.65rem', fontWeight: 700 }}>✓ Earned</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "insights" && (
          <>
            {[
              { emoji: "📊", title: "Best performance day", body: "You consistently perform best on Mondays with an average 92% adherence score." },
              { emoji: "⚡", title: "Calorie timing", body: "You tend to eat 45% of your calories before noon. Shifting some to evening could improve satiety." },
              { emoji: "💧", title: "Hydration pattern", body: "Your water intake drops significantly after 6PM. Set a reminder to drink a glass with dinner." },
              { emoji: "🥩", title: "Protein gap", body: "You've averaged 94g/day vs your 125g goal. High-protein snacks could close this 25% gap." },
              { emoji: "😴", title: "Rest day nutrition", body: "On weekends your calories increase by ~200 kcal. Consider a slightly adjusted plan for rest days." },
            ].map((insight) => (
              <div key={insight.title} className="p-4 rounded-2xl mb-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-start gap-3">
                  <span style={{ fontSize: '1.5rem', lineHeight: 1, marginTop: 2 }}>{insight.emoji}</span>
                  <div>
                    <p style={{ color: 'var(--foreground)', fontSize: '0.9rem', fontWeight: 700 }}>{insight.title}</p>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginTop: 4, lineHeight: 1.5 }}>{insight.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
