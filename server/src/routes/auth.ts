import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  UI_THEME_IDS,
  AVATARS,
  DEFAULT_PARENT_THEME_ID,
  isAllowedParentAvatar,
  MAX_HERO_LINE,
  MIN_PASSWORD_LENGTH,
  isPremiumTheme,
} from '@kidsapp/shared';
import { Family } from '../models/Family';
import { User } from '../models/User';
import { formatUser } from '../utils/format';
import { processDailyLogin, grantStarterAvatarGift } from '../services/gamification';
import { authenticate, requireParent } from '../middleware/auth';
import { getFamilyLimits, sendPremiumRequired } from '../services/entitlements';
import { deleteParentAccount } from '../services/accountDeletion';
import { isMailerConfigured, resetCodeEmail, sendMail } from '../services/mailer';
import {
  generateUniqueInviteCode,
  normalizeInviteCode,
  MAX_PARENTS_PER_FAMILY,
} from '../utils/inviteCode';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase();
}

function signToken(userId: string, role: 'parent' | 'kid', familyId: string) {
  return jwt.sign({ userId, role, familyId }, process.env.JWT_SECRET!, { expiresIn: '30d' });
}

/** Case-insensitive lookup that still finds legacy mixed-case rows. */
async function findParentByEmail(email: string) {
  const exact = await User.findOne({ email, role: 'parent' });
  if (exact) return exact;
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return User.findOne({ email: new RegExp(`^${escaped}$`, 'i'), role: 'parent' });
}

router.post('/parent/register', async (req: Request, res: Response) => {
  try {
    const { password, inviteCode } = req.body;
    const email = normalizeEmail(req.body.email);
    const displayName = String(req.body.displayName ?? '').trim();
    const familyName = String(req.body.familyName ?? '').trim();
    const joiningFamily = Boolean(inviteCode);

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    if (!joiningFamily && !familyName) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'כתובת האימייל לא תקינה' });
    }

    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `הסיסמה צריכה לפחות ${MIN_PASSWORD_LENGTH} תווים` });
    }

    const existing = await findParentByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'אימייל כבר קיים במערכת' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const acceptedTermsAt = new Date();
    let family;

    if (joiningFamily) {
      const code = normalizeInviteCode(inviteCode);
      family = await Family.findOne({ inviteCode: code });
      if (!family) {
        return res.status(400).json({ error: 'קוד הזמנה לא תקין' });
      }

      const parent = await User.create({
        role: 'parent',
        displayName,
        email,
        passwordHash,
        familyId: family._id,
        avatar: '👨‍👩‍👧‍👦',
        uiTheme: DEFAULT_PARENT_THEME_ID,
        acceptedTermsAt,
        lastLoginAt: new Date(),
      });

      const updated = await Family.findOneAndUpdate(
        {
          _id: family._id,
          $expr: { $lt: [{ $size: '$parentIds' }, MAX_PARENTS_PER_FAMILY] },
        },
        { $push: { parentIds: parent._id } },
        { new: true }
      );

      if (!updated) {
        await User.deleteOne({ _id: parent._id });
        return res.status(400).json({ error: 'המשפחה כבר מלאה (2 הורים)' });
      }

      const token = jwt.sign(
        { userId: parent._id.toString(), role: 'parent', familyId: family._id.toString() },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );

      return res.status(201).json({ token, user: formatUser(parent) });
    }

    const parent = await User.create({
      role: 'parent',
      displayName,
      email,
      passwordHash,
      familyId: new (await import('mongoose')).Types.ObjectId(),
      avatar: '👨‍👩‍👧‍👦',
      uiTheme: DEFAULT_PARENT_THEME_ID,
      acceptedTermsAt,
      lastLoginAt: new Date(),
    });

    family = await Family.create({
      name: familyName,
      parentId: parent._id,
      parentIds: [parent._id],
      inviteCode: await generateUniqueInviteCode(),
      plan: 'free',
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
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? '');
    if (!email || !password) {
      return res.status(400).json({ error: 'נא למלא אימייל וסיסמה' });
    }
    const parent = await findParentByEmail(email);

    if (!parent || !parent.passwordHash) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    const valid = await bcrypt.compare(password, parent.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    await User.updateOne({ _id: parent._id }, { $set: { lastLoginAt: new Date() } });

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
    const { username, pin, familyCode } = req.body;

    if (!username || !pin || !familyCode) {
      return res.status(400).json({ error: 'קוד משפחה, שם משתמש ו-PIN נדרשים' });
    }

    const code = normalizeInviteCode(String(familyCode));
    const family = await Family.findOne({ inviteCode: code });
    if (!family) {
      return res.status(401).json({ error: 'קוד משפחה, שם משתמש או PIN שגויים' });
    }

    const kid = await User.findOne({
      username: String(username).trim(),
      role: 'kid',
      familyId: family._id,
    });
    if (!kid || !kid.pinHash) {
      return res.status(401).json({ error: 'קוד משפחה, שם משתמש או PIN שגויים' });
    }

    const valid = await bcrypt.compare(String(pin), kid.pinHash);
    if (!valid) {
      return res.status(401).json({ error: 'קוד משפחה, שם משתמש או PIN שגויים' });
    }

    const { dailyGiftAvailable, dailyGiftType } = await processDailyLogin(kid);
    const { expireShopRental } = await import('../services/shopFreebies');
    await expireShopRental(kid);
    const avatarGift = await grantStarterAvatarGift(kid);
    if (avatarGift.notified) {
      const { pushAvatarShopGift } = await import('../services/push');
      pushAvatarShopGift(kid._id.toString());
    }

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
      avatarGiftJustUnlocked: avatarGift.notified,
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

  let avatarGiftJustUnlocked = false;
  if (user.role === 'kid') {
    const { expireShopRental } = await import('../services/shopFreebies');
    await expireShopRental(user);
    const avatarGift = await grantStarterAvatarGift(user);
    avatarGiftJustUnlocked = avatarGift.notified;
    if (avatarGift.notified) {
      const { pushAvatarShopGift } = await import('../services/push');
      pushAvatarShopGift(user._id.toString());
    }
  }

  res.json({ user: formatUser(user), avatarGiftJustUnlocked });
});

