import type { LlmProvider, LlmRequest } from '../../functions/_shared/llm';
import type { CoachContextData } from '../../functions/coach-chat/context';
import {
  handleCoachChat,
  localDayStart,
  type CoachDeps,
  type CoachStore,
  type StoredMessage,
} from '../../functions/coach-chat/handler';
import { SUPPORT_NOTES } from '../../functions/coach-chat/safety';

const USER = '11111111-1111-1111-1111-111111111111';
const NOW = new Date('2026-09-26T15:00:00Z');

const context: CoachContextData = {
  profile: {
    birthDate: '1991-04-12',
    gender: 'female',
    heightCm: 168,
    units: 'metric',
    streakDays: 2,
  },
  goal: null,
  preferences: null,
  plan: { calories: 1800, proteinG: 140, carbsG: 180, fatG: 60, waterMl: 2000 },
  latestWeightKg: 80,
  today: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, waterMl: 0, meals: [] },
  last7DaysAvgCalories: null,
  latestCheckIn: null,
};

function memoryStore(opts: { premium?: boolean; used?: number; limit?: number } = {}) {
  const messages: (StoredMessage & { conversation: string; user: string })[] = [];
  const usage: { model: string; inputTokens: number; outputTokens: number }[] = [];
  const safetyEvents: [string, string, string][] = [];
  const conversations = new Map<string, { user: string; persona: 'aria' | 'max' | 'luna' }>();
  let seq = 0;
  const store: CoachStore = {
    isPremium: async () => opts.premium ?? false,
    dailyLimit: async () => opts.limit ?? 5,
    countUserMessagesSince: async (_u, since) =>
      (since.getTime() > NOW.getTime() - 120_000 ? 0 : (opts.used ?? 0)) +
      messages.filter((m) => m.role === 'user' && new Date(m.created_at) >= since).length,
    loadContext: async () => context,
    conversationPersona: async (user, id) => {
      const c = conversations.get(id);
      return c && c.user === user ? c.persona : null;
    },
    createConversation: async (user, persona) => {
      const id = `00000000-0000-4000-8000-00000000000${++seq}`;
      conversations.set(id, { user, persona });
      return id;
    },
    history: async (id) =>
      messages
        .filter((m) => m.conversation === id)
        .map((m) => ({ role: m.role, content: m.content })),
    saveExchange: async (user, conversation, _p, userText, reply) => {
      const mk = (role: 'user' | 'assistant', content: string) => {
        const m = {
          id: `m${++seq}`,
          role,
          content,
          created_at: NOW.toISOString(),
          conversation,
          user,
        };
        messages.push(m);
        return m;
      };
      return { user: mk('user', userText), assistant: mk('assistant', reply) };
    },
    logUsage: async (_u, model, inputTokens, outputTokens) =>
      void usage.push({ model, inputTokens, outputTokens }),
    recordSafetyEvent: async (user, persona, flag) => void safetyEvents.push([user, persona, flag]),
  };
  return { store, messages, usage, conversations, safetyEvents };
}

function fakeLlm(...replies: string[]) {
  const requests: LlmRequest[] = [];
  const llm: LlmProvider = {
    complete: jest.fn(async (req: LlmRequest) => {
      requests.push(req);
      const text = replies.shift() ?? replies[replies.length - 1] ?? '';
      if (text === 'THROW') throw new Error('boom');
      return { text, model: 'claude-test', inputTokens: 100, outputTokens: 20 };
    }),
  };
  return { llm, requests };
}

const ok = (reply: string, safety = 'none') => JSON.stringify({ reply, safety });
const post = (body: unknown, auth = true) =>
  new Request('http://localhost/coach-chat', {
    method: 'POST',
    headers: auth ? { Authorization: 'Bearer token' } : {},
    body: JSON.stringify(body),
  });
const deps = (store: CoachStore, llm: LlmProvider | null): CoachDeps => ({
  store,
  llm,
  getUserId: async (req) => (req.headers.get('Authorization') ? USER : null),
  now: () => NOW,
});

