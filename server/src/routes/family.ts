import { Router, Request, Response } from 'express';
import { Family } from '../models/Family';
import { User } from '../models/User';
import { authenticate, requireParent } from '../middleware/auth';
import { MAX_PARENTS_PER_FAMILY } from '../utils/inviteCode';

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

export default router;
