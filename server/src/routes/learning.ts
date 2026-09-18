import { Router, Request, Response } from 'express';
import { authenticate, requireKid, requireParent } from '../middleware/auth';
import { User } from '../models/User';
import { LearningProgress } from '../models/LearningProgress';
import { LearningAssignment } from '../models/LearningAssignment';
import { LearningPackSettings } from '../models/LearningPackSettings';
import { awardPoints } from '../services/gamification';
import {
  loadLearningPacks,
  getLearningPack,
  packToSummary,
  toPublicActivity,
  checkAnswer,
  activityPoints,
  filterCatalogPacks,
  packToCatalogItem,
} from '../services/learningPacks';
import type { LearningCategory, LearningDifficulty } from '@kidsapp/shared';
import { LEARNING_DIFFICULTIES } from '@kidsapp/shared';
import { todayString } from '../utils/format';

const router = Router();

function parseDifficulty(value: unknown): LearningDifficulty | null {
  if (typeof value !== 'string') return null;
  return (LEARNING_DIFFICULTIES as string[]).includes(value)
    ? (value as LearningDifficulty)
    : null;
}

function parsePoints(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value, 10) : NaN;
  if (!Number.isFinite(n) || n < 1 || n > 100) return null;
  return Math.round(n);
}

async function ensureKidAccess(req: Request, res: Response, targetKidId: string) {
  const kid = await User.findOne({
    _id: targetKidId,
    familyId: req.user!.familyId,
    role: 'kid',
  });
  if (!kid) {
    res.status(404).json({ error: 'ילד לא נמצא' });
    return null;
  }
  if (req.user!.role === 'kid' && req.user!.userId !== targetKidId) {
    res.status(403).json({ error: 'אין הרשאה' });
    return null;
  }
  return kid;
}

async function getAssignedPackIds(kidId: string): Promise<string[]> {
  const rows = await LearningAssignment.find({ kidId });
  return rows.map((r) => r.packId);
}

