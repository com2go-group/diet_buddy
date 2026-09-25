import { useState } from "react";
import { ChevronRight, Bell, Moon, Shield, Star, HelpCircle, LogOut, Crown } from "lucide-react";

interface ProfileScreenProps {
  onLogout: () => void;
  onNavigate?: (screen: string) => void;
}

const settingsSections = [
  {
    title: "Account",
    items: [
      { icon: Bell, label: "Notifications", sublabel: "Push & email alerts", hasToggle: true, toggleOn: true },
      { icon: Moon, label: "Dark Mode", sublabel: "Appearance", hasToggle: true, toggleOn: false },
      { icon: Shield, label: "Privacy & Data", sublabel: "GDPR settings", hasArrow: true },
    ],
  },
  {
    title: "Goals",
    items: [
      { icon: "⚖️", label: "Weight Goal", sublabel: "65 kg by Sep 2026", hasArrow: true },
      { icon: "🎯", label: "Daily Calorie Target", sublabel: "1,650 kcal", hasArrow: true },
      { icon: "💧", label: "Hydration Goal", sublabel: "2.5L per day", hasArrow: true },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: HelpCircle, label: "Help & FAQ", hasArrow: true },
      { icon: Star, label: "Rate DietBuddy", hasArrow: true },
    ],
  },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative w-12 h-6 rounded-full transition-all"
      style={{ background: on ? '#F59E0B' : 'var(--switch-background)' }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
        style={{ background: '#fff', left: on ? '26px' : '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
      />
    </button>
  );
}

export function ProfileScreen({ onLogout, onNavigate }: ProfileScreenProps) {
  const [toggles, setToggles] = useState({ notifications: true, darkMode: false });
  const [isPremium] = useState(false);

  return (
    <div className="h-full overflow-y-auto bg-background" style={{ scrollbarWidth: 'none' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-4" style={{ background: 'linear-gradient(180deg, rgba(245,158,11,0.06) 0%, transparent 100%)' }}>
        <h1 style={{ color: 'var(--foreground)', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>Profile</h1>

        {/* User card */}
        <div className="p-4 rounded-3xl flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #1A1A2E, #16213E)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
            A
          </div>
          <div className="flex-1">
            <p style={{ color: '#F1F5F9', fontSize: '1.1rem', fontWeight: 800 }}>Alex Johnson</p>
            <p style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: 1 }}>alex@example.com</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: '0.72rem', fontWeight: 700 }}>
                <span>🔥</span> 12-Day Streak
              </span>
              <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: '0.72rem', fontWeight: 700 }}>340 XP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-10">
        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {[
            { label: "Logged Days", val: "40" },
            { label: "Meals Logged", val: "176" },
            { label: "Goal Progress", val: "52%" },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-2xl text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--foreground)', fontSize: '1.2rem', fontWeight: 800 }}>{s.val}</p>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.68rem', fontWeight: 500, marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick action tiles */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {[
            { label: "Check-In", emoji: "✅", screen: "checkin" },
            { label: "Grocery", emoji: "🛒", screen: "grocery" },
            { label: "Restaurant", emoji: "🍽️", screen: "restaurant" },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => onNavigate?.(a.screen)}
              className="flex flex-col items-center py-3.5 rounded-2xl gap-1.5 transition-all active:scale-[0.97]"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <span style={{ fontSize: "1.5rem" }}>{a.emoji}</span>
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", fontWeight: 700 }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* Premium upsell */}
        {!isPremium && (
          <div className="p-4 rounded-2xl mb-5" style={{ background: 'linear-gradient(135deg, #1A1A2E, #16213E)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Crown size={18} style={{ color: '#F59E0B' }} />
              <span style={{ color: '#F59E0B', fontSize: '0.9rem', fontWeight: 800 }}>Upgrade to Premium</span>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: 12 }}>
              Unlock AI body scan, restaurant mode, grocery assistant, digital AI twin, before/after tracking, and more.
            </p>
            <div className="flex gap-2 mb-3">
              {["🧠 AI Body Scan", "🍽️ Restaurant Mode", "🛒 Grocery AI", "👤 Digital Twin"].map((f) => (
                <span key={f} className="px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: '#CBD5E1', fontSize: '0.65rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{f}</span>
              ))}
            </div>
            <button onClick={() => onNavigate?.("subscriptions")} className="w-full py-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', fontSize: '0.9rem', fontWeight: 700 }}>
              Start 7-Day Free Trial
            </button>
            <p style={{ color: '#64748B', fontSize: '0.7rem', textAlign: 'center', marginTop: 8 }}>$9.99/month · Cancel anytime</p>
          </div>
        )}

        {/* Settings sections */}
        {settingsSections.map((section) => (
          <div key={section.title} className="mb-4">
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
              {section.title}
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
              {section.items.map((item, idx) => {
                const IconComp = typeof item.icon !== 'string' ? item.icon : null;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--muted)' }}>
                      {IconComp ? <IconComp size={16} style={{ color: 'var(--muted-foreground)' }} /> : <span style={{ fontSize: '1rem' }}>{item.icon as string}</span>}
                    </div>
                    <div className="flex-1">
                      <p style={{ color: 'var(--foreground)', fontSize: '0.9rem', fontWeight: 600 }}>{item.label}</p>
                      {item.sublabel && <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{item.sublabel}</p>}
                    </div>
                    {item.hasToggle && (
                      <Toggle
                        on={item.label === "Notifications" ? toggles.notifications : toggles.darkMode}
                        onChange={() => setToggles((t) => ({ ...t, [item.label === "Notifications" ? "notifications" : "darkMode"]: !t[item.label === "Notifications" ? "notifications" : "darkMode"] }))}
                      />
                    )}
                    {item.hasArrow && <ChevronRight size={16} style={{ color: 'var(--muted-foreground)' }} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444', fontSize: '0.95rem', fontWeight: 700 }}
        >
          <LogOut size={16} />
          Sign Out
        </button>

        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem', textAlign: 'center', marginTop: 16 }}>DietBuddy v2.1.0 · Made with 💛</p>
      </div>
    </div>
  );
}
