import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UI_THEME_IDS, DEFAULT_KID_THEME_ID, MAX_MANUAL_BONUS_POINTS, GRADE_OPTIONS, DEFAULT_SHOP_AVATAR_ID, isAllowedKidAvatar } from '@kidsapp/shared';
import { authenticate, requireParent } from '../middleware/auth';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { Reward } from '../models/Reward';
import { TaskCompletion } from '../models/TaskCompletion';
import { Redemption } from '../models/Redemption';
import { PointTransaction } from '../models/PointTransaction';
import { formatUser } from '../utils/format';
import {
  getKidProfile,
  getDailyStarStatus,
  claimDailyStar,
  getFortuneWheelStatus,
  spinFortuneWheel,
  getTreasureChestStatus,
  openTreasureChest,
  awardPoints,
} from '../services/gamification';

const router = Router();

router.get('/', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const kids = await User.find({ familyId: req.user!.familyId, role: 'kid' });
    res.json({ kids: kids.map(formatUser) });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בטעינת ילדים' });
  }
});

function parseKidGrade(raw: unknown): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || !(GRADE_OPTIONS as readonly number[]).includes(n)) {
    return undefined; // signal invalid — caller checks
  }
  return n;
}

router.post('/', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const { displayName, username, pin, avatar, grade } = req.body;

    if (!displayName || !username || !pin) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    const existing = await User.findOne({ username, familyId: req.user!.familyId });
    if (existing) {
      return res.status(400).json({ error: 'שם משתמש כבר קיים' });
    }

    let gradeVal: number | undefined;
    if (grade !== undefined && grade !== null && grade !== '') {
      const parsed = parseKidGrade(grade);
      if (parsed === undefined) {
        return res.status(400).json({ error: 'כיתה לא תקינה (א–ו)' });
      }
      gradeVal = parsed ?? undefined;
    }

    if (avatar && !isAllowedKidAvatar(String(avatar))) {
      return res.status(400).json({ error: 'אווטאר לא תקין' });
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const kid = await User.create({
      role: 'kid',
      familyId: req.user!.familyId,
      displayName,
      username,
      pinHash,
      avatar: avatar || DEFAULT_SHOP_AVATAR_ID,
      uiTheme: DEFAULT_KID_THEME_ID,
      ...(gradeVal != null ? { grade: gradeVal } : {}),
    });

    res.status(201).json({ kid: formatUser(kid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה ביצירת פרופיל ילד' });
  }
});

router.post('/:id/bonus', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1) {
      return res.status(400).json({ error: 'יש להזין מספר נקודות חיובי שלם' });
    }
    if (amount > MAX_MANUAL_BONUS_POINTS) {
      return res.status(400).json({
        error: `ניתן להעניק עד ${MAX_MANUAL_BONUS_POINTS} נקודות בפעם אחת`,
      });
    }

    const reasonRaw = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    const reason = reasonRaw.slice(0, 120) || 'בונוס מההורה';

    const kid = await User.findOne({
      _id: req.params.id,
      familyId: req.user!.familyId,
      role: 'kid',
    });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });

    const newBadges = await awardPoints(kid, amount, 'bonus', reason);
    const updated = await User.findById(kid._id);

    const { pushBonusAwarded } = await import('../services/push');
    pushBonusAwarded(kid._id.toString(), amount, reason);

    res.json({
      kid: formatUser(updated ?? kid),
      amount,
      reason,
      newBadges,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בהענקת נקודות' });
  }
});

