import { X, Bell, CheckCheck } from "lucide-react";

interface NotificationsScreenProps {
  onClose: () => void;
}

const notifications = [
  {
    id: 1, type: "reminder", time: "Just now", read: false,
    title: "Time to log your snack 🍎",
    body: "It's 3:30 PM — don't forget to log your afternoon snack to stay on track.",
    emoji: "⏰",
  },
  {
    id: 2, type: "achievement", time: "1h ago", read: false,
    title: "New badge unlocked! 🏅",
    body: "You earned the 'Hydration Hero' badge for hitting your water goal 7 days in a row.",
    emoji: "🏅",
  },
  {
    id: 3, type: "ai", time: "2h ago", read: false,
    title: "Aria has a tip for you",
    body: "Your protein intake is trending 25% below goal this week. Add a Greek yogurt or protein shake today.",
    emoji: "🤖",
  },
  {
    id: 4, type: "streak", time: "8h ago", read: true,
    title: "12-Day Streak! 🔥",
    body: "You've logged every day for 12 days. Keep it up — you're 2 days from your next milestone!",
    emoji: "🔥",
  },
  {
    id: 5, type: "reminder", time: "Yesterday", read: true,
    title: "Weekly progress report ready 📊",
    body: "Your Week 6 summary is ready. You lost 0.4kg and hit your calorie goal 5/7 days.",
    emoji: "📊",
  },
  {
    id: 6, type: "premium", time: "2 days ago", read: true,
    title: "Unlock Restaurant Mode 🍽️",
    body: "Dining out this weekend? Premium users can scan menus and get macro-smart choices instantly.",
    emoji: "⭐",
  },
  {
    id: 7, type: "ai", time: "3 days ago", read: true,
    title: "Your AI Twin is ready",
    body: "Your Digital AI Twin has been generated based on your last body scan. Check your progress visualization!",
    emoji: "👤",
  },
];

const typeColors: Record<string, string> = {
  reminder: "#F59E0B",
  achievement: "#10B981",
  ai: "#8B5CF6",
  streak: "#EF4444",
  premium: "#F59E0B",
};

export function NotificationsScreen({ onClose }: NotificationsScreenProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
            <X size={16} style={{ color: "var(--muted-foreground)" }} />
          </button>
          <div>
            <h1 style={{ color: "var(--foreground)", fontSize: "1.2rem", fontWeight: 800 }}>Notifications</h1>
            {unreadCount > 0 && <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{unreadCount} unread</p>}
          </div>
        </div>
        <button className="flex items-center gap-1.5" style={{ color: "#F59E0B", fontSize: "0.8rem", fontWeight: 700 }}>
          <CheckCheck size={14} /> Mark all read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>
        {/* Unread group */}
        {unreadCount > 0 && (
          <div className="mb-5">
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>New</p>
            <div className="flex flex-col gap-2">
              {notifications.filter((n) => !n.read).map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-2xl flex items-start gap-3 relative overflow-hidden"
                  style={{ background: "var(--card)", border: `1.5px solid ${typeColors[n.type]}22` }}
                >
                  <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: typeColors[n.type] }} />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ml-1"
                    style={{ background: `${typeColors[n.type]}15` }}
                  >
                    {n.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 700, lineHeight: 1.3 }}>{n.title}</p>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "0.68rem", flexShrink: 0, marginTop: 1 }}>{n.time}</span>
                    </div>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginTop: 4, lineHeight: 1.4 }}>{n.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Read group */}
        <div>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Earlier</p>
          <div className="flex flex-col gap-2">
            {notifications.filter((n) => n.read).map((n) => (
              <div
                key={n.id}
                className="p-3.5 rounded-2xl flex items-start gap-3"
                style={{ background: "var(--card)", border: "1px solid var(--border)", opacity: 0.75 }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "var(--muted)" }}>
                  {n.emoji}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.3 }}>{n.title}</p>
                    <span style={{ color: "var(--muted-foreground)", fontSize: "0.68rem", flexShrink: 0, marginTop: 1 }}>{n.time}</span>
                  </div>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginTop: 4, lineHeight: 1.4 }}>{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
