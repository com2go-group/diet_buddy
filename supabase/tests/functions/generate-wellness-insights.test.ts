import type { LlmProvider, LlmRequest } from '../../functions/_shared/llm';
import {
  handleWellnessInsights,
  MIN_MESSAGES,
  type UserMessage,
  type WellnessDeps,
  type WellnessInsight,
  type WellnessSet,
} from '../../functions/generate-wellness-insights/handler';
import { quotesMessages } from '../../functions/generate-wellness-insights/privacy';

// 10:00 UTC on 27 Sep = 12:00 in Berlin (UTC+2).
const NOW = new Date('2026-09-27T10:00:00Z');
const BERLIN = 120;

const MESSAGES = [
  'Work was so stressful again today, I ended up snacking on crisps at midnight',
  'I only slept five hours, how do I get through my workout?',
  'Any ideas for a quick breakfast? I keep running out of time in the mornings',
  'Deadlines at work all week, my evenings are a mess',
  'Slept badly again and felt tired all afternoon',
  'Feeling more motivated after the weekend walk',
];
const msgs = (texts = MESSAGES): UserMessage[] =>
  texts.map((content, i) => ({
    persona: (['aria', 'max', 'luna'] as const)[i % 3]!,
    created_at: new Date(NOW.getTime() - i * 86_400_000).toISOString(),
    content,
  }));

const good: WellnessInsight[] = [
  {
    emoji: '🌙',
    theme: 'sleep',
    title: 'Short nights, tired afternoons',
    body: 'Several times you mentioned poor sleep and low afternoon energy. A wind-down routine could help; Luna has ideas.',
  },
  {
    emoji: '🧘',
    theme: 'stress',
    title: 'Busy days, late snacks',
    body: 'Stressful workdays often come up alongside late-evening snacking. A planned evening snack may make those nights easier.',
  },
];
const reply = (insights: WellnessInsight[], safety = 'none') =>
  JSON.stringify({ safety, insights });

function setup(opts: {
  replies?: string[];
  messages?: UserMessage[];
  premium?: boolean;
  consented?: boolean;
  latest?: WellnessSet | null;
  calls?: number;
  llm?: boolean;
}) {
  const saved: { set: Omit<WellnessSet, 'createdAt'>; model: string }[] = [];
  const usage: number[] = [];
  const requests: LlmRequest[] = [];
  const replies = [...(opts.replies ?? [])];
  const llm: LlmProvider = {
    complete: jest.fn(async (req: LlmRequest) => {
      requests.push({ ...req, messages: [...req.messages] });
      return {
        text: replies.shift() ?? '',
        model: 'claude-test',
        inputTokens: 80,
        outputTokens: 20,
      };
    }),
  };
  const deps: WellnessDeps = {
    llm: opts.llm === false ? null : llm,
    now: () => NOW,
    getUserId: async (req) => (req.headers.get('Authorization') ? 'user-1' : null),
    store: {
      premium: async () => opts.premium ?? true,
      consented: async () => opts.consented ?? true,
      latest: async () => opts.latest ?? null,
      messages: async () => opts.messages ?? msgs(),
      save: async (_u, set, model) => {
        saved.push({ set, model });
        return { ...set, createdAt: NOW.toISOString() };
      },
      callsSince: async () => opts.calls ?? 0,
      logUsage: async (_u, _m, input) => void usage.push(input),
    },
  };
  return { deps, saved, usage, requests, llm };
}

const post = (body: unknown = { tzOffsetMinutes: BERLIN }, auth = true) =>
  new Request('http://localhost/fn', {
    method: 'POST',
    headers: auth ? { Authorization: 'Bearer t' } : {},
    body: JSON.stringify(body),
  });