router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const kidId = req.params.id as string;
    const kid = await User.findOne({ _id: kidId, familyId: req.user!.familyId, role: 'kid' });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });

    if (req.user!.role === 'kid' && req.user!.userId !== kidId) {
      return res.status(403).json({ error: 'אין הרשאה' });
    }

    const { uiTheme, avatar, displayName, username, pin, grade } = req.body;

    if (uiTheme !== undefined) {
      if (!UI_THEME_IDS.includes(uiTheme)) {
        return res.status(400).json({ error: 'ערכת עיצוב לא תקינה' });
      }
      kid.uiTheme = uiTheme;
    }

    if (avatar !== undefined) {
      if (!isAllowedKidAvatar(avatar)) {
        return res.status(400).json({ error: 'אווטאר לא תקין' });
      }
      kid.avatar = avatar;
    }
    if (displayName !== undefined) {
      const name = String(displayName).trim();
      if (!name) {
        return res.status(400).json({ error: 'שם תצוגה לא יכול להיות ריק' });
      }
      kid.displayName = name;
    }

    if (req.user!.role === 'parent') {
      if (username !== undefined) {
        const nextUsername = String(username).trim();
        if (!nextUsername) {
          return res.status(400).json({ error: 'שם משתמש לא יכול להיות ריק' });
        }
        const existing = await User.findOne({
          username: nextUsername,
          familyId: req.user!.familyId,
          _id: { $ne: kid._id },
        });
        if (existing) {
          return res.status(400).json({ error: 'שם משתמש כבר קיים' });
        }
        kid.username = nextUsername;
      }
      if (pin !== undefined && String(pin).length > 0) {
        if (String(pin).length < 4) {
          return res.status(400).json({ error: 'PIN חייב 4 ספרות' });
        }
        kid.pinHash = await bcrypt.hash(String(pin), 10);
      }
      if (grade !== undefined) {
        if (grade === null || grade === '') {
          kid.grade = undefined;
          await User.updateOne({ _id: kid._id }, { $unset: { grade: 1 } });
        } else {
          const parsed = parseKidGrade(grade);
          if (parsed === undefined || parsed === null) {
            return res.status(400).json({ error: 'כיתה לא תקינה (א–ו)' });
          }
          kid.grade = parsed;
        }
      }
    }

    await kid.save();
    const fresh = await User.findById(kid._id);
    res.json({ kid: formatUser(fresh ?? kid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון פרופיל' });
  }
});

router.get('/:id/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const profile = await getKidProfile(id);
    if (!profile) return res.status(404).json({ error: 'ילד לא נמצא' });
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בטעינת פרופיל' });
  }
});

router.get('/:id/daily-star', authenticate, async (req: Request, res: Response) => {
  try {
    const kidId = req.params.id as string;
    if (req.user!.role === 'kid' && req.user!.userId !== kidId) {
      return res.status(403).json({ error: 'אין הרשאה' });
    }

    const kid = await User.findOne({ _id: kidId, familyId: req.user!.familyId, role: 'kid' });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });

    const status = await getDailyStarStatus(kid);
    res.json({ status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת כוכב יומי' });
  }
});

router.post('/:id/daily-star/claim', authenticate, async (req: Request, res: Response) => {
  try {
    const kidId = req.params.id as string;
    if (req.user!.role !== 'kid' || req.user!.userId !== kidId) {
      return res.status(403).json({ error: 'רק הילד יכול לפתוח את הכוכב' });
    }

    const kid = await User.findOne({ _id: kidId, familyId: req.user!.familyId, role: 'kid' });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });

    const result = await claimDailyStar(kid);
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      dailyBonus: result.dailyBonus,
      streakBonus: result.streakBonus,
      totalPoints: result.totalPoints,
      streak: result.streak,
      points: result.points,
      level: result.level,
      xp: result.xp,
      newBadges: result.newBadges,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בפתיחת הכוכב' });
  }
});

router.get('/:id/fortune-wheel', authenticate, async (req: Request, res: Response) => {
  try {
    const kidId = req.params.id as string;
    if (req.user!.role === 'kid' && req.user!.userId !== kidId) {
      return res.status(403).json({ error: 'אין הרשאה' });
    }
    const kid = await User.findOne({ _id: kidId, familyId: req.user!.familyId, role: 'kid' });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });
    const status = await getFortuneWheelStatus(kid);
    res.json({ status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת גלגל המזל' });
  }
});

