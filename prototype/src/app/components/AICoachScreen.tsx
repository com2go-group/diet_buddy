import { useState, useRef, useEffect } from "react";
import { Send, Zap, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
  time: string;
}

const personalities = [
  { id: "aria", name: "Aria", emoji: "🤖", label: "Nutritionist", color: "#F59E0B" },
  { id: "max", name: "Max", emoji: "💪", label: "Coach", color: "#10B981" },
  { id: "luna", name: "Luna", emoji: "🧘", label: "Wellness", color: "#8B5CF6" },
];

const quickPrompts = [
  "What should I eat for dinner?",
  "I'm 410 kcal under — suggest a snack",
  "How's my protein today?",
  "Give me meal prep ideas",
  "Help me stay motivated",
];

const initialMessages: Message[] = [
  {
    id: 1,
    role: "ai",
    text: "Hi Alex! 👋 I'm Aria, your AI nutrition coach. I've reviewed your day so far — you've had a great breakfast and lunch! You're sitting at 900 kcal with 87g of protein. You still have 410 kcal left for the day.\n\nI notice your protein is slightly below target (87g vs 125g goal). Want me to suggest some high-protein options for your snack and dinner?",
    time: "3:42 PM",
  },
];

const aiReplies: Record<string, string> = {
  "What should I eat for dinner?": "Based on your remaining 410 kcal and 38g protein gap, I'd recommend:\n\n🐟 **Baked Salmon (150g)** — 280 kcal, 36g protein\n🥦 **Steamed Broccoli (200g)** — 70 kcal, 6g protein\n🍋 **Lemon Quinoa (80g cooked)** — 110 kcal, 4g protein\n\nTotal: ~460 kcal, 46g protein — slightly over but excellent macro balance for your goal!",
  "I'm 410 kcal under — suggest a snack": "Perfect opportunity for a protein-rich snack! Here are my top picks:\n\n1. 🫙 **Greek yogurt + berries** — 180 kcal, 15g protein\n2. 🥜 **Almonds + 1 hard-boiled egg** — 220 kcal, 12g protein\n3. 🥤 **Protein shake with almond milk** — 160 kcal, 25g protein ⭐\n\nOption 3 will most efficiently close your protein gap while keeping you in calorie target.",
  "How's my protein today?": "You've consumed **87g of protein** today out of your **125g goal** — that's 70% complete. 💪\n\nYou still need **38g more** from your remaining meals. That's roughly:\n• 2 chicken breasts\n• 1 large protein shake\n• 200g Greek yogurt\n\nYou're on track if you have a protein-rich dinner! I'll send you a reminder at 6:30 PM.",
  "Give me meal prep ideas": "Great idea! Here's a 5-day meal prep plan tailored to your 1,650 kcal goal:\n\n**Batch cook:**\n🍗 1.5kg chicken breast (season 3 ways)\n🍚 500g brown rice\n🥦 1kg mixed veggies\n🥚 12 hard-boiled eggs\n\n**Quick assembly meals:**\n• Chicken rice bowls (M-W)\n• Veggie stir-fry (Th-F)\n• Egg salad wraps (snacks)\n\nTotal prep time: ~90 minutes. Want a detailed shopping list?",
  "Help me stay motivated": "You're doing amazing, Alex! 🌟 Here's your motivation report:\n\n🔥 **12-day streak** — you're in the top 15% of DietBuddy users!\n📉 **Down 2.3kg** since you started\n💪 **340 XP** earned this week\n🏆 You're 3 days from your 'Two Week Warrior' badge!\n\nRemember why you started: every logged meal is a vote for the person you're becoming. Your consistency this week has been exceptional. Keep it up! 💛",
};

export function AICoachScreen() {
  const [activePersonality, setActivePersonality] = useState("aria");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now(), role: "user", text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const reply = aiReplies[text] || "Great question! Based on your current nutrition profile and goals, I'd recommend focusing on whole foods rich in protein and fiber. Shall I create a personalized suggestion based on what you have available?";
      const aiMsg: Message = { id: Date.now() + 1, role: "ai", text: reply, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      setMessages((m) => [...m, aiMsg]);
      setTyping(false);
    }, 1200 + Math.random() * 600);
  };

  const persona = personalities.find((p) => p.id === activePersonality)!;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 pt-14 pb-3" style={{ background: 'linear-gradient(180deg, rgba(245,158,11,0.06) 0%, transparent 100%)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>AI Coach</h1>
          <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--muted)' }}>
            <RefreshCw size={15} style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>

        {/* Personality selector */}
        <div className="flex gap-2">
          {personalities.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePersonality(p.id)}
              className="flex-1 flex flex-col items-center py-2.5 rounded-2xl transition-all"
              style={{
                background: activePersonality === p.id ? `${p.color}18` : 'var(--card)',
                border: `1.5px solid ${activePersonality === p.id ? p.color : 'var(--border)'}`,
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>{p.emoji}</span>
              <span style={{ color: activePersonality === p.id ? p.color : 'var(--foreground)', fontSize: '0.72rem', fontWeight: 700, marginTop: 1 }}>{p.name}</span>
              <span style={{ color: 'var(--muted-foreground)', fontSize: '0.62rem' }}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`flex gap-2.5 mb-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {msg.role === "ai" && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-base"
                  style={{ background: `linear-gradient(135deg, ${persona.color}, ${persona.color}cc)` }}
                >
                  {persona.emoji}
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <div
                  className="px-3.5 py-2.5 rounded-2xl"
                  style={{
                    background: msg.role === "user" ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'var(--card)',
                    border: msg.role === "user" ? 'none' : '1px solid var(--border)',
                    color: msg.role === "user" ? '#fff' : 'var(--foreground)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {msg.text}
                </div>
                <span style={{ color: 'var(--muted-foreground)', fontSize: '0.65rem' }}>{msg.time}</span>
              </div>
            </motion.div>
          ))}

          {typing && (
            <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-base" style={{ background: `linear-gradient(135deg, ${persona.color}, ${persona.color}cc)` }}>
                {persona.emoji}
              </div>
              <div className="px-4 py-3 rounded-2xl flex items-center gap-1" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                {[0, 0.15, 0.3].map((d) => (
                  <motion.div
                    key={d}
                    className="w-2 h-2 rounded-full"
                    style={{ background: persona.color }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, delay: d, repeat: Infinity }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-5 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-5 pb-6 pt-2">
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl" style={{ background: 'var(--card)', border: '1.5px solid var(--border)' }}>
          <Zap size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Ask Aria anything..."
            className="flex-1 outline-none bg-transparent"
            style={{ color: 'var(--foreground)', fontSize: '0.9rem' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: input.trim() ? '#F59E0B' : 'var(--muted)' }}
          >
            <Send size={14} style={{ color: input.trim() ? '#fff' : 'var(--muted-foreground)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
