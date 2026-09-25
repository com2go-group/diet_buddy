import { Home, UtensilsCrossed, MessageCircle, TrendingUp, User } from "lucide-react";

interface BottomNavProps {
  active: string;
  onNavigate: (screen: string) => void;
}

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "meals", label: "Meals", icon: UtensilsCrossed },
  { id: "coach", label: "Coach", icon: MessageCircle },
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "profile", label: "Profile", icon: User },
];

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <div
      className="flex items-center px-2 pb-safe"
      style={{
        background: 'var(--card)',
        borderTop: '1px solid var(--border)',
        paddingTop: 8,
        paddingBottom: 20,
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-1 transition-all"
          >
            <div
              className="w-10 h-6 rounded-full flex items-center justify-center transition-all"
              style={{ background: isActive ? 'rgba(245,158,11,0.15)' : 'transparent' }}
            >
              <Icon
                size={isActive ? 20 : 22}
                style={{ color: isActive ? '#F59E0B' : 'var(--muted-foreground)', strokeWidth: isActive ? 2.5 : 1.8 }}
              />
            </div>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#F59E0B' : 'var(--muted-foreground)',
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
