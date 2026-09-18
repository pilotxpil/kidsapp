import { Router, Request, Response } from 'express';
import { BADGES } from '@kidsapp/shared';
import { Family } from '../models/Family';
import { User } from '../models/User';
import { TaskCompletion } from '../models/TaskCompletion';
import { authenticate, requireParent } from '../middleware/auth';
import { MAX_PARENTS_PER_FAMILY } from '../utils/inviteCode';
import {
  formatFamilyChallenge,
  startOfIsoWeek,
} from '../utils/format';
import {
  getOrCreateWeeklyChallenge,
} from '../services/familyChallenge';

const router = Router();

router.get('/invite', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const family = await Family.findById(req.user!.familyId);
    if (!family) {
      return res.status(404).json({ error: 'משפחה לא נמצאה' });
    }

    const parents = await User.find({
      _id: { $in: family.parentIds },
      role: 'parent',
    }).select('displayName');

    res.json({
      inviteCode: family.inviteCode,
      parentCount: family.parentIds.length,
      maxParents: MAX_PARENTS_PER_FAMILY,
      parents: parents.map((p) => ({ displayName: p.displayName })),
      canInvite: family.parentIds.length < MAX_PARENTS_PER_FAMILY,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת קוד ההזמנה' });
  }
});

router.get('/challenge', authenticate, async (req: Request, res: Response) => {
  try {
    const challenge = await getOrCreateWeeklyChallenge(req.user!.familyId);
    res.json({ challenge: formatFamilyChallenge(challenge) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת האתגר המשפחתי' });
  }
});

router.put('/challenge', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const challenge = await getOrCreateWeeklyChallenge(req.user!.familyId);
    if (challenge.completed) {
      return res.status(400).json({ error: 'האתגר השבועי כבר הושלם' });
    }

    const { title, targetCount, rewardTitle, rewardPoints } = req.body;
    if (title !== undefined) challenge.title = String(title).trim().slice(0, 80) || challenge.title;
    if (targetCount !== undefined) {
      const n = Number(targetCount);
      if (!Number.isFinite(n) || n < 1 || n > 500) {
        return res.status(400).json({ error: 'יעד לא תקין' });
      }
      challenge.targetCount = Math.floor(n);
    }
    if (rewardTitle !== undefined) {
      challenge.rewardTitle = String(rewardTitle).trim().slice(0, 80) || challenge.rewardTitle;
    }
    if (rewardPoints !== undefined) {
      const n = Number(rewardPoints);
      if (!Number.isFinite(n) || n < 0 || n > 1000) {
        return res.status(400).json({ error: 'פרס נקודות לא תקין' });
      }
      challenge.rewardPoints = Math.floor(n);
    }

    if (challenge.progress >= challenge.targetCount) {
      // Will be claimed on next approve bump; keep consistent
    }

    await challenge.save();
    res.json({ challenge: formatFamilyChallenge(challenge) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון האתגר' });
  }
});

router.get('/achievements', authenticate, async (req: Request, res: Response) => {
  try {
    const familyId = req.user!.familyId;
    const weekStart = startOfIsoWeek();
    const kids = await User.find({ familyId, role: 'kid' }).select(
      'displayName avatar badges learningStreak streak points level equippedFrame equippedEffect'
    );

    const weekCompletions = await TaskCompletion.find({
      familyId,
      status: 'approved',
      reviewedAt: { $gte: weekStart },
    });

    const counts = new Map<string, number>();
    for (const c of weekCompletions) {
      const id = c.kidId.toString();
      counts.set(id, (counts.get(id) || 0) + 1);
    }

    let weekKingId: string | undefined;
    let weekKingCount = 0;
    for (const [id, count] of counts) {
      if (count > weekKingCount) {
        weekKingCount = count;
        weekKingId = id;
      }
    }

    const achievements: Array<{
      id: string;
      label: string;
      icon: string;
      description: string;
      kidId?: string;
      kidName?: string;
      kidAvatar?: string;
      earnedAt?: string;
    }> = [];

    if (weekKingId && weekKingCount > 0) {
      const king = kids.find((k) => k._id.toString() === weekKingId);
      if (king) {
        achievements.push({
          id: 'week_king',
          label: 'מלך השבוע',
          icon: '👑',
          description: `${weekKingCount} משימות אושרו השבוע`,
          kidId: king._id.toString(),
          kidName: king.displayName,
          kidAvatar: king.avatar,
        });
      }
    }

    const learningChamp = [...kids].sort(
      (a, b) => (b.learningStreak || 0) - (a.learningStreak || 0)
    )[0];
    if (learningChamp && (learningChamp.learningStreak || 0) > 0) {
      achievements.push({
        id: 'learning_champ',
        label: 'אלוף הלימוד',
        icon: '📚',
        description: `רצף לימוד של ${learningChamp.learningStreak} ימים`,
        kidId: learningChamp._id.toString(),
        kidName: learningChamp.displayName,
        kidAvatar: learningChamp.avatar,
      });
    }

    for (const kid of kids) {
      for (const badgeId of kid.badges || []) {
        const meta = BADGES[badgeId];
        if (!meta) continue;
        achievements.push({
          id: `badge:${kid._id}:${badgeId}`,
          label: meta.label,
          icon: meta.icon,
          description: meta.description,
          kidId: kid._id.toString(),
          kidName: kid.displayName,
          kidAvatar: kid.avatar,
        });
      }
    }

    res.json({ achievements, weekKingCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת לוח הישגים' });
  }
});

export default router;
