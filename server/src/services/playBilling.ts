/**
 * Premium subscriptions through Google Play Billing, verified server-side.
 *
 * The app buys with expo-iap and passes the family id as the obfuscated account id, then sends
 * the purchase token to POST /billing/play/verify. The server reads the subscription from the
 * Google Play Developer API (purchases.subscriptionsv2), acknowledges it, and writes the result
 * onto the family. One subscription covers the whole family. Renewals and cancellations are
 * picked up by re-reading the stored token (on /billing/sync, /billing/status after expiry, and a
 * periodic sweep), so the server never trusts a client-supplied entitlement.
 *
 * Env: GOOGLE_PLAY_SA_B64 — base64 of the Play service account JSON (needs "View financial data").
 */
import crypto from 'crypto';
import { PREMIUM_PRODUCT_IDS } from '@kidsapp/shared';
import { Family, IFamily } from '../models/Family';

const PACKAGE = process.env.ANDROID_PACKAGE || 'com.kidsapp.quest';
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;
const PRODUCT_IDS = new Set<string>(Object.values(PREMIUM_PRODUCT_IDS));

type ServiceAccount = { client_email: string; private_key: string; token_uri?: string };

let sa: ServiceAccount | null | undefined;
let cached: { token: string; exp: number } | null = null;

function serviceAccount(): ServiceAccount | null {
  if (sa !== undefined) return sa;
  const b64 = process.env.GOOGLE_PLAY_SA_B64;
  try {
    sa = b64 ? (JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as ServiceAccount) : null;
  } catch {
    console.error('playBilling: GOOGLE_PLAY_SA_B64 is not valid base64 JSON');
    sa = null;
  }
  return sa;
}

export function playBillingConfigured(): boolean {
  return Boolean(serviceAccount());
}

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const acct = serviceAccount();
  if (!acct) throw new Error('Play billing is not configured');
  const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: acct.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: acct.token_uri || 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const signature = crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(acct.private_key);
  const res = await fetch(acct.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${b64url(signature)}`,
    }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, exp: now + json.expires_in };
  return json.access_token;
}

/** Subset of the subscriptionsv2 resource that we use. */
interface SubscriptionPurchaseV2 {
  subscriptionState?: string;
  acknowledgementState?: string;
  linkedPurchaseToken?: string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  testPurchase?: object;
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
  }>;
}

export class PlayBillingError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

async function readSubscription(purchaseToken: string): Promise<SubscriptionPurchaseV2> {
  const token = await accessToken();
  const res = await fetch(`${API}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 400 || res.status === 404 || res.status === 410) {
    throw new PlayBillingError('הרכישה לא נמצאה ב-Google Play');
  }
  if (!res.ok) throw new PlayBillingError(`Google Play ${res.status}`, 502);
  return (await res.json()) as SubscriptionPurchaseV2;
}

