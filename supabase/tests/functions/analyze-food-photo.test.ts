import {
  detectMediaType,
  handleAnalyzeFoodPhoto,
  PREMIUM_DAILY_LIMIT,
  stripJpegMetadata,
  type FoodPhotoDeps,
  type FoodPhotoStore,
} from '../../functions/analyze-food-photo/handler';
import type { DietPrefs } from '../../functions/_shared/dietRules';
import { anthropicProvider, type LlmProvider, type LlmRequest } from '../../functions/_shared/llm';
import type { FoodResult } from '../../functions/_shared/usda';

const JPEG = '/9j/' + 'A'.repeat(200);
const noPrefs: DietPrefs = {
  dietStyles: [],
  restrictions: [],
  restrictionOther: null,
  allergies: [],
  allergyOther: null,
  avoidFoods: [],
};

const food = (q: string, name: string, kcal: number, brand: string | null = null): FoodResult => ({
  ref: `usda:${q}`,
  name,
  brand,
  per100g: { kcal, proteinG: 10, carbsG: 10, fatG: 5, fiberG: 1 },
  servings: [],
});
const usda: Record<string, FoodResult[]> = {
  'chicken breast roasted': [food('chicken breast roasted', 'Chicken, breast, roasted', 165)],
  'rice white cooked': [
    food('rice-brand', 'Rice bowl', 150, 'Acme'),
    food('rice white cooked', 'Rice, white, cooked', 130),
  ],
  'peanut sauce': [food('peanut sauce', 'Sauce, peanut', 250)],
  cheese: [food('cheese', 'Cheese, cheddar', 400)],
};

const reply = (...items: [string, string, number, string?][]) =>
  JSON.stringify({
    items: items.map(([name, usda_query, grams, confidence]) => ({
      name,
      usda_query,
      grams,
      confidence: confidence ?? 'medium',
    })),
  });

function setup(opts: {
  replies: (string | Error)[];
  prefs?: Partial<DietPrefs>;
  premium?: boolean;
  used?: number;
  limit?: number;
}) {
  const usage: number[][] = [];
  const requests: LlmRequest[] = [];
  const store: FoodPhotoStore = {
    isPremium: async () => opts.premium ?? false,
    prefs: async () => ({ ...noPrefs, ...opts.prefs }),
    dailyLimit: async () => opts.limit ?? 3,
    scansSince: async () => opts.used ?? 0,
    logUsage: async (_u, _m, i, o) => void usage.push([i, o]),
  };
  const replies = [...opts.replies];
  const llm: LlmProvider = {
    complete: jest.fn(async (req: LlmRequest) => {
      requests.push({ ...req, messages: [...req.messages] });
      const next = replies.shift() ?? '';
      if (next instanceof Error) throw next;
      return { text: next, model: 'claude-test', inputTokens: 100, outputTokens: 20 };
    }),
  };
  const deps: FoodPhotoDeps = {
    store,
    llm,
    getUserId: async () => 'user-1',
    searchFoods: async (q) => usda[q] ?? [],
  };
  return { deps, usage, requests };
}

const post = (body: object = { image: JPEG }) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

