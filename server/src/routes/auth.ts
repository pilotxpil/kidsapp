import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UI_THEME_IDS } from '@kidsapp/shared';
import { Family } from '../models/Family';
import { User } from '../models/User';
import { formatUser } from '../utils/format';
import { processDailyLogin } from '../services/gamification';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/parent/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, familyName } = req.body;

    if (!email || !password || !displayName || !familyName) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'אימייל כבר קיים במערכת' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const parent = await User.create({
      role: 'parent',
      displayName,
      email,
      passwordHash,
      familyId: new (await import('mongoose')).Types.ObjectId(),
      avatar: '👨‍👩‍👧‍👦',
    });

    const family = await Family.create({
      name: familyName,
      parentId: parent._id,
    });

    parent.familyId = family._id;
    await parent.save();

    const token = jwt.sign(
      { userId: parent._id.toString(), role: 'parent', familyId: family._id.toString() },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.status(201).json({ token, user: formatUser(parent) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בהרשמה' });
  }
});

router.post('/parent/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const parent = await User.findOne({ email, role: 'parent' });

    if (!parent || !parent.passwordHash) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    const valid = await bcrypt.compare(password, parent.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    const token = jwt.sign(
      { userId: parent._id.toString(), role: 'parent', familyId: parent.familyId.toString() },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({ token, user: formatUser(parent) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בהתחברות' });
  }
});

router.post('/kid/login', async (req: Request, res: Response) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ error: 'שם משתמש ו-PIN נדרשים' });
    }

    const kid = await User.findOne({ username, role: 'kid' });
    if (!kid || !kid.pinHash) {
      return res.status(401).json({ error: 'שם משתמש או PIN שגויים' });
    }

    const valid = await bcrypt.compare(pin, kid.pinHash);
    if (!valid) {
      return res.status(401).json({ error: 'שם משתמש או PIN שגויים' });
    }

    const { dailyGiftAvailable, dailyGiftType } = await processDailyLogin(kid);

    const token = jwt.sign(
      { userId: kid._id.toString(), role: 'kid', familyId: kid.familyId.toString() },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: formatUser(kid),
      dailyGiftAvailable,
      dailyGiftType,
      /** @deprecated use dailyGiftAvailable */
      dailyStarAvailable: dailyGiftAvailable,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בהתחברות' });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });
  res.json({ user: formatUser(user) });
});

router.patch('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });

    const { uiTheme } = req.body;
    if (uiTheme !== undefined) {
      if (!UI_THEME_IDS.includes(uiTheme)) {
        return res.status(400).json({ error: 'ערכת עיצוב לא תקינה' });
      }
      user.uiTheme = uiTheme;
    }

    await user.save();
    res.json({ user: formatUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון פרופיל' });
  }
});

export default router;