router.post('/:id/fortune-wheel/spin', authenticate, async (req: Request, res: Response) => {
  try {
    const kidId = req.params.id as string;
    if (req.user!.role !== 'kid' || req.user!.userId !== kidId) {
      return res.status(403).json({ error: 'רק הילד יכול לסובב את הגלגל' });
    }
    const kid = await User.findOne({ _id: kidId, familyId: req.user!.familyId, role: 'kid' });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });
    const result = await spinFortuneWheel(kid);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({
      segmentIndex: result.segmentIndex,
      segment: result.segment,
      pointsAwarded: result.pointsAwarded,
      streakBonus: result.streakBonus,
      streak: result.streak,
      points: result.points,
      level: result.level,
      xp: result.xp,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בסיבוב הגלגל' });
  }
});

router.get('/:id/treasure-chest', authenticate, async (req: Request, res: Response) => {
  try {
    const kidId = req.params.id as string;
    if (req.user!.role === 'kid' && req.user!.userId !== kidId) {
      return res.status(403).json({ error: 'אין הרשאה' });
    }
    const kid = await User.findOne({ _id: kidId, familyId: req.user!.familyId, role: 'kid' });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });
    const status = await getTreasureChestStatus(kid);
    res.json({ status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת תיבת האוצר' });
  }
});

router.post('/:id/treasure-chest/open', authenticate, async (req: Request, res: Response) => {
  try {
    const kidId = req.params.id as string;
    if (req.user!.role !== 'kid' || req.user!.userId !== kidId) {
      return res.status(403).json({ error: 'רק הילד יכול לפתוח את התיבה' });
    }
    const kid = await User.findOne({ _id: kidId, familyId: req.user!.familyId, role: 'kid' });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });
    const result = await openTreasureChest(kid);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({
      pointsAwarded: result.pointsAwarded,
      points: result.points,
      level: result.level,
      xp: result.xp,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בפתיחת התיבה' });
  }
});

