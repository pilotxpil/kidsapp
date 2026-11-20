import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { PREMIUM_PRODUCT_IDS } from '@kidsapp/shared';

/**
 * RevenueCat wrapper (Google Play Billing now, App Store later).
 * The RevenueCat app user id is the FAMILY id: one subscription unlocks premium for every
 * parent and kid in the family. The server re-verifies with RevenueCat (POST /billing/sync).
 *
 * Keys (public SDK keys, safe in the bundle) come from EAS env:
 *   EXPO_PUBLIC_RC_ANDROID_KEY=goog_…   EXPO_PUBLIC_RC_IOS_KEY=appl_…
 */
export interface PlanOption {
  id: 'monthly' | 'yearly';
  title: string;
  price: string;
  /** Per-month price string for the yearly plan, when the store gives one. */
  perMonth?: string;
  pkg: unknown;
}

type PurchasesModule = typeof import('react-native-purchases').default;

let mod: PurchasesModule | null = null;
let configuredFor: string | null = null;

function apiKey(): string | undefined {
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_RC_IOS_KEY;
  return undefined;
}

/** False in Expo Go, on web, and until the RevenueCat key is configured. */
export function purchasesAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  if (Constants.executionEnvironment === 'storeClient') return false;
  return Boolean(apiKey());
}

async function load(): Promise<PurchasesModule | null> {
  if (!purchasesAvailable()) return null;
  if (mod) return mod;
  try {
    mod = (await import('react-native-purchases')).default;
    return mod;
  } catch {
    return null;
  }
}

export async function initPurchases(familyId: string): Promise<boolean> {
  const P = await load();
  if (!P) return false;
  try {
    if (!configuredFor) {
      P.configure({ apiKey: apiKey()!, appUserID: familyId });
      configuredFor = familyId;
    } else if (configuredFor !== familyId) {
      await P.logIn(familyId);
      configuredFor = familyId;
    }
    return true;
  } catch {
    return false;
  }
}

export async function getPlanOptions(): Promise<PlanOption[]> {
  const P = await load();
  if (!P) return [];
  const offerings = await P.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  const out: PlanOption[] = [];
  for (const pkg of current.availablePackages) {
    const productId = pkg.product.identifier.split(':')[0];
    if (pkg.packageType === 'MONTHLY' || productId === PREMIUM_PRODUCT_IDS.monthly) {
      out.push({ id: 'monthly', title: 'חודשי', price: pkg.product.priceString, pkg });
    } else if (pkg.packageType === 'ANNUAL' || productId === PREMIUM_PRODUCT_IDS.yearly) {
      out.push({
        id: 'yearly',
        title: 'שנתי',
        price: pkg.product.priceString,
        perMonth: pkg.product.pricePerMonthString ?? undefined,
        pkg,
      });
    }
  }
  return out.sort((a) => (a.id === 'yearly' ? -1 : 1));
}

export type PurchaseOutcome = 'purchased' | 'cancelled';

export async function buyPlan(option: PlanOption): Promise<PurchaseOutcome> {
  const P = await load();
  if (!P) throw new Error('הרכישה לא זמינה במכשיר הזה');
  try {
    await P.purchasePackage(option.pkg as Parameters<PurchasesModule['purchasePackage']>[0]);
    return 'purchased';
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return 'cancelled';
    throw new Error('הרכישה לא הושלמה. לא חויבתם. נסו שוב.');
  }
}

export async function restorePurchases(): Promise<void> {
  const P = await load();
  if (!P) throw new Error('שחזור רכישות לא זמין במכשיר הזה');
  await P.restorePurchases();
}
