import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { PREMIUM_PRODUCT_IDS } from '@kidsapp/shared';
import { api } from './api';

/**
 * Google Play Billing through expo-iap (App Store later).
 * One subscription per FAMILY: the family id goes to Google as the obfuscated account id, and the
 * server verifies every purchase token with Google (POST /billing/play/verify) before unlocking
 * premium. The app never decides on its own that a family is premium.
 */
export interface PlanOption {
  id: 'monthly' | 'yearly';
  title: string;
  price: string;
  /** Per-month price string for the yearly plan. */
  perMonth?: string;
  pkg: { productId: string; offerToken: string };
}

export type PurchaseOutcome = 'purchased' | 'cancelled';

type Iap = typeof import('expo-iap');
type Purchase = import('expo-iap').Purchase;

const PRODUCTS: Record<PlanOption['id'], { productId: string; basePlan: string; title: string }> = {
  monthly: { productId: PREMIUM_PRODUCT_IDS.monthly, basePlan: 'monthly', title: 'חודשי' },
  yearly: { productId: PREMIUM_PRODUCT_IDS.yearly, basePlan: 'yearly', title: 'שנתי' },
};
const OUR_IDS = new Set<string>(Object.values(PREMIUM_PRODUCT_IDS));

let mod: Iap | null = null;
let connected = false;
let familyId: string | null = null;
let listening = false;
let waiter: { resolve: (o: PurchaseOutcome) => void; reject: (e: Error) => void } | null = null;

/** Android store builds only (not web, not Expo Go). iOS comes later. */
export function purchasesAvailable(): boolean {
  if (Platform.OS !== 'android') return false;
  return Constants.executionEnvironment !== 'storeClient';
}

async function load(): Promise<Iap | null> {
  if (!purchasesAvailable()) return null;
  if (mod) return mod;
  try {
    mod = await import('expo-iap');
    return mod;
  } catch {
    return null;
  }
}

async function verifyAndFinish(iap: Iap, purchase: Purchase): Promise<boolean> {
  const token = purchase.purchaseToken;
  if (!token || !OUR_IDS.has(purchase.productId)) return false;
  if (purchase.purchaseState === 'pending') return false;
  await api.verifyPlayPurchase(token);
  try {
    await iap.finishTransaction({ purchase, isConsumable: false });
  } catch {
    /* the server already acknowledged it */
  }
  return true;
}

function listen(iap: Iap) {
  if (listening) return;
  listening = true;
  iap.purchaseUpdatedListener((purchase) => {
    void verifyAndFinish(iap, purchase)
      .then((ok) => {
        waiter?.resolve(ok ? 'purchased' : 'cancelled');
        waiter = null;
      })
      .catch((e: unknown) => {
        waiter?.reject(new Error(e instanceof Error ? e.message : 'לא הצלחנו לאמת את הרכישה. נסו שוב.'));
        waiter = null;
      });
  });
  iap.purchaseErrorListener((error) => {
    if (!waiter) return;
    if (iap.isUserCancelledError(error)) waiter.resolve('cancelled');
    else waiter.reject(new Error('הרכישה לא הושלמה. לא חויבתם. נסו שוב.'));
    waiter = null;
  });
}

async function connect(): Promise<Iap | null> {
  const iap = await load();
  if (!iap) return null;
  if (!connected) {
    await iap.initConnection();
    connected = true;
    listen(iap);
  }
  return iap;
}

/** Called once a parent is signed in: connects and settles purchases that were never verified. */
export async function initPurchases(fid: string): Promise<boolean> {
  familyId = fid;
  try {
    const iap = await connect();
    if (!iap) return false;
    const owned = await iap.getAvailablePurchases();
    for (const p of owned) {
      const unfinished = !(p as { isAcknowledgedAndroid?: boolean | null }).isAcknowledgedAndroid;
      if (unfinished) await verifyAndFinish(iap, p).catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

function perMonthLabel(priceMicros: number | undefined, currency: string | undefined): string | undefined {
  if (!priceMicros || !currency) return undefined;
  try {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency, maximumFractionDigits: 2 }).format(priceMicros / 12);
  } catch {
    return undefined;
  }
}

export async function getPlanOptions(): Promise<PlanOption[]> {
  const iap = await connect();
  if (!iap) return [];
  const products = await iap.fetchProducts({ skus: Object.values(PREMIUM_PRODUCT_IDS), type: 'subs' });
  const out: PlanOption[] = [];
  for (const id of ['yearly', 'monthly'] as const) {
    const def = PRODUCTS[id];
    const product = (products ?? []).find((p) => p.id === def.productId) as
      | (import('expo-iap').ProductSubscriptionAndroid & { price?: number | null })
      | undefined;
    if (!product) continue;
    const offers = product.subscriptionOffers ?? [];
    const offer = offers.find((o) => o.basePlanIdAndroid === def.basePlan && o.offerTokenAndroid) ?? offers.find((o) => o.offerTokenAndroid);
    if (!offer?.offerTokenAndroid) continue;
    const amount = (offer as { price?: number | null }).price ?? product.price ?? undefined;
    out.push({
      id,
      title: def.title,
      price: offer.displayPrice || product.displayPrice,
      ...(id === 'yearly' ? { perMonth: perMonthLabel(amount ?? undefined, offer.currency ?? product.currency) } : {}),
      pkg: { productId: def.productId, offerToken: offer.offerTokenAndroid },
    });
  }
  return out;
}

export async function buyPlan(option: PlanOption): Promise<PurchaseOutcome> {
  const iap = await connect();
  if (!iap) throw new Error('הרכישה לא זמינה במכשיר הזה');
  if (waiter) throw new Error('רכישה כבר בתהליך');
  const result = new Promise<PurchaseOutcome>((resolve, reject) => {
    waiter = { resolve, reject };
  });
  try {
    await iap.requestPurchase({
      type: 'subs',
      request: {
        google: {
          skus: [option.pkg.productId],
          subscriptionOffers: [{ sku: option.pkg.productId, offerToken: option.pkg.offerToken }],
          ...(familyId ? { obfuscatedAccountId: familyId } : {}),
        },
      },
    });
  } catch (e) {
    waiter = null;
    if (mod?.isUserCancelledError(e as never)) return 'cancelled';
    throw new Error('הרכישה לא הושלמה. לא חויבתם. נסו שוב.');
  }
  return result;
}

/** Re-sends every KidsQuest subscription Google knows for this Play account to the server. */
export async function restorePurchases(): Promise<void> {
  const iap = await connect();
  if (!iap) throw new Error('שחזור רכישות לא זמין במכשיר הזה');
  const owned = await iap.getAvailablePurchases();
  let lastError: Error | null = null;
  for (const p of owned) {
    if (!OUR_IDS.has(p.productId)) continue;
    try {
      await verifyAndFinish(iap, p);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('השחזור נכשל');
    }
  }
  if (lastError) throw lastError;
}
