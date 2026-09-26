import { handleFoodSearch } from '../../functions/food-search/handler';

const post = (body: unknown) =>
  new Request('http://localhost/food-search', { method: 'POST', body: JSON.stringify(body) });

const okFetch = jest.fn(
  async () =>
    new Response(
      JSON.stringify({
        foods: [
          {
            fdcId: 9,
            description: 'Banana, raw',
            foodNutrients: [{ nutrientId: 1008, value: 89 }],
          },
        ],
      }),
    ),
) as unknown as typeof fetch;

describe('food-search handler', () => {
  it('searches USDA with the server key and returns normalised foods', async () => {
    const res = await handleFoodSearch(post({ query: 'banana' }), {
      apiKey: 'k3y',
      fetch: okFetch,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      foods: [
        {
          ref: 'usda:9',
          name: 'Banana, raw',
          brand: null,
          per100g: { kcal: 89, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
          servings: [],
        },
      ],
    });
    const [url, init] = (okFetch as unknown as jest.Mock).mock.calls[0];
    expect(url).toContain('api_key=k3y');
    expect(JSON.parse(init.body).query).toBe('banana');
  });

  it('rejects bad queries and missing configuration', async () => {
    expect(
      (await handleFoodSearch(post({ query: 'a' }), { apiKey: 'k', fetch: okFetch })).status,
    ).toBe(400);
    const res = await handleFoodSearch(post({ query: 'apple' }), {
      apiKey: undefined,
      fetch: okFetch,
    });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'not_configured' });
  });

  it('reports upstream failures and rate limits', async () => {
    const limited = jest.fn(
      async () => new Response('', { status: 429 }),
    ) as unknown as typeof fetch;
    const res = await handleFoodSearch(post({ query: 'apple' }), { apiKey: 'k', fetch: limited });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'rate_limited' });
    const down = jest.fn(async () => {
      throw new Error('network');
    }) as unknown as typeof fetch;
    expect(
      await (await handleFoodSearch(post({ query: 'apple' }), { apiKey: 'k', fetch: down })).json(),
    ).toEqual({ error: 'upstream_failed' });
  });

  it('answers CORS preflight', async () => {
    const res = await handleFoodSearch(new Request('http://localhost', { method: 'OPTIONS' }), {
      apiKey: 'k',
      fetch: okFetch,
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
