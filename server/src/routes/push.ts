import { Router, Request, Response } from 'express';
import { Expo } from 'expo-server-sdk';
import type { PushPlatform } from '@kidsapp/shared';
import { authenticate } from '../middleware/auth';
import { PushToken } from '../models/PushToken';

const router = Router();

const PLATFORMS = new Set<PushPlatform>(['ios', 'android', 'web', 'unknown']);

router.post('/register', authenticate, async (req: Request, res: Response) => {
  try {
    const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
    if (!token || !Expo.isExpoPushToken(token)) {
      return res.status(400).json({ error: 'טוקן פוש לא תקין' });
    }

    const rawPlatform = req.body.platform;
    const platform: PushPlatform = PLATFORMS.has(rawPlatform) ? rawPlatform : 'unknown';

    await PushToken.findOneAndUpdate(
      { token },
      {
        token,
        userId: req.user!.userId,
        familyId: req.user!.familyId,
        platform,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה ברישום התראות' });
  }
});

router.post('/unregister', authenticate, async (req: Request, res: Response) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (token) {
      await PushToken.deleteOne({ token, userId: req.user!.userId });
    } else {
      await PushToken.deleteMany({ userId: req.user!.userId });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בביטול התראות' });
  }
});

export default router;