router.get('/:id/transactions', authenticate, async (req: Request, res: Response) => {
  try {
    const kid = await User.findOne({
      _id: req.params.id,
      familyId: req.user!.familyId,
      role: 'kid',
    });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });

    if (req.user!.role === 'kid' && req.user!.userId !== kid._id.toString()) {
      return res.status(403).json({ error: 'אין הרשאה' });
    }

    const transactions = await PointTransaction.find({
      kidId: kid._id,
      familyId: req.user!.familyId,
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      transactions: transactions.map((t) => ({
        _id: t._id.toString(),
        kidId: t.kidId.toString(),
        familyId: t.familyId.toString(),
        amount: t.amount,
        type: t.type,
        description: t.description,
        referenceId: t.referenceId?.toString(),
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בטעינת היסטוריה' });
  }
});

router.get('/leaderboard', authenticate, async (req: Request, res: Response) => {
  try {
    const kids = await User.find({ familyId: req.user!.familyId, role: 'kid' })
      .sort({ points: -1 })
      .select('displayName avatar points level streak learningStreak badges equippedFrame equippedEffect');

    res.json({
      leaderboard: kids.map((k, i) => ({
        rank: i + 1,
        _id: k._id.toString(),
        displayName: k.displayName,
        avatar: k.avatar,
        points: k.points,
        level: k.level,
        streak: k.streak,
        learningStreak: k.learningStreak ?? 0,
        badges: k.badges,
        equippedFrame: k.equippedFrame,
        equippedEffect: k.equippedEffect,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בטעינת לידרבורד' });
  }
});

router.get('/cosmetics', authenticate, async (req: Request, res: Response) => {
  try {
    const { COSMETIC_ITEMS } = await import('@kidsapp/shared');
    const targetKidId = req.user!.role === 'kid' ? req.user!.userId : (req.query.kidId as string);
    if (!targetKidId) return res.status(400).json({ error: 'נדרש kidId' });

    const kid = await User.findOne({
      _id: targetKidId,
      familyId: req.user!.familyId,
      role: 'kid',
    });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });
    if (req.user!.role === 'kid' && req.user!.userId !== targetKidId) {
      return res.status(403).json({ error: 'אין הרשאה' });
    }

    res.json({
      items: COSMETIC_ITEMS,
      owned: kid.ownedCosmetics ?? [],
      equippedFrame: kid.equippedFrame,
      equippedEffect: kid.equippedEffect,
      avatar: kid.avatar,
      points: kid.points,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת חנות הדמות' });
  }
});

router.post('/cosmetics/:itemId/buy', authenticate, async (req: Request, res: Response) => {
  try {
    const { COSMETIC_ITEMS } = await import('@kidsapp/shared');
    const { deductPoints } = await import('../services/gamification');
    const kidId = req.user!.role === 'kid' ? req.user!.userId : req.body.kidId;
    if (!kidId) return res.status(400).json({ error: 'נדרש kidId' });
    if (req.user!.role === 'kid' && req.user!.userId !== kidId) {
      return res.status(403).json({ error: 'אין הרשאה' });
    }

    const item = COSMETIC_ITEMS.find((c) => c.id === req.params.itemId);
    if (!item) return res.status(404).json({ error: 'פריט לא נמצא' });

    const kid = await User.findOne({ _id: kidId, familyId: req.user!.familyId, role: 'kid' });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });

    const owned = kid.ownedCosmetics ?? [];
    if (owned.includes(item.id)) {
      return res.status(400).json({ error: 'הפריט כבר בבעלותך' });
    }
    if (kid.points < item.cost) {
      return res.status(400).json({ error: 'אין מספיק נקודות' });
    }

    await deductPoints(kid, item.cost, `קנייה: ${item.label}`, item.id);
    kid.ownedCosmetics = [...owned, item.id];
    if (item.type === 'avatar') {
      kid.avatar = item.id;
    }
    await kid.save();

    res.json({ kid: formatUser(kid), item });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'שגיאה בקניית פריט' });
  }
});

router.post('/cosmetics/:itemId/equip', authenticate, async (req: Request, res: Response) => {
  try {
    const { COSMETIC_ITEMS } = await import('@kidsapp/shared');
    const kidId = req.user!.role === 'kid' ? req.user!.userId : req.body.kidId;
    if (!kidId) return res.status(400).json({ error: 'נדרש kidId' });
    if (req.user!.role === 'kid' && req.user!.userId !== kidId) {
      return res.status(403).json({ error: 'אין הרשאה' });
    }

    const item = COSMETIC_ITEMS.find((c) => c.id === req.params.itemId);
    if (!item) return res.status(404).json({ error: 'פריט לא נמצא' });

    const kid = await User.findOne({ _id: kidId, familyId: req.user!.familyId, role: 'kid' });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });
    if (!(kid.ownedCosmetics ?? []).includes(item.id)) {
      return res.status(400).json({ error: 'יש לקנות את הפריט קודם' });
    }

    if (item.type === 'avatar') kid.avatar = item.id;
    if (item.type === 'frame') kid.equippedFrame = item.id;
    if (item.type === 'effect') kid.equippedEffect = item.id;
    await kid.save();

    res.json({ kid: formatUser(kid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בציוד פריט' });
  }
});

router.get('/goal', authenticate, async (req: Request, res: Response) => {
  try {
    const targetKidId = req.user!.role === 'kid' ? req.user!.userId : (req.query.kidId as string);
    if (!targetKidId) return res.status(400).json({ error: 'נדרש kidId' });

    const kid = await User.findOne({
      _id: targetKidId,
      familyId: req.user!.familyId,
      role: 'kid',
    });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });
    if (req.user!.role === 'kid' && req.user!.userId !== targetKidId) {
      return res.status(403).json({ error: 'אין הרשאה' });
    }

    if (!kid.goalRewardId) {
      return res.json({ goal: null });
    }

    const reward = await Reward.findOne({
      _id: kid.goalRewardId,
      familyId: req.user!.familyId,
      isActive: true,
    });
    if (!reward) {
      kid.goalRewardId = undefined;
      await kid.save();
      return res.json({ goal: null });
    }

    const progress = reward.cost > 0 ? Math.min(1, kid.points / reward.cost) : 1;
    res.json({
      goal: {
        rewardId: reward._id.toString(),
        rewardTitle: reward.title,
        rewardCost: reward.cost,
        rewardIcon: reward.icon,
        currentPoints: kid.points,
        progress,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת מטרה' });
  }
});

router.put('/goal', authenticate, async (req: Request, res: Response) => {
  try {
    const kidId = req.user!.role === 'kid' ? req.user!.userId : req.body.kidId;
    if (!kidId) return res.status(400).json({ error: 'נדרש kidId' });
    if (req.user!.role === 'kid' && req.user!.userId !== kidId) {
      return res.status(403).json({ error: 'אין הרשאה' });
    }

    const kid = await User.findOne({ _id: kidId, familyId: req.user!.familyId, role: 'kid' });
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });

    const { rewardId } = req.body;
    if (rewardId === null || rewardId === '') {
      kid.goalRewardId = undefined;
      await kid.save();
      return res.json({ goal: null, kid: formatUser(kid) });
    }

    const reward = await Reward.findOne({
      _id: rewardId,
      familyId: req.user!.familyId,
      isActive: true,
    });
    if (!reward) return res.status(404).json({ error: 'פרס לא נמצא' });

    kid.goalRewardId = reward._id;
    await kid.save();

    const progress = reward.cost > 0 ? Math.min(1, kid.points / reward.cost) : 1;
    res.json({
      goal: {
        rewardId: reward._id.toString(),
        rewardTitle: reward.title,
        rewardCost: reward.cost,
        rewardIcon: reward.icon,
        currentPoints: kid.points,
        progress,
      },
      kid: formatUser(kid),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשמירת מטרה' });
  }
});

router.get('/dashboard', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const familyId = req.user!.familyId;

    const [pendingCompletions, pendingRedemptions, kids, totalTasks, totalRewards] =
      await Promise.all([
        TaskCompletion.find({ familyId, status: 'pending' })
          .populate('taskId')
          .populate('kidId', 'displayName avatar')
          .sort({ submittedAt: -1 }),
        Redemption.find({ familyId, status: 'pending' })
          .populate('rewardId')
          .populate('kidId', 'displayName avatar points')
          .sort({ requestedAt: -1 }),
        User.find({ familyId, role: 'kid' }),
        Task.countDocuments({ familyId, isActive: true }),
        Reward.countDocuments({ familyId, isActive: true }),
      ]);

    res.json({
      dashboard: {
        pendingCompletions: pendingCompletions.map((c) => ({
          _id: c._id.toString(),
          taskId: c.taskId.toString(),
          kidId: c.kidId.toString(),
          status: c.status,
          submittedAt: c.submittedAt.toISOString(),
          proofPhoto: c.proofPhoto,
          rejectNote: c.rejectNote,
          task: c.taskId && typeof c.taskId === 'object' ? {
            title: (c.taskId as any).title,
            points: (c.taskId as any).points,
            icon: (c.taskId as any).icon,
            category: (c.taskId as any).category,
          } : undefined,
          kid: c.kidId && typeof c.kidId === 'object' ? {
            displayName: (c.kidId as any).displayName,
            avatar: (c.kidId as any).avatar,
          } : undefined,
        })),
        pendingRedemptions: pendingRedemptions.map((r) => ({
          _id: r._id.toString(),
          rewardId: r.rewardId.toString(),
          kidId: r.kidId.toString(),
          status: r.status,
          cost: r.cost,
          requestedAt: r.requestedAt.toISOString(),
          reward: r.rewardId && typeof r.rewardId === 'object' ? {
            title: (r.rewardId as any).title,
            icon: (r.rewardId as any).icon,
          } : undefined,
          kid: r.kidId && typeof r.kidId === 'object' ? {
            displayName: (r.kidId as any).displayName,
            avatar: (r.kidId as any).avatar,
          } : undefined,
        })),
        kids: kids.map(formatUser),
        stats: {
          totalTasks,
          totalRewards,
          pendingApprovals: pendingCompletions.length + pendingRedemptions.length,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת דשבורד' });
  }
});

export default router;
