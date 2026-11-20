import { Router, Request, Response } from 'express';
import type { AppRuntimeConfig } from '@kidsapp/shared';
import { isMailerConfigured } from '../services/mailer';
import { billingConfigured } from './billing';

const router = Router();

/**
 * Latest store-facing versions. Override via env after each Play/App Store release:
 *   STORE_VERSION_ANDROID=1.2.0
 *   STORE_VERSION_IOS=1.2.0
 */
router.get('/version', (_req: Request, res: Response) => {
  res.json({
    android: process.env.STORE_VERSION_ANDROID || '1.1.2',
    ios: process.env.STORE_VERSION_IOS || '1.1.2',
    packageId: 'com.kidsapp.quest',
  });
});

/** Remote switches so production behaviour can change without a store release. */
router.get('/config', (_req: Request, res: Response) => {
  const config: AppRuntimeConfig = {
    adsEnabled: process.env.ADS_ENABLED !== 'false',
    billingEnabled: billingConfigured(),
    passwordResetEnabled: isMailerConfigured() || process.env.NODE_ENV !== 'production',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@kids.synaboard.com',
    minSupportedVersion: process.env.MIN_SUPPORTED_VERSION || '1.0.0',
  };
  res.set('Cache-Control', 'public, max-age=300');
  res.json(config);
});

export default router;
