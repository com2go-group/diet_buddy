import { router } from 'expo-router';

/**
 * What Premium includes, in the paywall's order. A gate opens the paywall with the feature the
 * user was trying to use, and the paywall puts that one first (see `orderedFeatures`).
 */
export const PAYWALL_FEATURES = [
  'noAds',
  'coach',
  'mealPlans',
  'photos',
  'insights',
  'wellness',
  'grocery',
  'restaurant',
  'foodPhotos',
  'bodyScan',
  'twin',
  'story',
  'support',
] as const;

export type PaywallFeature = (typeof PAYWALL_FEATURES)[number];

export const isPaywallFeature = (value: unknown): value is PaywallFeature =>
  typeof value === 'string' && (PAYWALL_FEATURES as readonly string[]).includes(value);

/** The feature the user came for first, then the rest in the usual order. */
export function orderedFeatures(featured?: PaywallFeature | null): PaywallFeature[] {
  if (!featured) return [...PAYWALL_FEATURES];
  return [featured, ...PAYWALL_FEATURES.filter((f) => f !== featured)];
}

/**
 * Opens the paywall. `onboarding` uses the onboarding copy of the route (the main app's routes are
 * guarded until onboarding ends); `welcome` is the one-time trial offer after the plan reveal.
 */
export function openPaywall(
  feature?: PaywallFeature,
  { onboarding = false, welcome = false }: { onboarding?: boolean; welcome?: boolean } = {},
) {
  const params: Record<string, string> = {};
  if (feature) params.feature = feature;
  if (welcome) params.welcome = '1';
  router.push({ pathname: onboarding ? '/onboarding-premium' : '/paywall', params });
}