async function acknowledge(productId: string, purchaseToken: string): Promise<void> {
  const token = await accessToken();
  const res = await fetch(
    `${API}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' }
  );
  // 400 here usually means "already acknowledged" (the app may have finished it first).
  if (!res.ok && res.status !== 400) console.warn(`playBilling: acknowledge ${res.status}`);
}

/** States in which the subscriber keeps premium until expiryTime. */
const ENTITLED = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  'SUBSCRIPTION_STATE_CANCELED',
]);

function applyToFamily(family: IFamily, sub: SubscriptionPurchaseV2, purchaseToken: string): void {
  const item = (sub.lineItems ?? []).find((li) => li.productId && PRODUCT_IDS.has(li.productId));
  const expiry = item?.expiryTime ? new Date(item.expiryTime) : null;
  const entitled =
    Boolean(item) && ENTITLED.has(sub.subscriptionState ?? '') && Boolean(expiry) && expiry!.getTime() > Date.now();

  family.playPurchaseToken = purchaseToken;
  family.billingProductId = item?.productId;
  family.billingUpdatedAt = new Date();
  if (family.plan === 'founder' || family.billingSource === 'manual') return;

  family.billingSource = 'play';
  if (entitled) {
    family.plan = 'premium';
    family.premiumUntil = expiry!;
    family.premiumWillRenew =
      sub.subscriptionState !== 'SUBSCRIPTION_STATE_CANCELED' && item?.autoRenewingPlan?.autoRenewEnabled !== false;
  } else if (family.plan === 'premium') {
    family.plan = 'free';
    family.premiumWillRenew = undefined;
  }
}

/**
 * Verifies a purchase token for a family and stores the result.
 * Rejects tokens bought for another family (obfuscated account id) or already bound to one.
 */
export async function verifyPlayPurchase(familyId: string, purchaseToken: string): Promise<IFamily> {
  if (!playBillingConfigured()) throw new PlayBillingError('הרכישות עוד לא פעילות', 503);
  if (typeof purchaseToken !== 'string' || purchaseToken.length < 10 || purchaseToken.length > 1000) {
    throw new PlayBillingError('רכישה לא תקינה');
  }
  const family = await Family.findById(familyId).select('+playPurchaseToken');
  if (!family) throw new PlayBillingError('משפחה לא נמצאה', 404);

  const sub = await readSubscription(purchaseToken);
  const owner = sub.externalAccountIdentifiers?.obfuscatedExternalAccountId;
  if (owner && owner !== familyId) throw new PlayBillingError('המנוי הזה שייך למשפחה אחרת', 409);
  const boundElsewhere = await Family.exists({ _id: { $ne: family._id }, playPurchaseToken: purchaseToken });
  if (boundElsewhere) throw new PlayBillingError('המנוי הזה שייך למשפחה אחרת', 409);

  const item = (sub.lineItems ?? []).find((li) => li.productId && PRODUCT_IDS.has(li.productId));
  if (!item) throw new PlayBillingError('זה לא מנוי של KidsQuest');
  if (sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING' && sub.subscriptionState !== 'SUBSCRIPTION_STATE_PENDING') {
    await acknowledge(item.productId!, purchaseToken);
  }
  applyToFamily(family, sub, purchaseToken);
  await family.save();
  return family;
}

/** Re-reads the family's stored Play subscription (renewals, cancellations, refunds). */
export async function refreshPlayFamily(familyId: string): Promise<void> {
  if (!playBillingConfigured()) return;
  const family = await Family.findById(familyId).select('+playPurchaseToken');
  if (!family?.playPurchaseToken) return;
  try {
    const sub = await readSubscription(family.playPurchaseToken);
    applyToFamily(family, sub, family.playPurchaseToken);
  } catch (err) {
    if (!(err instanceof PlayBillingError) || err.status !== 400) throw err;
    // Token no longer known to Google (refunded/revoked long ago): drop premium if it came from Play.
    if (family.billingSource === 'play' && family.plan === 'premium') family.plan = 'free';
  }
  await family.save();
}

/** Every 6 hours: re-check Play families whose paid period ends within a day (or already ended). */
export function startPlayBillingSweep(intervalMs = 6 * 60 * 60 * 1000): void {
  if (!playBillingConfigured()) return;
  const sweep = async () => {
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const due = await Family.find({
      billingSource: 'play',
      playPurchaseToken: { $exists: true },
      $or: [{ plan: 'premium', premiumUntil: { $lt: soon } }, { premiumWillRenew: false, plan: 'premium' }],
    }).select('_id');
    for (const f of due) {
      try {
        await refreshPlayFamily(f._id.toString());
      } catch (err) {
        console.error('playBilling sweep', f._id.toString(), err);
      }
    }
  };
  setTimeout(() => void sweep().catch((e) => console.error('playBilling sweep', e)), 60_000).unref?.();
  setInterval(() => void sweep().catch((e) => console.error('playBilling sweep', e)), intervalMs).unref?.();
}