describe('generate-wellness-insights', () => {
  it('generates, stores and returns themes from the user’s own messages', async () => {
    const s = setup({ replies: [reply(good)] });
    const res = await handleWellnessInsights(post(), s.deps);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      periodStart: '2026-09-14',
      periodEnd: '2026-09-27',
      messagesAnalysed: 6,
      insights: good,
    });
    expect(s.saved).toHaveLength(1);
    expect(s.usage).toEqual([80]);
    // Only messages go to the model: oldest first, with coach and local date, no replies/profile.
    const sent = JSON.parse(s.requests[0]!.messages[0]!.content as string);
    expect(Object.keys(sent)).toEqual(['messages']);
    expect(sent.messages[0]).toEqual({ coach: 'luna', date: '2026-09-22', text: MESSAGES[5] });
    expect(sent.messages.at(-1).date).toBe('2026-09-27');
  });

  it('requires auth, Premium and the separate consent', async () => {
    expect((await handleWellnessInsights(post(undefined, false), setup({}).deps)).status).toBe(401);
    const free = await handleWellnessInsights(post(), setup({ premium: false }).deps);
    expect(free.status).toBe(403);
    expect(await free.json()).toMatchObject({ error: 'premium_required' });
    const s = setup({ consented: false });
    const noConsent = await handleWellnessInsights(post(), s.deps);
    expect(await noConsent.json()).toMatchObject({ error: 'consent_required' });
    expect(s.llm.complete).not.toHaveBeenCalled();
  });

  it('points to professional help instead of insights when messages show distress', async () => {
    const s = setup({ messages: msgs([...MESSAGES, 'I made myself sick after dinner again']) });
    const body = await (await handleWellnessInsights(post(), s.deps)).json();
    expect(body).toMatchObject({ status: 'support', flag: 'disordered_eating' });
    expect(body.note).toMatch(/eating disorder support service/);
    expect(s.llm.complete).not.toHaveBeenCalled();
    expect(s.saved).toHaveLength(0);

    const crisis = setup({
      messages: msgs(['I want to die']),
      latest: {
        periodStart: '2026-09-10',
        periodEnd: '2026-09-25',
        insights: good,
        messagesAnalysed: 6,
        createdAt: '2026-09-25T08:00:00Z',
      },
    });
    const c = await (await handleWellnessInsights(post(), crisis.deps)).json();
    expect(c).toMatchObject({ status: 'support', flag: 'crisis' });
    expect(c.insights).toBeUndefined();
  });

  it('trusts the model’s safety flag too and stores nothing', async () => {
    const s = setup({ replies: [reply([], 'disordered_eating')] });
    const body = await (await handleWellnessInsights(post(), s.deps)).json();
    expect(body).toMatchObject({ status: 'support', flag: 'disordered_eating' });
    expect(s.saved).toHaveLength(0);
  });

  it('returns this week’s set without calling the model', async () => {
    const latest: WellnessSet = {
      periodStart: '2026-09-09',
      periodEnd: '2026-09-22',
      insights: good,
      messagesAnalysed: 7,
      createdAt: '2026-09-22T08:00:00Z',
    };
    const s = setup({ latest });
    expect(await (await handleWellnessInsights(post(), s.deps)).json()).toMatchObject({
      status: 'ok',
      periodEnd: '2026-09-22',
    });
    expect(s.llm.complete).not.toHaveBeenCalled();

    const old = setup({ latest: { ...latest, periodEnd: '2026-09-20' }, replies: [reply(good)] });
    await handleWellnessInsights(post(), old.deps);
    expect(old.saved).toHaveLength(1);
  });

  it('asks for more chats first, or keeps an older set', async () => {
    const few = msgs(MESSAGES.slice(0, MIN_MESSAGES - 1));
    const s = setup({ messages: few });
    expect(await (await handleWellnessInsights(post(), s.deps)).json()).toEqual({
      status: 'not_enough',
      messageCount: 4,
      needed: MIN_MESSAGES,
    });
    const latest: WellnessSet = {
      periodStart: '2026-09-01',
      periodEnd: '2026-09-14',
      insights: good,
      messagesAnalysed: 9,
      createdAt: '2026-09-14T08:00:00Z',
    };
    const kept = await handleWellnessInsights(post(), setup({ messages: few, latest }).deps);
    expect(await kept.json()).toMatchObject({ status: 'ok', periodEnd: '2026-09-14' });
  });

  it('rejects insights that quote the user or advise restriction, then retries', async () => {
    const quoting: WellnessInsight = {
      ...good[0]!,
      body: 'You said "work was so stressful again today, I ended up snacking" more than once.',
    };
    const restrictive: WellnessInsight = {
      ...good[1]!,
      body: 'Try skipping your evening snack when work is stressful.',
    };
    const s = setup({ replies: [reply([quoting, restrictive]), reply(good)] });
    const body = await (await handleWellnessInsights(post(), s.deps)).json();
    expect(body.insights).toEqual(good);
    expect(s.requests[1]!.messages.at(-1)!.content).toMatch(/quoted the user or suggested/);
  });

  it('keeps only the clean insights on the last attempt, or fails', async () => {
    const bad: WellnessInsight = { ...good[1]!, body: 'A detox week might reset things.' };
    const s = setup({ replies: [reply([good[0]!, bad]), reply([good[0]!, bad])] });
    const body = await (await handleWellnessInsights(post(), s.deps)).json();
    expect(body.insights).toEqual([good[0]]);

    const none = setup({ replies: ['not json', reply([bad])] });
    const res = await handleWellnessInsights(post(), none.deps);
    expect(res.status).toBe(502);
    expect(none.saved).toHaveLength(0);
  });

  it('is rate limited and needs a configured model', async () => {
    expect((await handleWellnessInsights(post(), setup({ calls: 4 }).deps)).status).toBe(429);
    expect((await handleWellnessInsights(post(), setup({ llm: false }).deps)).status).toBe(503);
  });

  it('caps what is sent to the model', async () => {
    const long = msgs(Array.from({ length: 60 }, (_, i) => `${'word '.repeat(200)}${i}`));
    const s = setup({ messages: long, replies: [reply(good)] });
    await handleWellnessInsights(post(), s.deps);
    const sent = s.requests[0]!.messages[0]!.content as string;
    const texts = JSON.parse(sent).messages as { text: string }[];
    expect(texts.every((m) => m.text.length <= 600)).toBe(true);
    expect(texts.reduce((a, m) => a + m.text.length, 0)).toBeLessThanOrEqual(15_000);
  });
});

describe('quotesMessages', () => {
  it('flags six or more consecutive words from a message, ignoring case and punctuation', () => {
    const m = ['Work was so stressful again today, honestly.'];
    expect(quotesMessages('work was SO stressful again today!', m)).toBe(true);
    expect(quotesMessages('Stressful workdays came up again', m)).toBe(false);
    expect(quotesMessages('work was so stressful again', m)).toBe(false);
  });
});
