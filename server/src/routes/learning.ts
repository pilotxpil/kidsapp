import path from 'path';
import fs from 'fs';
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
  getLearningPackForFamily,
  loadAllPacksForFamily,
  packToSummary,
  toPublicActivity,
  checkAnswer,
  packCompletionPoints,
  filterCatalogPacks,
  packToCatalogItem,
  parseLearningPack,
  familyDocToPack,
} from '../services/learningPacks';
import type { LearningCategory, LearningDifficulty, LearningPack } from '@kidsapp/shared';
import {
  LEARNING_DIFFICULTIES,
  resolvePackKind,
  makeCustomLearningPackId,
  isCustomLearningPackId,
  LEARNING_CATEGORIES,
  normalizeSelectAllIds,
  parseOpenWordList,
  canonicalOpenWords,
} from '@kidsapp/shared';
import { FamilyLearningPack } from '../models/FamilyLearningPack';
import { todayString } from '../utils/format';

const router = Router();

/** Parent content studio — static HTML, login happens in the page. */
router.get('/studio', (_req, res) => {
  const file = path.resolve(__dirname, '../../../docs/learning-pack-studio.html');
  if (!fs.existsSync(file)) {
    return res.status(404).send('סטודיו לא נמצא בשרת');
  }
  res.sendFile(file);
});

function parseDifficulty(value: unknown): LearningDifficulty | null {
  if (typeof value !== 'string') return null;
  return (LEARNING_DIFFICULTIES as string[]).includes(value)
    ? (value as LearningDifficulty)
    : null;
}

