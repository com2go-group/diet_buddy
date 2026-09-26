import type { LlmProvider, LlmRequest } from '../../functions/_shared/llm';
import { summarise, windowDays, type RawData } from '../../functions/generate-insights/aggregate';
import {
  handleGenerateInsights,
  type AiInsight,
  type InsightsContext,
  type InsightsDeps,
} from '../../functions/generate-insights/handler';
import { unsafeText } from '../../functions/generate-insights/safety';

// 10:00 UTC on 27 Sep = 12:00 in Berlin (UTC+2).
const NOW = new Date('2026-09-27T10:00:00Z');
const BERLIN = 120;

/** n logged days before today: 1,800 kcal, half of it after 18:00 local on odd days. */
function raw(n: number): RawData {
  const food: RawData['food'] = [];
  for (let d = 1; d <= n; d++) {
    const day = new Date(NOW.getTime() - d * 86_400_000).toISOString().slice(0, 10);
    food.push({ logged_at: `${day}T06:00:00Z`, calories: 900, protein_g: 60 });
    food.push({ logged_at: `${day}T${d % 2 ? '17' : '10'}:30:00Z`, calories: 900, protein_g: 50 });
  }
  return {
    food,
    water: [{ logged_at: '2026-09-26T08:00:00Z', ml: 1500 }],
    checkins: [{ date: '2026-09-26', mood: 'good', energy: 7, sleep_hours: 7.5, hunger: 'normal' }],
    weights: [
      { measured_at: '2026-09-15T07:00:00Z', weight_kg: 82 },
      { measured_at: '2026-09-25T07:00:00Z', weight_kg: 81.2 },
    ],
  };
}

const good: AiInsight[] = [
  { emoji: '💧', title: 'Hydration dips', body: 'You drank 1.5 L on Saturday against a 2 L goal.' },
  {
    emoji: '⚡',
    title: 'Evening eating',
    body: 'Half your calories come after 6 pm on some days.',
  },
];

function setup(opts: {
  replies: string[];
  ctx?: Partial<InsightsContext>;
  existing?: AiInsight[] | null;
  days?: number;
  calls?: number;
}) {
  const saved: { day: string; insights: AiInsight[] }[] = [];
  const usage: number[] = [];
  const requests: LlmRequest[] = [];
  const replies = [...opts.replies];
  const llm: LlmProvider = {
    complete: jest.fn(async (req: LlmRequest) => {
      requests.push({ ...req, messages: [...req.messages] });
      return {
        text: replies.shift() ?? '',
        model: 'claude-test',
        inputTokens: 50,
        outputTokens: 10,
      };
    }),
  };
  const deps: InsightsDeps = {
    llm,
    now: () => NOW,
    getUserId: async () => 'user-1',
    store: {
      context: async () => ({
        premium: true,
        targets: { calories: 1800, proteinG: 130, waterMl: 2000 },
        goalTypes: ['lose_fat'],
        weeklyChangeKg: -0.5,
        ...opts.ctx,
      }),
      existing: async () => opts.existing ?? null,
      raw: async () => raw(opts.days ?? 10),
      save: async (_u, day, insights) => void saved.push({ day, insights }),
      callsSince: async () => opts.calls ?? 0,
      logUsage: async () => void usage.push(1),
    },
  };
  return { deps, saved, usage, requests };
}

const post = (body: object = { tzOffsetMinutes: BERLIN }) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

describe('aggregate', () => {
  it('uses the 14 local days before today', () => {
    const days = windowDays(new Date('2026-09-26T23:30:00Z'), BERLIN); // already 27 Sep in Berlin
    expect(days).toHaveLength(14);
    expect(days[0]).toBe('2026-09-13');
    expect(days[13]).toBe('2026-09-26');
  });

  it('sums each local day, including evening share, water, check-ins and weight change', () => {
    const s = summarise(raw(10), NOW, BERLIN);
    expect(s.daysLogged).toBe(10);
    const sat = s.days.find((d) => d.date === '2026-09-26')!;
    expect(sat).toMatchObject({
      weekday: 'Sat',
      kcal: 1800,
      proteinG: 110,
      eveningPct: 50, // 17:30 UTC = 19:30 in Berlin
      waterMl: 1500,
      mood: 'good',
      sleepHours: 7.5,
    });
    expect(s.days.find((d) => d.date === '2026-09-25')!.eveningPct).toBe(0);
    expect(s.days[0]).toMatchObject({ kcal: null, waterMl: 0, mood: null });
    expect(s.weight).toEqual({ firstKg: 82, lastKg: 81.2, days: 10 });
  });
});

