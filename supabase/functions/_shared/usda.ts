/**
 * USDA FoodData Central search results → the app's food shape. Pure (no Deno or Node APIs) so
 * the app's Jest suite can test it. Values are per 100 g (per 100 ml for some branded drinks,
 * which we treat as grams). See https://fdc.nal.usda.gov/api-guide.
 */

export interface FoodServing {
  label: string;
  grams: number;
}

export interface FoodResult {
  /** Stable reference stored in food_logs.food_ref, e.g. "usda:171705". */
  ref: string;
  name: string;
  brand: string | null;
  per100g: { kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number };
  servings: FoodServing[];
}

interface FdcNutrient {
  nutrientId?: number;
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
}

interface FdcMeasure {
  disseminationText?: string;
  gramWeight?: number;
}

export interface FdcSearchFood {
  fdcId: number;
  description?: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: FdcNutrient[];
  foodMeasures?: FdcMeasure[];
}

// Nutrient IDs (and legacy numbers). Energy has three variants: the classic kcal value and the
// two Atwater-factor values that Foundation foods use instead.
const NUTRIENTS = {
  kcal: { ids: [1008, 2047, 2048], numbers: ['208', '957', '958'] },
  proteinG: { ids: [1003], numbers: ['203'] },
  fatG: { ids: [1004], numbers: ['204'] },
  carbsG: { ids: [1005], numbers: ['205'] },
  fiberG: { ids: [1079], numbers: ['291'] },
} as const;

function nutrient(food: FdcSearchFood, key: keyof typeof NUTRIENTS): number | null {
  const { ids, numbers } = NUTRIENTS[key];
  for (let i = 0; i < ids.length; i++) {
    const n = food.foodNutrients?.find(
      (x) => x.nutrientId === ids[i] || x.nutrientNumber === numbers[i],
    );
    if (n && typeof n.value === 'number' && Number.isFinite(n.value) && n.value >= 0) {
      // Some records give energy in kJ only.
      return key === 'kcal' && n.unitName?.toLowerCase() === 'kj' ? n.value / 4.184 : n.value;
    }
  }
  return null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** "CHEESE, CHEDDAR" → "Cheese, cheddar"; mixed-case names are kept. */
export function tidyName(description: string): string {
  const trimmed = description.trim().replace(/\s+/g, ' ');
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function servingsOf(food: FdcSearchFood): FoodServing[] {
  const servings: FoodServing[] = [];
  const unit = food.servingSizeUnit?.toLowerCase();
  if (
    food.servingSize &&
    food.servingSize > 0 &&
    (unit === 'g' || unit === 'grm' || unit === 'ml' || unit === 'mlt')
  ) {
    const household = food.householdServingFullText?.trim();
    const amount = `${round1(food.servingSize)} ${unit.startsWith('m') ? 'ml' : 'g'}`;
    servings.push({
      label: household ? `${household} (${amount})` : `1 serving (${amount})`,
      grams: food.servingSize,
    });
  }
  for (const m of food.foodMeasures ?? []) {
    const text = m.disseminationText?.trim();
    if (!text || !m.gramWeight || m.gramWeight <= 0) continue;
    if (/quantity not specified/i.test(text)) continue;
    const label = `${text} (${round1(m.gramWeight)} g)`;
    if (!servings.some((s) => s.label === label)) servings.push({ label, grams: m.gramWeight });
  }
  return servings.slice(0, 6);
}

/**
 * Keeps foods with a plausible energy value (0–900 kcal per 100 g; pure fat is ~900) and
 * normalises them. Missing macros count as 0.
 */
export function normalizeFoods(foods: FdcSearchFood[]): FoodResult[] {
  const results: FoodResult[] = [];
  for (const food of foods) {
    const kcal = nutrient(food, 'kcal');
    if (kcal === null || kcal > 900 || !food.description) continue;
    results.push({
      ref: `usda:${food.fdcId}`,
      name: tidyName(food.description),
      brand: food.brandName?.trim() || food.brandOwner?.trim() || null,
      per100g: {
        kcal: Math.round(kcal),
        proteinG: round1(nutrient(food, 'proteinG') ?? 0),
        carbsG: round1(nutrient(food, 'carbsG') ?? 0),
        fatG: round1(nutrient(food, 'fatG') ?? 0),
        fiberG: round1(nutrient(food, 'fiberG') ?? 0),
      },
      servings: servingsOf(food),
    });
  }
  return results;
}

/** Validates the search text: 2–100 characters after trimming. */
export function parseQuery(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const q = raw.trim().replace(/\s+/g, ' ');
  return q.length >= 2 && q.length <= 100 ? q : null;
}
