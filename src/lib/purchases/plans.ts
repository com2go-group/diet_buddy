/**
 * Store products → the plans the paywall shows. Prices always come from the store (App Store /
 * Play Billing via RevenueCat), never from the app (CLAUDE.md §12).
 */

export type PlanKind = 'monthly' | 'annual' | 'lifetime';

export interface PlanOption {
  id: string;
  kind: PlanKind;
  /** Store-formatted price, e.g. "$71.88" or "71,88 €". */
  price: string;
  /** Store-formatted monthly equivalent for subscriptions. */
  perMonth: string | null;
  /** Free trial length in days, if the product offers one to this user. */
  trialDays: number | null;
  /** Annual saving vs 12 × monthly, in percent. */
  savingPct: number | null;
}

/** The subset of a RevenueCat package this module reads (keeps it testable without the SDK). */
export interface StorePackage {
  identifier: string;
  packageType: string;
  product: {
    price: number;
    priceString: string;
    pricePerMonthString: string | null;
    introPrice: { price: number; periodUnit: string; periodNumberOfUnits: number } | null;
    defaultOption?: { freePhase: { billingPeriod: { unit: string; value: number } } | null } | null;
  };
}

const KIND: Record<string, PlanKind> = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
  LIFETIME: 'lifetime',
};
const UNIT_DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

export function trialDays(product: StorePackage['product']): number | null {
  const free = product.defaultOption?.freePhase?.billingPeriod; // Google Play
  if (free) return free.value * (UNIT_DAYS[free.unit] ?? 0) || null;
  const intro = product.introPrice; // App Store
  if (intro && intro.price === 0)
    return intro.periodNumberOfUnits * (UNIT_DAYS[intro.periodUnit] ?? 0) || null;
  return null;
}

export function toPlans(packages: StorePackage[]): PlanOption[] {
  const monthly = packages.find((p) => p.packageType === 'MONTHLY');
  const order: PlanKind[] = ['monthly', 'annual', 'lifetime'];
  return packages
    .filter((p) => KIND[p.packageType])
    .map((p) => {
      const kind = KIND[p.packageType]!;
      const saving =
        kind === 'annual' && monthly && monthly.product.price > 0
          ? Math.round((1 - p.product.price / (monthly.product.price * 12)) * 100)
          : null;
      return {
        id: p.identifier,
        kind,
        price: p.product.priceString,
        perMonth: kind === 'lifetime' ? null : p.product.pricePerMonthString,
        trialDays: kind === 'lifetime' ? null : trialDays(p.product),
        savingPct: saving !== null && saving > 0 ? saving : null,
      };
    })
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}
