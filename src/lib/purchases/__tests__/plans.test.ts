import { toPlans, trialDays, type StorePackage } from '../plans';

const pkg = (
  packageType: string,
  price: number,
  extra: Partial<StorePackage['product']> = {},
): StorePackage => ({
  identifier: `$rc_${packageType.toLowerCase()}`,
  packageType,
  product: {
    price,
    priceString: `$${price.toFixed(2)}`,
    pricePerMonthString:
      packageType === 'ANNUAL' ? `$${(price / 12).toFixed(2)}` : `$${price.toFixed(2)}`,
    introPrice: null,
    ...extra,
  },
});

describe('store plans', () => {
  it('orders monthly, annual, lifetime with store prices and the annual saving', () => {
    const plans = toPlans([
      pkg('LIFETIME', 149),
      pkg('ANNUAL', 71.88),
      pkg('MONTHLY', 9.99, { introPrice: { price: 0, periodUnit: 'DAY', periodNumberOfUnits: 7 } }),
      pkg('CUSTOM', 1),
    ]);
    expect(plans).toEqual([
      {
        id: '$rc_monthly',
        kind: 'monthly',
        price: '$9.99',
        perMonth: '$9.99',
        trialDays: 7,
        savingPct: null,
      },
      {
        id: '$rc_annual',
        kind: 'annual',
        price: '$71.88',
        perMonth: '$5.99',
        trialDays: null,
        savingPct: 40,
      },
      {
        id: '$rc_lifetime',
        kind: 'lifetime',
        price: '$149.00',
        perMonth: null,
        trialDays: null,
        savingPct: null,
      },
    ]);
  });

  it('reads trials from Google Play free phases and App Store intro offers', () => {
    expect(
      trialDays({
        ...pkg('MONTHLY', 9.99).product,
        defaultOption: { freePhase: { billingPeriod: { unit: 'WEEK', value: 1 } } },
      }),
    ).toBe(7);
    expect(
      trialDays({
        ...pkg('MONTHLY', 9.99).product,
        introPrice: { price: 1.99, periodUnit: 'MONTH', periodNumberOfUnits: 1 },
      }),
    ).toBeNull();
    expect(trialDays(pkg('MONTHLY', 9.99).product)).toBeNull();
  });
});
