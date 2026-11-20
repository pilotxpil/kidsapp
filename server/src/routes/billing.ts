/**
 * Premium subscriptions: Google Play Billing, verified server-side (services/playBilling.ts).
 * One subscription covers the whole family (both parents, all kids).
 *
 *   GET  /billing/status       entitlements + whether purchases are enabled
 *   POST /billing/play/verify  { purchaseToken } after a purchase or restore (parent only)
 *   POST /billing/sync         re-read the family's stored subscription from Google
 */
import { Router, Request, Response } from 'express';
import { authenticate, requireParent } from '../middleware/auth';
import { Family } from '../models/Family';
import { getFamilyEntitlements } from '../services/entitlements';
import { PlayBillingError, playBillingConfigured, refreshPlayFamily, verifyPlayPurchase } from '../services/playBilling';

const router = Router();

export function billingConfigured(): boolean {
  return playBillingConfigured();
}

async function respond(res: Response, familyId: string) {
  const entitlements = await getFamilyEntitlements(familyId);
  if (!entitlements) return res.status(404).json({ error: 'משפחה לא נמצאה' });
  res.json({ entitlements, billingEnabled: billingConfigured() });
}

router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    // A paid period that just ended may have renewed: re-check before reporting "free".
    const family = await Family.findById(req.user!.familyId).select('plan premiumUntil billingSource');
    if (family?.billingSource === 'play' && family.plan === 'premium' && family.premiumUntil && family.premiumUntil.getTime() < Date.now()) {
      await refreshPlayFamily(req.user!.familyId).catch((e) => console.error('billing status refresh', e));
    }
    await respond(res, req.user!.familyId);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת המנוי' });
  }
});

router.post('/play/verify', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    await verifyPlayPurchase(req.user!.familyId, req.body?.purchaseToken);
    await respond(res, req.user!.familyId);
  } catch (err) {
    if (err instanceof PlayBillingError) return res.status(err.status).json({ error: err.message });
    console.error('billing verify', err);
    res.status(502).json({ error: 'לא הצלחנו לאמת את הרכישה. נסו שוב בעוד רגע.' });
  }
});

router.post('/sync', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    await refreshPlayFamily(req.user!.familyId);
    await respond(res, req.user!.familyId);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'לא הצלחנו לאמת את הרכישה. נסו שוב בעוד רגע.' });
  }
});

export default router;
