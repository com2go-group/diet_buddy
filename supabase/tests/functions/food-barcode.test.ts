import { normalizeOffProduct, validBarcode } from '../../functions/_shared/openFoodFacts';
import { handleFoodBarcode } from '../../functions/food-barcode/handler';

// Nutella 400 g (EAN-13 with a valid check digit).
const CODE = '3017620422003';
const product = {
  code: CODE,
  product_name: 'Nutella',
  brands: 'Ferrero, Nutella',
  serving_size: '15 g',
  serving_quantity: 15,
  nutriments: {
    'energy-kcal_100g': 539,
    proteins_100g: 6.3,
    carbohydrates_100g: 57.5,
    fat_100g: 30.9,
    fiber_100g: '0',
  },
};

const post = (body: object) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body) });
const offFetch = (status: number, data: unknown) =>
  jest.fn(
    async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(data), { status }),
  );

describe('Open Food Facts', () => {
  it('validates GTIN check digits', () => {
    expect(validBarcode(CODE)).toBe(CODE);
    expect(validBarcode('3017620422004')).toBeNull();
    expect(validBarcode('96385074')).toBe('96385074'); // EAN-8
    expect(validBarcode('036000291452')).toBe('036000291452'); // UPC-A
    expect(validBarcode('12345')).toBeNull();
    expect(validBarcode(42)).toBeNull();
  });

  it('normalises per-100 g values, the brand and the serving', () => {
    expect(normalizeOffProduct(product, CODE)).toEqual({
      ref: `off:${CODE}`,
      name: 'Nutella',
      brand: 'Ferrero',
      per100g: { kcal: 539, proteinG: 6.3, carbsG: 57.5, fatG: 30.9, fiberG: 0 },
      servings: [{ label: '1 serving (15 g)', grams: 15 }],
    });
  });

  it('falls back to kJ, and rejects products without usable energy or a name', () => {
    const kj = normalizeOffProduct(
      { product_name: 'Juice', nutriments: { energy_100g: 188 } },
      CODE,
    );
    expect(kj?.per100g.kcal).toBe(45);
    expect(normalizeOffProduct({ product_name: 'Mystery', nutriments: {} }, CODE)).toBeNull();
    expect(
      normalizeOffProduct({ product_name: 'Bad', nutriments: { 'energy-kcal_100g': 5000 } }, CODE),
    ).toBeNull();
    expect(normalizeOffProduct({ nutriments: { 'energy-kcal_100g': 100 } }, CODE)).toBeNull();
  });
});

describe('food-barcode', () => {
  it('looks up the product with an identifying User-Agent', async () => {
    const fetch = offFetch(200, { status: 1, product });
    const res = await handleFoodBarcode(post({ barcode: CODE }), {
      fetch: fetch as unknown as typeof globalThis.fetch,
      userAgent: 'DietBuddy/1.0 (test)',
    });
    expect(res.status).toBe(200);
    expect((await res.json()).food.ref).toBe(`off:${CODE}`);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toContain(`/api/v2/product/${CODE}?fields=`);
    expect((init!.headers as Record<string, string>)['User-Agent']).toBe('DietBuddy/1.0 (test)');
  });

  it('reports unknown products, bad barcodes and upstream failures', async () => {
    const deps = (f: jest.Mock) => ({
      fetch: f as unknown as typeof globalThis.fetch,
      userAgent: 'x',
    });
    expect((await handleFoodBarcode(post({ barcode: CODE }), deps(offFetch(404, {})))).status).toBe(
      404,
    );
    expect(
      (await handleFoodBarcode(post({ barcode: CODE }), deps(offFetch(200, { status: 0 })))).status,
    ).toBe(404);
    expect(
      (await handleFoodBarcode(post({ barcode: '123' }), deps(offFetch(200, {})))).status,
    ).toBe(400);
    const limited = await handleFoodBarcode(post({ barcode: CODE }), deps(offFetch(429, {})));
    expect(await limited.json()).toEqual({ error: 'rate_limited' });
  });
});