function parseGradeQuery(raw: unknown): number[] | undefined {
  const parts: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') parts.push(...item.split(','));
    }
  } else if (typeof raw === 'string' && raw.trim()) {
    parts.push(...raw.split(','));
  }
  const grades = parts
    .map((p) => parseInt(p.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 6);
  return grades.length ? [...new Set(grades)] : undefined;
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
    const grades = parseGradeQuery(req.query.grades ?? req.query.grade);

    const packs = filterCatalogPacks(await loadAllPacksForFamily(req.user!.familyId), {
      search,
      category,
      grades,
    });
    const assignments = await LearningAssignment.find({ familyId: req.user!.familyId });
    const settingsRows = await LearningPackSettings.find({ familyId: req.user!.familyId });
    const progressRows = await LearningProgress.find({ familyId: req.user!.familyId });
    const byPack = new Map<string, string[]>();
    const completedByPack = new Map<string, string[]>();
    const pastByPack = new Map<string, string[]>();
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

    for (const row of progressRows) {
      const kidId = row.kidId.toString();
      const assigned = (byPack.get(row.packId) ?? []).includes(kidId);
      const started =
        !!row.completedAt ||
        (row.completedActivityIds?.length ?? 0) > 0 ||
        (row.answers?.length ?? 0) > 0;
      if (row.completedAt) {
        const list = completedByPack.get(row.packId) ?? [];
        list.push(kidId);
        completedByPack.set(row.packId, list);
      } else if (started && !assigned) {
        const list = pastByPack.get(row.packId) ?? [];
        list.push(kidId);
        pastByPack.set(row.packId, list);
      }
    }

    res.json({
      items: packs.map((pack) =>
        packToCatalogItem(
          pack,
          byPack.get(pack.id) ?? [],
          settingsByPack.get(pack.id),
          completedByPack.get(pack.id) ?? [],
          pastByPack.get(pack.id) ?? []
        )
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

    const pack = await getLearningPackForFamily(packId, req.user!.familyId);
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

function buildPackFromInput(
  body: Record<string, unknown>,
  packId: string
): LearningPack | null {
  const raw = {
    id: packId,
    version: typeof body.version === 'number' ? body.version : 1,
    title: body.title,
    category: body.category,
    kind: body.kind,
    passage: body.passage,
    passageTitle: body.passageTitle,
    grade: body.grade,
    tags: body.tags,
    defaultPoints: body.defaultPoints,
    activities: body.activities,
  };
  return parseLearningPack(raw);
}

router.get('/custom-packs', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const rows = await FamilyLearningPack.find({ familyId: req.user!.familyId }).sort({
      updatedAt: -1,
    });
    res.json({ packs: rows.map((doc) => familyDocToPack(doc)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת חבילות מותאמות' });
  }
});

router.post('/custom-packs', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const packId = makeCustomLearningPackId(
      typeof req.body?.id === 'string' ? req.body.id : undefined
    );
    if (getLearningPack(packId)) {
      return res.status(400).json({ error: 'מזהה חבילה תפוס ע״י חבילת מערכת' });
    }
    const pack = buildPackFromInput(req.body ?? {}, packId);
    if (!pack) {
      return res.status(400).json({
        error:
          'חבילה לא תקינה — נדרשים כותרת בעברית, קטגוריה, נקודות, לפחות שאלה אחת עם תשובה תקינה',
      });
    }

    const existing = await FamilyLearningPack.findOne({
      familyId: req.user!.familyId,
      packId,
    });
    if (existing) {
      return res.status(409).json({ error: 'כבר קיימת חבילה עם מזהה זה' });
    }

    const doc = await FamilyLearningPack.create({
      familyId: req.user!.familyId,
      packId: pack.id,
      version: pack.version,
      title: pack.title,
      category: pack.category,
      kind: resolvePackKind(pack.kind),
      passage: pack.passage,
      passageTitle: pack.passageTitle,
      grade: pack.grade,
      tags: pack.tags ?? [],
      defaultPoints: pack.defaultPoints,
      activities: pack.activities,
      createdBy: req.user!.userId,
    });

    res.status(201).json({ pack: familyDocToPack(doc) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה ביצירת חבילת לימוד' });
  }
});

router.put('/custom-packs/:packId', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const packId = req.params.packId as string;
    const familyId = req.user!.familyId;
    const existingFamily = await FamilyLearningPack.findOne({ familyId, packId });
    const builtin = getLearningPack(packId);

    // Edit family-owned packs, or create a family override of a built-in pack.
    if (!existingFamily && !builtin && !isCustomLearningPackId(packId)) {
      return res.status(404).json({ error: 'חבילה לא נמצאה' });
    }

    const pack = buildPackFromInput(req.body ?? {}, packId);
    if (!pack) {
      return res.status(400).json({ error: 'חבילה לא תקינה' });
    }

    const doc = await FamilyLearningPack.findOneAndUpdate(
      { familyId, packId },
      {
        $set: {
          version: pack.version,
          title: pack.title,
          category: pack.category,
          kind: resolvePackKind(pack.kind),
          passage: pack.passage,
          passageTitle: pack.passageTitle,
          grade: pack.grade,
          tags: pack.tags ?? [],
          defaultPoints: pack.defaultPoints,
          activities: pack.activities,
        },
        $setOnInsert: {
          familyId,
          packId,
          createdBy: req.user!.userId,
        },
      },
      { new: true, upsert: true }
    );
    const { FamilyHiddenLearningPack } = await import('../models/FamilyHiddenLearningPack');
    await FamilyHiddenLearningPack.deleteOne({ familyId, packId });
    res.json({ pack: familyDocToPack(doc) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון חבילת לימוד' });
  }
});

router.delete(
  '/custom-packs/:packId',
  authenticate,
  requireParent,
  async (req: Request, res: Response) => {
    try {
      const packId = req.params.packId as string;
      const familyId = req.user!.familyId;

      const familyPack = await FamilyLearningPack.findOne({ familyId, packId });
      const builtin = getLearningPack(packId);
      if (!familyPack && !builtin) {
        return res.status(404).json({ error: 'חבילה לא נמצאה' });
      }

      if (familyPack) {
        await FamilyLearningPack.deleteOne({ familyId, packId });
      }

      // Built-in packs stay on disk; hide them for this family so they leave the catalog.
      if (builtin) {
        const { FamilyHiddenLearningPack } = await import('../models/FamilyHiddenLearningPack');
        await FamilyHiddenLearningPack.findOneAndUpdate(
          { familyId, packId },
          {
            $setOnInsert: {
              familyId,
              packId,
              hiddenBy: req.user!.userId,
            },
          },
          { upsert: true }
        );
      }

      await LearningAssignment.deleteMany({ familyId, packId });
      await LearningPackSettings.deleteMany({ familyId, packId });
      await LearningProgress.deleteMany({ familyId, packId });
      res.json({ success: true, packId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'שגיאה במחיקת חבילה' });
    }
  }
);

router.post('/custom-packs/import', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const payload = req.body?.pack ?? req.body?.packs ?? req.body;
    const items = Array.isArray(payload) ? payload : [payload];
    if (items.length === 0 || items[0] == null) {
      return res.status(400).json({ error: 'לא נמצאו חבילות לייבוא' });
    }
    if (items.length > 20) {
      return res.status(400).json({ error: 'ניתן לייבא עד 20 חבילות בכל פעם' });
    }

    const imported: LearningPack[] = [];
    const errors: string[] = [];

    for (const item of items) {
      const preferredId =
        typeof item?.id === 'string' && isCustomLearningPackId(item.id)
          ? item.id
          : makeCustomLearningPackId(typeof item?.id === 'string' ? item.id : undefined);
      if (getLearningPack(preferredId)) {
        errors.push(`${preferredId}: מזהה תפוס ע״י חבילת מערכת`);
        continue;
      }
      const pack = buildPackFromInput(item ?? {}, preferredId);
      if (!pack) {
        errors.push(`${String(item?.id ?? 'חבילה')}: מבנה לא תקין`);
        continue;
      }
      const doc = await FamilyLearningPack.findOneAndUpdate(
        { familyId: req.user!.familyId, packId: pack.id },
        {
          familyId: req.user!.familyId,
          packId: pack.id,
          version: pack.version,
          title: pack.title,
          category: pack.category,
          kind: resolvePackKind(pack.kind),
          passage: pack.passage,
          passageTitle: pack.passageTitle,
          grade: pack.grade,
          tags: pack.tags ?? [],
          defaultPoints: pack.defaultPoints,
          activities: pack.activities,
          createdBy: req.user!.userId,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (doc) imported.push(familyDocToPack(doc));
    }

    if (imported.length === 0) {
      return res.status(400).json({
        error: errors[0] || 'הייבוא נכשל',
        errors,
      });
    }

    res.json({ packs: imported, errors: errors.length ? errors : undefined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בייבוא חבילות' });
  }
});

router.get(
  '/custom-packs/:packId/export',
  authenticate,
  requireParent,
  async (req: Request, res: Response) => {
    try {
      const packId = req.params.packId as string;
      const pack = await getLearningPackForFamily(packId, req.user!.familyId);
      if (!pack) {
        return res.status(404).json({ error: 'חבילה לא נמצאה' });
      }
      res.json({ pack });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'שגיאה בייצוא חבילה' });
    }
  }
);

router.get('/packs', authenticate, async (req: Request, res: Response) => {
  try {
    const targetKidId = req.user!.role === 'kid' ? req.user!.userId : (req.query.kidId as string);
    if (!targetKidId) {
      return res.status(400).json({ error: 'חסר מזהה ילד' });
    }

    const kid = await ensureKidAccess(req, res, targetKidId);
    if (!kid) return;

    const assignedIds = await getAssignedPackIds(kid._id.toString());
    let packs = await loadAllPacksForFamily(kid.familyId.toString());

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

    const pack = await getLearningPackForFamily(packId, req.user!.familyId);
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
        kind: resolvePackKind(pack.kind),
        passage: pack.passage,
        passageTitle: pack.passageTitle,
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

    const pack = await getLearningPackForFamily(packId, req.user!.familyId);
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

    if (
      activity.type !== 'multiple_choice' &&
      activity.type !== 'select_all' &&
      activity.type !== 'open_words'
    ) {
      return res.status(400).json({ error: 'סוג פעילות לא נתמך עדיין' });
    }

    if (activity.type === 'select_all' && normalizeSelectAllIds(answer).length < 1) {
      return res.status(400).json({ error: 'סמנו לפחות תשובה אחת' });
    }
    if (activity.type === 'open_words' && parseOpenWordList(answer).length < 1) {
      return res.status(400).json({ error: 'הכניסו לפחות מילה אחת' });
    }

    const correct = checkAnswer(activity, answer);
    const storedAnswer =
      activity.type === 'select_all'
        ? normalizeSelectAllIds(answer).join(',')
        : activity.type === 'open_words'
          ? parseOpenWordList(answer).join(',')
          : String(answer);
    let progress = await LearningProgress.findOne({ kidId: kid._id, packId });

    if (!progress) {
      progress = await LearningProgress.create({
        kidId: kid._id,
        familyId: kid.familyId,
        packId,
        completedActivityIds: [],
        totalPointsEarned: 0,
        mistakes: [],
        answers: [],
      });
    }

    const alreadyAnswered = progress.completedActivityIds.includes(activityId);
    let pointsAwarded = 0;
    let newBadges: { id: string; xpAwarded: number }[] = [];
    let packJustCompleted = false;

    if (!alreadyAnswered) {
      const answers = progress.answers ?? [];
      answers.push({
        activityId,
        selectedAnswer: storedAnswer,
        correct,
        answeredAt: new Date(),
      });
      progress.answers = answers;
      progress.completedActivityIds.push(activityId);

      if (!correct) {
        const mistakes = progress.mistakes ?? [];
        const existingMistake = mistakes.find((m) => m.activityId === activityId);
        if (existingMistake) existingMistake.count += 1;
        else mistakes.push({ activityId, count: 1 });
        progress.mistakes = mistakes;
      }

      if (
        progress.completedActivityIds.length >= pack.activities.length &&
        !progress.completedAt
      ) {
        progress.completedAt = new Date();
        packJustCompleted = true;
      }

      if (packJustCompleted) {
        const settings = await LearningPackSettings.findOne({
          familyId: kid.familyId,
          packId,
        });
        pointsAwarded = packCompletionPoints(pack, settings?.pointsPerActivity);
        progress.totalPointsEarned += pointsAwarded;

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
          `${packId}:complete`
        );
        newBadges = badges.map((b) => ({ id: b.id, xpAwarded: b.xpAwarded }));
      }

      await progress.save();

      if (packJustCompleted) {
        const { completeHomeworkForPack } = await import('../services/homework');
        await completeHomeworkForPack(kid._id.toString(), kid.familyId.toString(), packId);
      }
    }

    const packCompleted =
      progress.completedActivityIds.length >= pack.activities.length && !!progress.completedAt;

    res.json({
      submitted: true,
      alreadyAnswered,
      packCompleted,
      points: kid.points,
      level: kid.level,
      xp: kid.xp,
      learningStreak: kid.learningStreak ?? 0,
      newBadges: newBadges.length ? newBadges : undefined,
      packPointsEarned: packJustCompleted ? pointsAwarded : undefined,
      correct,
      correctOptionId: activity.type === 'multiple_choice' ? activity.answer : undefined,
      correctOptionIds: activity.type === 'select_all' ? [...activity.answer] : undefined,
      acceptedWords: activity.type === 'open_words' ? canonicalOpenWords(activity.accept) : undefined,
      explanation: activity.explanation,
      pointsAwarded,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשמירת תשובה' });
  }
});

router.get('/results', authenticate, requireParent, async (req: Request, res: Response) => {
  try {
    const kidId = req.query.kidId as string;
    if (!kidId) return res.status(400).json({ error: 'חסר מזהה ילד' });

    const kid = await ensureKidAccess(req, res, kidId);
    if (!kid) return;

    const progressList = await LearningProgress.find({
      kidId,
      familyId: req.user!.familyId,
      'answers.0': { $exists: true },
    }).sort({ updatedAt: -1 });

    const results: Array<{
      packId: string;
      packTitle: string;
      activityId: string;
      questionPreview: string;
      options: { id: string; text: string }[];
      selectedAnswer: string;
      selectedText: string;
      correctAnswer: string;
      correctText: string;
      correct: boolean;
      answeredAt: string;
      kind?: string;
      category?: string;
      explanationHe?: string;
      passageHe?: string;
      passageTitleHe?: string;
    }> = [];

    for (const progress of progressList) {
      const pack = await getLearningPackForFamily(progress.packId, req.user!.familyId);
      for (const ans of progress.answers || []) {
        const activity = pack?.activities.find((a) => a.id === ans.activityId);
        if (!activity) continue;

        let options: { id: string; text: string }[] = [];
        let selectedText = ans.selectedAnswer;
        let correctAnswer = '';
        let correctText = '';

        if (activity.type === 'multiple_choice') {
          options = activity.options.map((o) => ({ id: o.id, text: o.text }));
          selectedText = activity.options.find((o) => o.id === ans.selectedAnswer)?.text || ans.selectedAnswer;
          correctAnswer = activity.answer;
          correctText = activity.options.find((o) => o.id === activity.answer)?.text || activity.answer;
        } else if (activity.type === 'select_all') {
          options = activity.options.map((o) => ({ id: o.id, text: o.text }));
          const selectedIds = normalizeSelectAllIds(ans.selectedAnswer);
          selectedText = selectedIds
            .map((id) => activity.options.find((o) => o.id === id)?.text || id)
            .join(' · ');
          correctAnswer = activity.answer.join(',');
          correctText = activity.answer
            .map((id) => activity.options.find((o) => o.id === id)?.text || id)
            .join(' · ');
        } else if (activity.type === 'open_words') {
          selectedText = parseOpenWordList(ans.selectedAnswer).join(' · ');
          correctAnswer = activity.accept.join(',');
          correctText = canonicalOpenWords(activity.accept).join(' · ');
        } else if (activity.type === 'fill_blank') {
          correctAnswer = activity.answer.join(' / ');
          correctText = correctAnswer;
        } else {
          correctAnswer = activity.answer.text;
          correctText = activity.answer.text;
        }

        results.push({
          packId: progress.packId,
          packTitle: pack?.title.he || progress.packId,
          activityId: ans.activityId,
          questionPreview: activity.prompt.text.slice(0, 160),
          options,
          selectedAnswer: ans.selectedAnswer,
          selectedText,
          correctAnswer,
          correctText,
          correct: ans.correct,
          answeredAt:
            ans.answeredAt instanceof Date
              ? ans.answeredAt.toISOString()
              : new Date(ans.answeredAt).toISOString(),
          kind: pack ? resolvePackKind(pack.kind) : undefined,
          category: pack?.category,
          explanationHe: activity.explanation?.he,
          passageHe: pack?.passage?.he,
          passageTitleHe: pack?.passageTitle?.he,
        });
      }
    }

    results.sort((a, b) => (a.answeredAt < b.answeredAt ? 1 : -1));
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת תוצאות לימוד' });
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
      const pack = await getLearningPackForFamily(progress.packId, req.user!.familyId);
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