describe('analyze-food-photo', () => {
  it('names foods, takes the numbers from USDA and reports what is left today', async () => {
    const { deps, usage, requests } = setup({
      replies: [
        reply(
          ['Grilled chicken', 'chicken breast roasted', 152, 'high'],
          ['Rice', 'rice white cooked', 180],
        ),
      ],
    });
    const res = await handleAnalyzeFoodPhoto(post(), deps);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([
      expect.objectContaining({
        name: 'Grilled chicken',
        grams: 150,
        confidence: 'high',
        food: expect.objectContaining({ ref: 'usda:chicken breast roasted' }),
        warnings: [],
      }),
      // A generic (unbranded) food is preferred.
      expect.objectContaining({ food: expect.objectContaining({ ref: 'usda:rice white cooked' }) }),
    ]);
    expect(body.remaining).toBe(2);
    expect(usage).toEqual([[100, 20]]);
    const content = requests[0]!.messages[0]!.content;
    expect(Array.isArray(content) && content[0]).toEqual({
      type: 'image',
      mediaType: 'image/jpeg',
      base64: JPEG,
    });
    expect(requests[0]!.system).toContain('Do not state calories');
    expect(requests[0]!.system).toContain('Never describe a person');
  });

  it('flags allergens and kosher meat + dairy instead of hiding them', async () => {
    const { deps } = setup({
      prefs: { allergies: ['peanuts'], restrictions: ['kosher'] },
      replies: [
        reply(
          ['Chicken', 'chicken breast roasted', 150],
          ['Satay sauce', 'peanut sauce', 30],
          ['Cheddar', 'cheese', 20],
        ),
      ],
    });
    const body = await (await handleAnalyzeFoodPhoto(post(), deps)).json();
    expect(body.items[1].warnings).toEqual(['allergy:peanuts']);
    expect(body.items[0].warnings).toEqual([]);
    expect(body.plateWarnings).toEqual(['restriction:kosher_mixing']);
  });

  it('keeps unmatched foods without numbers', async () => {
    const { deps } = setup({ replies: [reply(['Mystery stew', 'mystery stew', 300, 'low'])] });
    const body = await (await handleAnalyzeFoodPhoto(post(), deps)).json();
    expect(body.items[0]).toMatchObject({ name: 'Mystery stew', food: null, confidence: 'low' });
  });

  it('returns an empty list when there is no food', async () => {
    const { deps } = setup({ replies: ['{"items":[]}'] });
    const body = await (await handleAnalyzeFoodPhoto(post(), deps)).json();
    expect(body.items).toEqual([]);
  });

  it('retries once on invalid JSON and logs one usage row for the scan', async () => {
    const { deps, usage, requests } = setup({
      replies: ['the plate has chicken', reply(['Chicken', 'chicken breast roasted', 100])],
    });
    const res = await handleAnalyzeFoodPhoto(post(), deps);
    expect(res.status).toBe(200);
    expect(requests).toHaveLength(2);
    expect(usage).toEqual([[200, 40]]);
  });

  it('fails gracefully after two invalid replies', async () => {
    const { deps, usage } = setup({ replies: ['nope', '{"items":"x"}'] });
    const res = await handleAnalyzeFoodPhoto(post(), deps);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'analysis_failed' });
    expect(usage).toHaveLength(1);
  });

  it('does not count a scan when the model could not be reached', async () => {
    const { deps, usage } = setup({ replies: [new Error('down'), new Error('down')] });
    expect((await handleAnalyzeFoodPhoto(post(), deps)).status).toBe(502);
    expect(usage).toHaveLength(0);
  });

  it('enforces the free daily limit and the Premium cost cap', async () => {
    const free = setup({ replies: [], used: 3 });
    const r1 = await handleAnalyzeFoodPhoto(post(), free.deps);
    expect(r1.status).toBe(429);
    expect(await r1.json()).toEqual({ error: 'limit_reached' });

    const premium = setup({ replies: ['{"items":[]}'], used: 3, premium: true });
    const r2 = await handleAnalyzeFoodPhoto(post(), premium.deps);
    expect(r2.status).toBe(200);
    expect((await r2.json()).remaining).toBeNull();

    const capped = setup({ replies: [], used: PREMIUM_DAILY_LIMIT, premium: true });
    expect(await (await handleAnalyzeFoodPhoto(post(), capped.deps)).json()).toEqual({
      error: 'rate_limited',
    });
  });

  it('rejects anything that is not a JPEG, PNG or WebP image', async () => {
    const { deps } = setup({ replies: [] });
    for (const image of ['PHN2Zz4' + 'A'.repeat(200), 'hello', '/9j/' + '!'.repeat(200)]) {
      const res = await handleAnalyzeFoodPhoto(post({ image }), deps);
      expect(res.status).toBe(400);
    }
    expect(detectMediaType('iVBORw0KGgoAAA')).toBe('image/png');
    expect(detectMediaType('UklGRiQAAABXRUJQVlA4')).toBe('image/webp');
    // A data URL prefix is accepted.
    const ok = setup({ replies: ['{"items":[]}'] });
    const res = await handleAnalyzeFoodPhoto(
      post({ image: `data:image/jpeg;base64,${JPEG}` }),
      ok.deps,
    );
    expect(res.status).toBe(200);
  });

  it('requires sign-in and a configured model', async () => {
    const { deps } = setup({ replies: [] });
    expect(
      (await handleAnalyzeFoodPhoto(post(), { ...deps, getUserId: async () => null })).status,
    ).toBe(401);
    expect((await handleAnalyzeFoodPhoto(post(), { ...deps, llm: null })).status).toBe(503);
  });
});

describe('stripJpegMetadata', () => {
  const seg = (marker: number, body: string) =>
    String.fromCharCode(0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff) + body;
  const jpeg = (...segments: string[]) =>
    btoa('\xff\xd8' + segments.join('') + '\xff\xda' + '\x00\x02' + 'SCANDATA\xff\xd9');

  it('drops EXIF/XMP/comment segments and keeps the image data', () => {
    const withExif = jpeg(
      seg(0xe0, 'JFIF\x00'),
      seg(0xe1, 'Exif\x00\x00GPS 51.5N 0.1W'),
      seg(0xfe, 'comment'),
      seg(0xdb, 'quant'),
    );
    const out = atob(stripJpegMetadata(withExif));
    expect(out).not.toContain('GPS');
    expect(out).not.toContain('comment');
    expect(out).toContain('JFIF');
    expect(out).toContain('quant');
    expect(out.endsWith('SCANDATA\xff\xd9')).toBe(true);
  });

  it('leaves unparseable data alone', () => {
    expect(stripJpegMetadata('iVBORw0KGgo=')).toBe('iVBORw0KGgo=');
    const broken = btoa('\xff\xd8\x12\x34');
    expect(stripJpegMetadata(broken)).toBe(broken);
  });

  it('is applied before the photo is sent to the model', async () => {
    const image = jpeg(seg(0xe1, 'Exif GPS'), seg(0xdb, 'q'.repeat(200)));
    const { deps, requests } = setup({ replies: ['{"items":[]}'] });
    await handleAnalyzeFoodPhoto(post({ image }), deps);
    const content = requests[0]!.messages[0]!.content as { type: string; base64?: string }[];
    expect(atob(content[0]!.base64!)).not.toContain('GPS');
  });
});

describe('anthropic provider', () => {
  it('sends images as base64 content blocks', async () => {
    const fetchFn = jest.fn(
      async () =>
        new Response(JSON.stringify({ content: [{ type: 'text', text: '{}' }], usage: {} })),
    );
    await anthropicProvider('key', 'm', fetchFn as unknown as typeof fetch).complete({
      system: 's',
      maxTokens: 10,
      messages: [
        { role: 'user', content: [{ type: 'image', mediaType: 'image/png', base64: 'abc' }] },
        { role: 'assistant', content: 'plain' },
      ],
    });
    const body = JSON.parse(
      (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.messages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'abc' } },
        ],
      },
      { role: 'assistant', content: 'plain' },
    ]);
  });
});