router.patch('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });

    const { uiTheme, displayName, avatar, heroLine } = req.body;

    if (displayName !== undefined) {
      const name = String(displayName).trim();
      if (!name) {
        return res.status(400).json({ error: 'שם תצוגה לא יכול להיות ריק' });
      }
      user.displayName = name;
    }

    if (avatar !== undefined) {
      if (user.role === 'parent' ? !isAllowedParentAvatar(avatar) : !AVATARS.includes(avatar)) {
        return res.status(400).json({ error: 'אווטאר לא תקין' });
      }
      user.avatar = avatar;
    }

    if (heroLine !== undefined) {
      if (user.role !== 'kid') {
        return res.status(400).json({ error: 'רק ילד יכול לעדכן משפט בדשבורד' });
      }
      const line = String(heroLine).trim().slice(0, MAX_HERO_LINE);
      user.heroLine = line;
    }

    if (uiTheme !== undefined) {
      if (!UI_THEME_IDS.includes(uiTheme)) {
        return res.status(400).json({ error: 'ערכת עיצוב לא תקינה' });
      }
      if (uiTheme !== user.uiTheme && isPremiumTheme(uiTheme)) {
        const { limits } = await getFamilyLimits(user.familyId.toString());
        if (!limits.premiumThemes) {
          return sendPremiumRequired(res, 'themes', 'העולם הזה שמור למשפחות פרימיום.');
        }
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

// ─── Password reset (parents) ────────────────────────────────────────────────

const RESET_TTL_MS = 15 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;

router.post('/password/forgot', async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'כתובת האימייל לא תקינה' });
    }
    if (!isMailerConfigured() && process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        error: `איפוס סיסמה במייל עדיין לא זמין. כתבו לנו: ${process.env.SUPPORT_EMAIL || 'support@kids.synaboard.com'}`,
      });
    }
    const parent = await findParentByEmail(email);
    if (parent) {
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
      parent.passwordResetHash = await bcrypt.hash(code, 10);
      parent.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
      parent.passwordResetAttempts = 0;
      await parent.save();
      const mail = resetCodeEmail(code);
      await sendMail(parent.email!, mail.subject, mail.html, mail.text);
    }
    // Same answer whether or not the email exists (no account enumeration).
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שליחת הקוד נכשלה. נסו שוב בעוד רגע.' });
  }
});

router.post('/password/reset', async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code ?? '').trim();
    const password = String(req.body.password ?? '');
    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'הקוד צריך להיות 6 ספרות' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `הסיסמה צריכה לפחות ${MIN_PASSWORD_LENGTH} תווים` });
    }
    const parent = await findParentByEmail(email);
    const invalid = () => res.status(400).json({ error: 'הקוד שגוי או שפג תוקפו. בקשו קוד חדש.' });
    if (!parent?.passwordResetHash || !parent.passwordResetExpires) return invalid();
    if (parent.passwordResetExpires.getTime() < Date.now()) return invalid();
    if ((parent.passwordResetAttempts ?? 0) >= RESET_MAX_ATTEMPTS) return invalid();

    const ok = await bcrypt.compare(code, parent.passwordResetHash);
    if (!ok) {
      parent.passwordResetAttempts = (parent.passwordResetAttempts ?? 0) + 1;
      await parent.save();
      return invalid();
    }

    parent.passwordHash = await bcrypt.hash(password, 10);
    parent.passwordResetHash = undefined;
    parent.passwordResetExpires = undefined;
    parent.passwordResetAttempts = undefined;
    parent.lastLoginAt = new Date();
    await parent.save();

    const token = signToken(parent._id.toString(), 'parent', parent.familyId.toString());
    res.json({ token, user: formatUser(parent) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'איפוס הסיסמה נכשל' });
  }
});

router.post('/password/change', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const current = String(req.body.currentPassword ?? '');
    const next = String(req.body.newPassword ?? '');
    if (next.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `הסיסמה צריכה לפחות ${MIN_PASSWORD_LENGTH} תווים` });
    }
    const parent = await User.findById(req.user!.userId);
    if (!parent?.passwordHash) return res.status(404).json({ error: 'משתמש לא נמצא' });
    if (!(await bcrypt.compare(current, parent.passwordHash))) {
      return res.status(400).json({ error: 'הסיסמה הנוכחית שגויה' });
    }
    parent.passwordHash = await bcrypt.hash(next, 10);
    await parent.save();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שינוי הסיסמה נכשל' });
  }
});

// ─── Account deletion (required by Google Play / App Store) ─────────────────

router.delete('/me', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const parent = await User.findById(req.user!.userId);
    if (!parent?.passwordHash) return res.status(404).json({ error: 'משתמש לא נמצא' });
    const password = String(req.body?.password ?? '');
    if (!(await bcrypt.compare(password, parent.passwordHash))) {
      return res.status(400).json({ error: 'הסיסמה שגויה' });
    }
    const result = await deleteParentAccount(parent._id.toString(), parent.familyId.toString());
    res.json({ ok: true, deleted: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'מחיקת החשבון נכשלה' });
  }
});

export default router;