describe('safety screen', () => {
  it.each([
    'Try skipping breakfast on busy days',
    'Intermittent fasting could help',
    'A juice cleanse on Monday',
    'Consider a fat-burning supplement',
    'Eat less than your target on weekends',
  ])('rejects "%s"', (text) => expect(unsafeText(text)).toBe(true));

  it.each([
    'Your breakfast is your most consistent meal',
    'You made fast progress this week',
    'Eating enough protein at lunch helps you stay full',
  ])('allows "%s"', (text) => expect(unsafeText(text)).toBe(false));
});

describe('generate-insights', () => {
  it('generates, stores and returns insights from aggregates only', async () => {
    const { deps, saved, requests } = setup({ replies: [JSON.stringify({ insights: good })] });
    const res = await handleGenerateInsights(post(), deps);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ day: '2026-09-27', insights: good });
    expect(saved).toEqual([{ day: '2026-09-27', insights: good }]);
    const sent = JSON.parse(requests[0]!.messages[0]!.content as string);
    expect(Object.keys(sent)).toEqual([
      'targets',
      'goals',
      'plannedWeeklyChangeKg',
      'weightChange',
      'days',
    ]);
    expect(sent.days).toHaveLength(14);
    expect(requests[0]!.system).toContain(
      'Never suggest eating less than the daily calorie target',
    );
  });

  it('returns today’s stored insights without calling the model', async () => {
    const { deps, requests } = setup({ replies: [], existing: good });
    const body = await (await handleGenerateInsights(post(), deps)).json();
    expect(body.insights).toEqual(good);
    expect(requests).toHaveLength(0);
  });

  it('needs five logged days first', async () => {
    const { deps, requests } = setup({ replies: [], days: 4 });
    const body = await (await handleGenerateInsights(post(), deps)).json();
    expect(body).toMatchObject({ insights: [], notEnoughData: true, daysLogged: 4 });
    expect(requests).toHaveLength(0);
  });

  it('regenerates when an insight suggests restriction, then drops what is still unsafe', async () => {
    const unsafe = { emoji: '🍳', title: 'Mornings', body: 'Try skipping breakfast.' };
    const first = setup({
      replies: [
        JSON.stringify({ insights: [...good, unsafe] }),
        JSON.stringify({ insights: good }),
      ],
    });
    const r1 = await (await handleGenerateInsights(post(), first.deps)).json();
    expect(r1.insights).toEqual(good);
    expect(first.requests[1]!.messages.at(-1)!.content).toContain('skipping meals');

    const second = setup({
      replies: [
        JSON.stringify({ insights: [...good, unsafe] }),
        JSON.stringify({ insights: [good[0], unsafe] }),
      ],
    });
    const r2 = await (await handleGenerateInsights(post(), second.deps)).json();
    expect(r2.insights).toEqual([good[0]]);
    expect(second.saved[0]!.insights).toEqual([good[0]]);
  });

  it('fails without storing anything when nothing safe or valid comes back', async () => {
    const { deps, saved } = setup({
      replies: [
        'nope',
        JSON.stringify({ insights: [{ emoji: '🥤', title: 'x', body: 'Try a detox tea' }] }),
      ],
    });
    const res = await handleGenerateInsights(post(), deps);
    expect(res.status).toBe(502);
    expect(saved).toHaveLength(0);
  });

  it('is Premium only, rate-limited and validates the time zone', async () => {
    const free = setup({ replies: [], ctx: { premium: false } });
    expect((await handleGenerateInsights(post(), free.deps)).status).toBe(403);
    const capped = setup({ replies: [], calls: 6 });
    expect((await handleGenerateInsights(post(), capped.deps)).status).toBe(429);
    const bad = setup({ replies: [] });
    expect((await handleGenerateInsights(post({ tzOffsetMinutes: 5000 }), bad.deps)).status).toBe(
      400,
    );
    const noKey = setup({ replies: [] });
    expect((await handleGenerateInsights(post(), { ...noKey.deps, llm: null })).status).toBe(503);
  });
});
