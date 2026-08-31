import { Router, Request, Response } from 'express';
import { authenticate, requireParent } from '../middleware/auth';
import { Reward } from '../models/Reward';
import { Redemption } from '../models/Redemption';
import { User } from '../models/User';
import { deductPoints } from '../services/gamification';
import { formatUser } from '../utils/format';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const rewards = await Reward.find({
      familyId: req.user!.familyId,
      isActive: true,
    }).sort({ cost: 1 });

    res.json({
      rewards: rewards.map((r) => ({
        _id: r._id.toString(),
        familyId: r.familyId.toString(),
        title: r.title,
        description: r.description,
        cost: r.cost,
        category: r.category,
        icon: r.icon,
        imageUrl: r.imageUrl,
        requiresApproval: r.requiresApproval,
        isActive: r.isActive,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בטעינת פרסים' });
  }
});

router.post('/', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const { title, description, cost, category, icon, imageUrl } = req.body;

    const reward = await Reward.create({
      familyId: req.user!.familyId,
      title,
      description: description || '',
      cost,
      category: category || 'other',
      icon: icon || '🎁',
      imageUrl,
    });

    res.status(201).json({
      reward: {
        _id: reward._id.toString(),
        familyId: reward.familyId.toString(),
        title: reward.title,
        description: reward.description,
        cost: reward.cost,
        category: reward.category,
        icon: reward.icon,
        imageUrl: reward.imageUrl,
        requiresApproval: reward.requiresApproval,
        isActive: reward.isActive,
        createdAt: reward.createdAt.toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה ביצירת פרס' });
  }
});

router.put('/:id', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const { title, description, cost, category, icon, imageUrl } = req.body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (cost !== undefined) updates.cost = Number(cost);
    if (category !== undefined) updates.category = category;
    if (icon !== undefined) updates.icon = icon;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;

    const reward = await Reward.findOneAndUpdate(
      { _id: req.params.id, familyId: req.user!.familyId },
      updates,
      { new: true }
    );
    if (!reward) return res.status(404).json({ error: 'פרס לא נמצא' });
    res.json({
      reward: {
        _id: reward._id.toString(),
        familyId: reward.familyId.toString(),
        title: reward.title,
        description: reward.description,
        cost: reward.cost,
        category: reward.category,
        icon: reward.icon,
        imageUrl: reward.imageUrl,
        requiresApproval: reward.requiresApproval,
        isActive: reward.isActive,
        createdAt: reward.createdAt.toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בעדכון פרס' });
  }
});

router.delete('/:id', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    await Reward.findOneAndUpdate(
      { _id: req.params.id, familyId: req.user!.familyId },
      { isActive: false }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה במחיקת פרס' });
  }
});

router.post('/:id/redeem', authenticate, async (req: Request, res: Response) => {
  try {
    const reward = await Reward.findOne({
      _id: req.params.id,
      familyId: req.user!.familyId,
      isActive: true,
    });

    if (!reward) return res.status(404).json({ error: 'פרס לא נמצא' });

    const kidId = req.user!.role === 'kid' ? req.user!.userId : req.body.kidId;
    const kid = await User.findById(kidId);

    if (!kid || kid.role !== 'kid') {
      return res.status(404).json({ error: 'ילד לא נמצא' });
    }

    if (kid.points < reward.cost) {
      return res.status(400).json({ error: 'אין מספיק נקודות' });
    }

    const existing = await Redemption.findOne({
      rewardId: reward._id,
      kidId: kid._id,
      status: 'pending',
    });

    if (existing) {
      return res.status(400).json({ error: 'כבר יש בקשת מימוש ממתינה לפרס זה' });
    }

    const redemption = await Redemption.create({
      rewardId: reward._id,
      kidId: kid._id,
      familyId: req.user!.familyId,
      cost: reward.cost,
      status: 'pending',
    });

    res.status(201).json({
      redemption: {
        _id: redemption._id.toString(),
        rewardId: redemption.rewardId.toString(),
        kidId: redemption.kidId.toString(),
        familyId: redemption.familyId.toString(),
        status: redemption.status,
        cost: redemption.cost,
        requestedAt: redemption.requestedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בבקשת מימוש' });
  }
});

router.get('/redemptions/pending', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const redemptions = await Redemption.find({
      familyId: req.user!.familyId,
      status: 'pending',
    })
      .populate('rewardId')
      .populate('kidId', 'displayName avatar points')
      .sort({ requestedAt: -1 });

    res.json({
      redemptions: redemptions.map((r) => ({
        _id: r._id.toString(),
        rewardId: r.rewardId.toString(),
        kidId: r.kidId.toString(),
        familyId: r.familyId.toString(),
        status: r.status,
        cost: r.cost,
        requestedAt: r.requestedAt.toISOString(),
        reward: r.rewardId && typeof r.rewardId === 'object' ? {
          _id: (r.rewardId as any)._id.toString(),
          title: (r.rewardId as any).title,
          icon: (r.rewardId as any).icon,
          cost: (r.rewardId as any).cost,
        } : undefined,
        kid: r.kidId && typeof r.kidId === 'object' ? {
          _id: (r.kidId as any)._id.toString(),
          displayName: (r.kidId as any).displayName,
          avatar: (r.kidId as any).avatar,
          points: (r.kidId as any).points,
        } : undefined,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בטעינת בקשות מימוש' });
  }
});

router.post('/redemptions/:id/approve', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const { action } = req.body;
    const redemption = await Redemption.findOne({
      _id: req.params.id,
      familyId: req.user!.familyId,
      status: 'pending',
    }).populate('rewardId');

    if (!redemption) return res.status(404).json({ error: 'בקשה לא נמצאה' });

    if (action === 'reject') {
      redemption.status = 'rejected';
      redemption.reviewedAt = new Date();
      redemption.reviewedBy = req.user!.userId as any;
      await redemption.save();
      return res.json({ redemption });
    }

    const kid = await User.findById(redemption.kidId);
    if (!kid) return res.status(404).json({ error: 'ילד לא נמצא' });

    if (kid.points < redemption.cost) {
      return res.status(400).json({ error: 'לילד אין מספיק נקודות' });
    }

    const reward = redemption.rewardId as any;
    await deductPoints(kid, redemption.cost, `מימוש: ${reward.title}`, redemption._id.toString());

    redemption.status = 'fulfilled';
    redemption.reviewedAt = new Date();
    redemption.reviewedBy = req.user!.userId as any;
    await redemption.save();

    res.json({ redemption, kid: formatUser(kid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה באישור מימוש' });
  }
});

export default router;
