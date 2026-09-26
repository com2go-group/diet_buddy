import { normalizeFoods, type FdcSearchFood, type FoodResult } from './usda.ts';

export const FDC_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

export class UsdaError extends Error {
  readonly status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/** Searches FoodData Central and returns normalised foods (per 100 g). */
export async function searchUsda(
  query: string,
  apiKey: string,
  fetchFn: typeof fetch,
  dataType: string[] = ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'],
  pageSize = 25,
): Promise<FoodResult[]> {
  const res = await fetchFn(`${FDC_URL}?api_key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, pageSize, dataType }),
  }).catch(() => null);
  if (!res || !res.ok) throw new UsdaError('usda request failed', res?.status);
  const data = (await res.json().catch(() => null)) as { foods?: FdcSearchFood[] } | null;
  return normalizeFoods(Array.isArray(data?.foods) ? data.foods : []);
}
