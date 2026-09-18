import { Router, Request, Response } from 'express';

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

export default router;
