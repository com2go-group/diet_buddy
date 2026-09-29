import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

import { toPlans, type PlanOption } from './plans';

export type { PlanKind, PlanOption } from './plans';

/** The single RevenueCat entitlement (CLAUDE.md §12). */
export const PREMIUM_ENTITLEMENT = 'premium';

/**
 * Public SDK keys (safe to ship). Set per platform; see docs/setup/revenuecat.md. RevenueCat Test
 * Store keys (`test_…`) only work in development builds; release builds (TestFlight, the stores)
 * ignore them, so a test key can never reach real customers.
 */
export function usableKey(key: string | undefined, dev = __DEV__): string | undefined {
  if (!key) return undefined;
  return key.startsWith('test_') && !dev ? undefined : key;
}

function apiKey(): string | undefined {
  return usableKey(
    Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
      default: undefined,
    }),
  );
}

export const purchasesAvailable = (): boolean => Boolean(apiKey());

let configuredFor: string | null = null;
let packages: PurchasesPackage[] = [];

/** Configures the SDK for this signed-in user (app user ID = Supabase user ID, used by the webhook). */
export async function configurePurchases(userId: string): Promise<void> {
  const key = apiKey();
  if (!key || configuredFor === userId) return;
  if (configuredFor === null) {
    if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: key, appUserID: userId });
  } else {
    await Purchases.logIn(userId);
  }
  configuredFor = userId;
}

export async function resetPurchases(): Promise<void> {
  if (!configuredFor) return;
  configuredFor = null;
  await Purchases.logOut().catch(() => undefined);
}

export const hasPremium = (info: CustomerInfo): boolean =>
  Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT]);

export async function getPlans(): Promise<PlanOption[]> {
  const offerings = await Purchases.getOfferings();
  packages = offerings.current?.availablePackages ?? [];
  return toPlans(packages);
}

export class PurchaseCancelled extends Error {}

/** Buys a plan. Resolves with whether premium is now active; throws PurchaseCancelled on cancel. */
export async function purchase(planId: string): Promise<boolean> {
  const pkg = packages.find((p) => p.identifier === planId);
  if (!pkg) throw new Error(`unknown plan ${planId}`);
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return hasPremium(customerInfo);
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) throw new PurchaseCancelled();
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  return hasPremium(await Purchases.restorePurchases());
}

export async function premiumFromStore(): Promise<boolean> {
  return hasPremium(await Purchases.getCustomerInfo());
}

/** When a free trial of Premium ends (it renews then unless cancelled), or null if not in one. */
export function trialEnd(info: Pick<CustomerInfo, 'entitlements'>): Date | null {
  const premium = info.entitlements.active[PREMIUM_ENTITLEMENT];
  if (!premium || premium.periodType !== 'TRIAL' || !premium.expirationDate) return null;
  if (!premium.willRenew) return null;
  const end = new Date(premium.expirationDate);
  return Number.isNaN(end.getTime()) ? null : end;
}

export async function trialEndFromStore(): Promise<Date | null> {
  return trialEnd(await Purchases.getCustomerInfo());
}

export function onCustomerInfo(
  listener: (premium: boolean, trialEndsAt: Date | null) => void,
): () => void {
  const handler = (info: CustomerInfo) => listener(hasPremium(info), trialEnd(info));
  Purchases.addCustomerInfoUpdateListener(handler);
  return () => Purchases.removeCustomerInfoUpdateListener(handler);
}
