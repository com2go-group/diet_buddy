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

/** Public SDK keys (safe to ship). Set per platform; see docs/setup/revenuecat.md. */
function apiKey(): string | undefined {
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    default: undefined,
  });
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

export function onCustomerInfo(listener: (premium: boolean) => void): () => void {
  const handler = (info: CustomerInfo) => listener(hasPremium(info));
  Purchases.addCustomerInfoUpdateListener(handler);
  return () => Purchases.removeCustomerInfoUpdateListener(handler);
}
