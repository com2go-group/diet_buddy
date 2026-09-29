import { limitsFrom, userRateGuard } from '../../functions/_shared/rateLimit';
import { handleFoodBarcode } from '../../functions/food-barcode/handler';
import { handleFoodSearch } from '../../functions/food-search/handler';

const counter = () => {
  const hits = new Map<string, number>();
  return async (key: string, window: number, max: number) => {
    const k = `${key}/${window}`;
    hits.set(k, (hits.get(k) ?? 0) + 1);
    return hits.get(k)! <= max;
  };
};
const post = (body: object) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

describe('userRateGuard', () => {
  it('caps each user per minute and per day', async () => {
    const guard = userRateGuard({
      name: 'food_search',
      userId: async (r) => r.headers.get('x-user'),
      limiter: counter(),
      limits: async () => ({ perMinute: 2, perDay: 10 }),
    });
    const as = (u: string | null) =>
      new Request('http://x', { method: 'POST', headers: u ? { 'x-user': u } : {} });
    expect(await guard(as('a'))).toBe('ok');
    expect(await guard(as('a'))).toBe('ok');
    expect(await guard(as('a'))).toBe('limited');
    expect(await guard(as('b'))).toBe('ok');
    expect(await guard(as(null))).toBe('unauthorized');
  });

  it('lets requests through when the counters fail', async () => {
    const guard = userRateGuard({
      name: 'x',
      userId: async () => 'a',
      limiter: async () => {
        throw new Error('down');
      },
      limits: async () => ({ perMinute: 1, perDay: 1 }),
    });
    expect(await guard(post({}))).toBe('ok');
  });

  it('reads limits per field', () => {
    expect(limitsFrom({ a: 5, b: 0, c: 3 }, { a: 1, b: 2 })).toEqual({ a: 5, b: 2 });
    expect(limitsFrom(null, { a: 1 })).toEqual({ a: 1 });
  });
});

describe('food functions', () => {
  it('answer 429 / 401 before calling USDA or Open Food Facts', async () => {
    const fetchFn = jest.fn();
    const limited = await handleFoodSearch(post({ query: 'apple' }), {
      apiKey: 'k',
      fetch: fetchFn,
      admit: async () => 'limited',
    });
    expect(limited.status).toBe(429);
    expect((await limited.json()).error).toBe('rate_limited');
    const anon = await handleFoodBarcode(post({ barcode: '4006381333931' }), {
      fetch: fetchFn,
      userAgent: 'x',
      admit: async () => 'unauthorized',
    });
    expect(anon.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
