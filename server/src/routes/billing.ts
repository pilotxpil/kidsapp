/**
 * Premium subscriptions via RevenueCat (Google Play Billing now, App Store later).
 *
 * The RevenueCat app user id is the family id, so one subscription covers the whole family
 * (both parents, all kids). The app calls POST /billing/sync after a purchase/restore; RevenueCat
 * also calls POST /billing/webhook on every lifecycle event. Both paths re-read the subscriber
 * from RevenueCat's REST API, so the server never trusts a client-supplied entitlement.
 *
 * Env:
 *   REVENUECAT_SECRET_KEY    – RevenueCat secret API key (v1, "sk_…")
 *   REVENUECAT_WEBHOOK_AUTH  – the Authorization header value configured on the RevenueCat webhook
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { PREMIUM_ENTITLEMENT_ID } from '@kidsapp/shared';
import { authenticate, requireParent } from '../middleware/auth';
import { Family } from '../models/Family';
import { getFamilyEntitlements } from '../services/entitlements';

const router = Router();

interface RcEntitlement {
  expires_date: string | null;
  product_identifier?: string;
}
interface RcSubscription {
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
  expires_date?: string | null;
}
interface RcSubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, RcEntitlement>;
    subscriptions?: Record<string, RcSubscription>;
  };
}

export function billingConfigured(): boolean {
  return Boolean(process.env.REVENUECAT_SECRET_KEY);
}

async function fetchSubscriber(appUserId: string): Promise<RcSubscriberResponse | null> {
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } }
  );
  if (!res.ok) throw new Error(`RevenueCat ${res.status}`);
  return (await res.json()) as RcSubscriberResponse;
}

/** Re-reads RevenueCat and writes the result onto the family. Founders are never downgraded. */
export async function syncFamilyFromRevenueCat(familyId: string) {
  const family = await Family.findById(familyId);
  if (!family) return null;
  if (family.plan === 'founder') return family;

  const data = await fetchSubscriber(familyId);
  if (!data) return family;
  const ent = data.subscriber?.entitlements?.[PREMIUM_ENTITLEMENT_ID];
  const now = Date.now();
  const expires = ent?.expires_date ? new Date(ent.expires_date) : null;
  const active = Boolean(ent) && (expires === null || expires.getTime() > now);

  if (active) {
    const sub = ent?.product_identifier
      ? data.subscriber?.subscriptions?.[ent.product_identifier]
      : undefined;
    family.plan = 'premium';
    family.premiumUntil = expires ?? undefined;
    family.premiumWillRenew = sub ? !sub.unsubscribe_detected_at : true;
    family.billingProductId = ent?.product_identifier;
  } else if (family.plan === 'premium' && family.billingSource !== 'manual') {
    family.plan = 'free';
    family.premiumWillRenew = undefined;
  }
  family.billingSource = family.billingSource === 'manual' ? 'manual' : 'revenuecat';
  family.billingUpdatedAt = new Date();
  await family.save();
  return family;
}

router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    const entitlements = await getFamilyEntitlements(req.user!.familyId);
    if (!entitlements) return res.status(404).json({ error: 'משפחה לא נמצאה' });
    res.json({ entitlements, billingEnabled: billingConfigured() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת המנוי' });
  }
});

router.post('/sync', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    if (billingConfigured()) await syncFamilyFromRevenueCat(req.user!.familyId);
    const entitlements = await getFamilyEntitlements(req.user!.familyId);
    res.json({ entitlements, billingEnabled: billingConfigured() });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'לא הצלחנו לאמת את הרכישה. נסו שוב בעוד רגע.' });
  }
});

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

router.post('/webhook', async (req: Request, res: Response) => {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  const got = req.headers.authorization ?? '';
  if (!expected || !safeEqual(got, expected)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const event = req.body?.event ?? {};
    const ids = new Set<string>(
      [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])]
        .filter((id: unknown): id is string => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id))
    );
    for (const id of ids) await syncFamilyFromRevenueCat(id);
    res.json({ ok: true });
  } catch (err) {
    console.error('billing webhook', err);
    // Non-2xx makes RevenueCat retry later.
    res.status(500).json({ error: 'sync failed' });
  }
});

export default router;