describe('coach-chat handler', () => {
  it('answers, stores the exchange and logs token usage', async () => {
    const mem = memoryStore();
    const { llm, requests } = fakeLlm(
      ok('Try Greek yogurt with berries for a protein-rich snack.'),
    );
    const res = await handleCoachChat(
      post({ persona: 'aria', message: 'Snack idea?' }),
      deps(mem.store, llm),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages.map((m: StoredMessage) => m.role)).toEqual(['user', 'assistant']);
    expect(body.messages[1].content).toBe(
      'Try Greek yogurt with berries for a protein-rich snack.',
    );
    expect(body.remaining).toBe(4);
    expect(body.safety).toBe('none');
    expect(mem.usage).toEqual([{ model: 'claude-test', inputTokens: 100, outputTokens: 20 }]);
    expect(requests[0]!.system).toMatch(/You are Aria/);
    expect(requests[0]!.system).toContain('Daily targets: 1800 kcal');
    expect(requests[0]!.messages).toEqual([{ role: 'user', content: 'Snack idea?' }]);
  });

  it('continues a conversation with its history', async () => {
    const mem = memoryStore();
    const { llm, requests } = fakeLlm(ok('First.'), ok('Second.'));
    const first = await (
      await handleCoachChat(post({ persona: 'max', message: 'Hi' }), deps(mem.store, llm))
    ).json();
    await handleCoachChat(
      post({ persona: 'max', message: 'And legs?', conversationId: first.conversationId }),
      deps(mem.store, llm),
    );
    expect(requests[1]!.messages).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'First.' },
      { role: 'user', content: 'And legs?' },
    ]);
  });

  it('enforces the free daily limit on the server', async () => {
    const mem = memoryStore({ used: 5, limit: 5 });
    const { llm } = fakeLlm(ok('x'));
    const res = await handleCoachChat(
      post({ persona: 'aria', message: 'Hi' }),
      deps(mem.store, llm),
    );
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'limit_reached', limit: 5 });
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('lets Premium users past the daily limit', async () => {
    const mem = memoryStore({ premium: true, used: 50 });
    const { llm } = fakeLlm(ok('Sure.'));
    const res = await handleCoachChat(
      post({ persona: 'luna', message: 'Hi' }),
      deps(mem.store, llm),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).remaining).toBeNull();
  });

  it('adds professional-help guidance in code even if the model does not flag it', async () => {
    const mem = memoryStore();
    const { llm } = fakeLlm(ok('That sounds really hard.'));
    const res = await handleCoachChat(
      post({ persona: 'luna', message: 'I make myself throw up after eating' }),
      deps(mem.store, llm),
    );
    const body = await res.json();
    expect(body.safety).toBe('disordered_eating');
    expect(body.messages[1].content).toContain(SUPPORT_NOTES.disordered_eating);
    // Flag and persona only go to the admin review queue, never the message text.
    expect(mem.safetyEvents).toEqual([[expect.any(String), 'luna', 'disordered_eating']]);
  });

  it('retries once on invalid output, then fails gracefully', async () => {
    const mem = memoryStore();
    const retry = fakeLlm('not json', ok('Recovered.'));
    const res = await handleCoachChat(
      post({ persona: 'aria', message: 'Hi' }),
      deps(mem.store, retry.llm),
    );
    expect((await res.json()).messages[1].content).toBe('Recovered.');

    const broken = fakeLlm('nope', 'THROW');
    const failed = await handleCoachChat(
      post({ persona: 'aria', message: 'Hi' }),
      deps(memoryStore().store, broken.llm),
    );
    expect(failed.status).toBe(502);
    expect(await failed.json()).toEqual({ error: 'ai_failed' });
    expect(broken.llm.complete).toHaveBeenCalledTimes(2);
  });

  it('rejects unauthenticated, invalid and cross-user requests', async () => {
    const mem = memoryStore();
    const { llm } = fakeLlm(ok('x'));
    expect(
      (await handleCoachChat(post({ persona: 'aria', message: 'Hi' }, false), deps(mem.store, llm)))
        .status,
    ).toBe(401);
    expect(
      (await handleCoachChat(post({ persona: 'bob', message: 'Hi' }), deps(mem.store, llm))).status,
    ).toBe(400);
    expect(
      (await handleCoachChat(post({ persona: 'aria', message: '' }), deps(mem.store, llm))).status,
    ).toBe(400);
    const other = await handleCoachChat(
      post({
        persona: 'aria',
        message: 'Hi',
        conversationId: '00000000-0000-4000-8000-000000000099',
      }),
      deps(mem.store, llm),
    );
    expect(await other.json()).toEqual({ error: 'invalid_conversation' });
  });

  it('reports a missing API key', async () => {
    const res = await handleCoachChat(
      post({ persona: 'aria', message: 'Hi' }),
      deps(memoryStore().store, null),
    );
    expect(await res.json()).toEqual({ error: 'not_configured' });
  });

  it('computes the user’s local day start', () => {
    // 15:00 UTC; for UTC+2 (offset -120) the local day started at 22:00 UTC the day before.
    expect(localDayStart(NOW, -120).toISOString()).toBe('2026-09-25T22:00:00.000Z');
    expect(localDayStart(NOW, 300).toISOString()).toBe('2026-09-26T05:00:00.000Z');
  });
});
