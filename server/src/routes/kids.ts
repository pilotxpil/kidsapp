import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, requireParent } from '../middleware/auth';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { Reward } from '../models/Reward';
import { TaskCompletion } from '../models/TaskCompletion';
import { Redemption } from '../models/Redemption';
import { PointTransaction } from '../models/PointTransaction';
import { formatUser } from '../utils/format';
import { getKidProfile } from '../services/gamification';

const router = Router();

router.get('/', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const kids = await User.find({ familyId: req.user!.familyId, role: 'kid' });
    res.json({ kids: kids.map(formatUser) });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בטעינת ילדים' });
  }
});

router.post('/', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const { displayName, username, pin, avatar } = req.body;

    if (!displayName || !username || !pin) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    const existing = await User.findOne({ username, familyId: req.user!.familyId });
    if (existing) {
      return res.status(400).json({ error: 'שם משתמש כבר קיים' });
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const kid = await User.create({
      role: 'kid',
      familyId: req.user!.familyId,
      displayName,
      username,
      pinHash,
      avatar: avatar || '🦁',
    });

    res.status(201).json({ kid: formatUser(kid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה ביצירת פרופיל ילד' });
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

router.get('/:id/transactions', authenticate, async (req: Request, res: Response) => {
  try {
    const transactions = await PointTransaction.find({ kidId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);

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
      .select('displayName avatar points level streak badges');

    res.json({
      leaderboard: kids.map((k, i) => ({
        rank: i + 1,
        _id: k._id.toString(),
        displayName: k.displayName,
        avatar: k.avatar,
        points: k.points,
        level: k.level,
        streak: k.streak,
        badges: k.badges,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בטעינת לידרבורד' });
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
          task: c.taskId && typeof c.taskId === 'object' ? {
            title: (c.taskId as any).title,
            points: (c.taskId as any).points,
            icon: (c.taskId as any).icon,
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