router.get('/catalog', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const category = typeof req.query.category === 'string' ? (req.query.category as LearningCategory) : undefined;
    const gradeRaw = req.query.grade;
    const grade =
      typeof gradeRaw === 'string' && gradeRaw !== '' ? parseInt(gradeRaw, 10) : undefined;

    const packs = filterCatalogPacks(loadLearningPacks(), { search, category, grade });
    const assignments = await LearningAssignment.find({ familyId: req.user!.familyId });
    const settingsRows = await LearningPackSettings.find({ familyId: req.user!.familyId });
    const byPack = new Map<string, string[]>();
    const settingsByPack = new Map(
      settingsRows.map((row) => [
        row.packId,
        { pointsPerActivity: row.pointsPerActivity, difficulty: row.difficulty },
      ])
    );

    for (const row of assignments) {
      const list = byPack.get(row.packId) ?? [];
      list.push(row.kidId.toString());
      byPack.set(row.packId, list);
    }

    res.json({
      items: packs.map((pack) =>
        packToCatalogItem(pack, byPack.get(pack.id) ?? [], settingsByPack.get(pack.id))
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת קטלוג לימוד' });
  }
});

router.post('/assign', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const { packId, kidIds, pointsPerActivity, difficulty } = req.body;

    if (!packId || typeof packId !== 'string') {
      return res.status(400).json({ error: 'חסר מזהה חבילה' });
    }

    const pack = getLearningPack(packId);
    if (!pack) {
      return res.status(404).json({ error: 'חבילת לימוד לא נמצאה' });
    }

    const points = parsePoints(pointsPerActivity);
    if (pointsPerActivity !== undefined && pointsPerActivity !== null && points == null) {
      return res.status(400).json({ error: 'מספר נקודות לא תקין (1–100)' });
    }

    const diff = parseDifficulty(difficulty);
    if (difficulty !== undefined && difficulty !== null && !diff) {
      return res.status(400).json({ error: 'רמת קושי לא תקינה' });
    }

    const rawIds: string[] = Array.isArray(kidIds)
      ? kidIds.filter((id): id is string => typeof id === 'string')
      : [];

    const kids = await User.find({
      _id: { $in: rawIds },
      familyId: req.user!.familyId,
      role: 'kid',
    });

    if (rawIds.length > 0 && kids.length !== rawIds.length) {
      return res.status(400).json({ error: 'ילד לא תקין' });
    }

    const validKidIds = new Set(kids.map((k) => k._id.toString()));

    await LearningAssignment.deleteMany({
      familyId: req.user!.familyId,
      packId,
      kidId: { $nin: Array.from(validKidIds) },
    });

    for (const kid of kids) {
      await LearningAssignment.findOneAndUpdate(
        { kidId: kid._id, packId },
        {
          familyId: req.user!.familyId,
          kidId: kid._id,
          packId,
          assignedBy: req.user!.userId,
        },
        { upsert: true, new: true }
      );
    }

    const effectivePoints = points ?? pack.defaultPoints;
    const effectiveDifficulty = diff ?? 'medium';

    await LearningPackSettings.findOneAndUpdate(
      { familyId: req.user!.familyId, packId },
      {
        familyId: req.user!.familyId,
        packId,
        pointsPerActivity: effectivePoints,
        difficulty: effectiveDifficulty,
        updatedBy: req.user!.userId,
      },
      { upsert: true, new: true }
    );

    if (kids.length > 0) {
      const { pushLearningAssigned } = await import('../services/push');
      pushLearningAssigned(
        kids.map((k) => k._id.toString()),
        pack.title?.he || 'שיעור חדש'
      );
    }

    res.json({
      packId,
      assignedKidIds: kids.map((k) => k._id.toString()),
      pointsPerActivity: effectivePoints,
      difficulty: effectiveDifficulty,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשיוך חבילת לימוד' });
  }
});

router.get('/packs', authenticate, async (req: Request, res: Response) => {
  try {
    const targetKidId = req.user!.role === 'kid' ? req.user!.userId : (req.query.kidId as string);
    if (!targetKidId) {
      return res.status(400).json({ error: 'חסר מזהה ילד' });
    }

    const kid = await ensureKidAccess(req, res, targetKidId);
    if (!kid) return;

    const assignedIds = await getAssignedPackIds(kid._id.toString());
    let packs = loadLearningPacks();

    if (assignedIds.length > 0) {
      const allowed = new Set(assignedIds);
      packs = packs.filter((p) => allowed.has(p.id));
    }

    const progressList = await LearningProgress.find({ kidId: kid._id });
    const progressMap = new Map(progressList.map((p) => [p.packId, p]));
    const settingsRows = await LearningPackSettings.find({ familyId: kid.familyId });
    const settingsByPack = new Map(
      settingsRows.map((row) => [
        row.packId,
        { pointsPerActivity: row.pointsPerActivity, difficulty: row.difficulty },
      ])
    );

    res.json({
      packs: packs.map((pack) =>
        packToSummary(pack, progressMap.get(pack.id), settingsByPack.get(pack.id))
      ),
      assignedOnly: assignedIds.length > 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת חבילות לימוד' });
  }
});

router.get('/packs/:packId', authenticate, async (req: Request, res: Response) => {
  try {
    const packId = req.params.packId as string;
    const targetKidId = req.user!.role === 'kid' ? req.user!.userId : (req.query.kidId as string);
    if (!targetKidId) {
      return res.status(400).json({ error: 'חסר מזהה ילד' });
    }

    const kid = await ensureKidAccess(req, res, targetKidId);
    if (!kid) return;

    const pack = getLearningPack(packId);
    if (!pack) {
      return res.status(404).json({ error: 'חבילת לימוד לא נמצאה' });
    }

    const assignedIds = await getAssignedPackIds(kid._id.toString());
    if (assignedIds.length > 0 && !assignedIds.includes(packId)) {
      return res.status(403).json({ error: 'חבילה זו לא שויכה אליך' });
    }

    const progress = await LearningProgress.findOne({ kidId: kid._id, packId });
    const completedActivityIds = progress?.completedActivityIds ?? [];
    const settings = await LearningPackSettings.findOne({
      familyId: kid.familyId,
      packId,
    });

    res.json({
      pack: {
        id: pack.id,
        title: pack.title,
        category: pack.category,
        grade: pack.grade,
        defaultPoints: pack.defaultPoints,
        pointsPerActivity: settings?.pointsPerActivity ?? pack.defaultPoints,
        difficulty: settings?.difficulty ?? 'medium',
        activities: pack.activities.map(toPublicActivity),
      },
      completedActivityIds,
      completed: completedActivityIds.length >= pack.activities.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת חבילת לימוד' });
  }
});

router.post('/packs/:packId/check', authenticate, requireKid, async (req: Request, res: Response) => {
  try {
    const packId = req.params.packId as string;
    const { activityId, answer } = req.body;

    if (!activityId || answer === undefined || answer === null) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    const pack = getLearningPack(packId);
    if (!pack) {
      return res.status(404).json({ error: 'חבילת לימוד לא נמצאה' });
    }

    const kid = await User.findOne({
      _id: req.user!.userId,
      familyId: req.user!.familyId,
      role: 'kid',
    });
    if (!kid) {
      return res.status(404).json({ error: 'ילד לא נמצא' });
    }

    const assignedIds = await getAssignedPackIds(kid._id.toString());
    if (assignedIds.length > 0 && !assignedIds.includes(packId)) {
      return res.status(403).json({ error: 'חבילה זו לא שויכה אליך' });
    }

    const activity = pack.activities.find((a) => a.id === activityId);
    if (!activity) {
      return res.status(404).json({ error: 'שאלה לא נמצאה' });
    }

    if (activity.type !== 'multiple_choice') {
      return res.status(400).json({ error: 'סוג פעילות לא נתמך עדיין' });
    }

    const correct = checkAnswer(activity, String(answer));
    let progress = await LearningProgress.findOne({ kidId: kid._id, packId });

    if (!progress) {
      progress = await LearningProgress.create({
        kidId: kid._id,
        familyId: kid.familyId,
        packId,
        completedActivityIds: [],
        totalPointsEarned: 0,
        mistakes: [],
      });
    }

    const alreadyCompleted = progress.completedActivityIds.includes(activityId);
    let pointsAwarded = 0;
    let newBadges: { id: string; xpAwarded: number }[] = [];

    if (!correct) {
      const mistakes = progress.mistakes ?? [];
      const existingMistake = mistakes.find((m) => m.activityId === activityId);
      if (existingMistake) existingMistake.count += 1;
      else mistakes.push({ activityId, count: 1 });
      progress.mistakes = mistakes;
      await progress.save();
    }

    if (correct && !alreadyCompleted) {
      const settings = await LearningPackSettings.findOne({
        familyId: kid.familyId,
        packId,
      });
      pointsAwarded = activityPoints(pack, activity, settings?.pointsPerActivity);
      progress.completedActivityIds.push(activityId);
      progress.totalPointsEarned += pointsAwarded;

      const allDone = progress.completedActivityIds.length >= pack.activities.length;
      if (allDone && !progress.completedAt) {
        progress.completedAt = new Date();
      }

      await progress.save();

      const today = todayString();
      if (kid.lastLearningDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        kid.learningStreak =
          kid.lastLearningDate === yesterdayStr ? (kid.learningStreak || 0) + 1 : 1;
        kid.lastLearningDate = today;
        await kid.save();
      }

      const badges = await awardPoints(
        kid,
        pointsAwarded,
        'bonus',
        `לימוד: ${pack.title.he}`,
        `${packId}:${activityId}`
      );
      newBadges = badges.map((b) => ({ id: b.id, xpAwarded: b.xpAwarded }));

      const packJustCompleted =
        progress.completedActivityIds.length >= pack.activities.length && !!progress.completedAt;
      if (packJustCompleted) {
        const { completeHomeworkForPack } = await import('../services/homework');
        await completeHomeworkForPack(kid._id.toString(), kid.familyId.toString(), packId);
      }
    }

    const packCompleted =
      progress.completedActivityIds.length >= pack.activities.length && !!progress.completedAt;

    res.json({
      correct,
      correctOptionId:
        activity.type === 'multiple_choice' && !correct ? activity.answer : undefined,
      explanation: activity.explanation,
      pointsAwarded,
      alreadyCompleted,
      points: kid.points,
      level: kid.level,
      xp: kid.xp,
      learningStreak: kid.learningStreak ?? 0,
      newBadges: newBadges.length ? newBadges : undefined,
      packCompleted,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בבדיקת תשובה' });
  }
});

router.get('/mistakes', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const kidId = req.query.kidId as string;
    if (!kidId) return res.status(400).json({ error: 'חסר מזהה ילד' });

    const kid = await ensureKidAccess(req, res, kidId);
    if (!kid) return;

    const progressList = await LearningProgress.find({
      kidId,
      familyId: req.user!.familyId,
      'mistakes.0': { $exists: true },
    });

    const entries: Array<{
      packId: string;
      packTitle: string;
      activityId: string;
      questionPreview: string;
      mistakeCount: number;
    }> = [];

    for (const progress of progressList) {
      const pack = getLearningPack(progress.packId);
      for (const m of progress.mistakes || []) {
        if (!m.count) continue;
        const activity = pack?.activities.find((a) => a.id === m.activityId);
        const promptText =
          activity && activity.prompt && typeof activity.prompt === 'object'
            ? String((activity.prompt as { text?: string; he?: string }).text || (activity.prompt as { he?: string }).he || '')
            : '';
        entries.push({
          packId: progress.packId,
          packTitle: pack?.title?.he || progress.packId,
          activityId: m.activityId,
          questionPreview: (promptText || m.activityId).slice(0, 120),
          mistakeCount: m.count,
        });
      }
    }

    entries.sort((a, b) => b.mistakeCount - a.mistakeCount);
    res.json({ mistakes: entries.slice(0, 50) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת סיכום טעויות' });
  }
});

export default router;
