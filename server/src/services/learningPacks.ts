import fs from 'fs';
import path from 'path';
import type {
  LearningPack,
  LearningActivity,
  PublicLearningActivity,
  LearningPackSummary,
} from '@kidsapp/shared';
import { LEARNING_CATEGORIES, LEARNING_CATEGORY_ORDER, resolvePackKind, selectAllMatches, openWordsMatch, openWordGroups } from '@kidsapp/shared';
import type { LearningCategory, LearningCatalogFilters, LearningDifficulty } from '@kidsapp/shared';
import { ILearningProgress } from '../models/LearningProgress';

const CATEGORIES = new Set<string>(Object.keys(LEARNING_CATEGORIES));

/** Map legacy category values from older pack files. */
const LEGACY_CATEGORY: Record<string, LearningCategory> = {
  hebrew: 'language',
  stories: 'english',
  language: 'language',
  math: 'math',
  english: 'english',
  science: 'science',
  general: 'general',
};

function resolveCategory(p: Record<string, unknown>): LearningCategory | null {
  const raw = (p.category ?? p.subject) as string | undefined;
  if (typeof raw !== 'string') return null;
  const mapped = LEGACY_CATEGORY[raw];
  if (!mapped || !CATEGORIES.has(mapped)) return null;
  return mapped;
}

function categorySortIndex(category: LearningCategory): number {
  const idx = LEARNING_CATEGORY_ORDER.indexOf(category);
  return idx >= 0 ? idx : 99;
}

function packsDir(): string {
  return path.resolve(__dirname, '../../../content/packs');
}

/** Parse & validate a pack JSON object (built-in files or parent import). */
export function parseLearningPack(raw: unknown): LearningPack | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;

  if (typeof p.id !== 'string' || !p.id) return null;
  if (typeof p.version !== 'number' || p.version < 1) {
    // Allow omitting version on import — treat as 1
    if (p.version !== undefined) return null;
  }
  if (!p.title || typeof (p.title as { he?: string }).he !== 'string') return null;
  const category = resolveCategory(p);
  if (!category) return null;
  if (typeof p.defaultPoints !== 'number' || p.defaultPoints < 1) return null;
  if (!Array.isArray(p.activities) || p.activities.length === 0) return null;

  const kind = resolvePackKind(typeof p.kind === 'string' ? p.kind : undefined);
  if (kind === 'reading') {
    const passage = p.passage as { he?: string } | undefined;
    if (!passage || typeof passage.he !== 'string' || !passage.he.trim()) return null;
  }

  for (const act of p.activities) {
    if (!act || typeof act !== 'object') return null;
    const a = act as Record<string, unknown>;
    if (typeof a.id !== 'string' || !a.id) return null;
    if (!a.prompt || typeof (a.prompt as { text?: string }).text !== 'string') return null;
    if (a.type === 'multiple_choice') {
      if (!Array.isArray(a.options) || a.options.length < 2) return null;
      if (typeof a.answer !== 'string' || !a.answer) return null;
      const opts = a.options as { id?: string }[];
      if (!opts.some((o) => o && o.id === a.answer)) return null;
    } else if (a.type === 'select_all') {
      if (!Array.isArray(a.options) || a.options.length < 3) return null;
      if (!Array.isArray(a.answer) || a.answer.length < 2) return null;
      const optIds = new Set(
        (a.options as { id?: string }[]).map((o) => o?.id).filter((id): id is string => !!id)
      );
      const answers = (a.answer as unknown[]).filter((id): id is string => typeof id === 'string' && !!id);
      if (answers.length < 2) return null;
      if (!answers.every((id) => optIds.has(id))) return null;
      if (answers.length >= optIds.size) return null;
    } else if (a.type === 'open_words') {
      if (!Array.isArray(a.accept) || a.accept.length < 1) return null;
      const accept = (a.accept as unknown[]).filter((w): w is string => typeof w === 'string' && !!w.trim());
      const count = typeof a.count === 'number' ? a.count : Number(a.count);
      if (!Number.isInteger(count) || count < 1 || count > 8) return null;
      if (openWordGroups(accept).length < count) return null;
    } else {
      return null;
    }
  }

  const version = typeof p.version === 'number' && p.version >= 1 ? p.version : 1;
  return {
    ...(p as object),
    version,
    category,
    kind,
  } as LearningPack;
}

function validatePack(raw: unknown): LearningPack | null {
  return parseLearningPack(raw);
}

let cachedPacks: LearningPack[] | null = null;

export function loadLearningPacks(): LearningPack[] {
  if (cachedPacks) return cachedPacks;

  const dir = packsDir();
  if (!fs.existsSync(dir)) {
    console.warn(`Learning packs directory not found: ${dir}`);
    cachedPacks = [];
    return cachedPacks;
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('._'));
  const packs: LearningPack[] = [];

  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
      const pack = validatePack(raw);
      if (pack) {
        packs.push(pack);
      } else {
        console.warn(`Invalid learning pack skipped: ${file}`);
      }
    } catch (err) {
      console.warn(`Failed to load learning pack ${file}:`, err);
    }
  }

  packs.sort((a, b) => {
    const cat = categorySortIndex(a.category) - categorySortIndex(b.category);
    if (cat !== 0) return cat;
    return a.title.he.localeCompare(b.title.he, 'he');
  });
  cachedPacks = packs;
  console.log(`Loaded ${packs.length} learning pack(s)`);
  return packs;
}

export function getLearningPack(packId: string): LearningPack | undefined {
  return loadLearningPacks().find((p) => p.id === packId);
}

export function familyDocToPack(doc: {
  packId: string;
  version: number;
  title: LearningPack['title'];
  category: LearningPack['category'];
  kind?: LearningPack['kind'];
  passage?: LearningPack['passage'];
  passageTitle?: LearningPack['passageTitle'];
  grade?: number;
  tags?: string[];
  defaultPoints: number;
  activities: unknown;
}): LearningPack {
  return {
    id: doc.packId,
    version: doc.version || 1,
    title: doc.title,
    category: doc.category,
    kind: resolvePackKind(doc.kind),
    passage: doc.passage,
    passageTitle: doc.passageTitle,
    grade: doc.grade,
    tags: doc.tags ?? [],
    defaultPoints: doc.defaultPoints,
    activities: doc.activities as LearningPack['activities'],
  };
}

export async function getLearningPackForFamily(
  packId: string,
  familyId: string
): Promise<LearningPack | undefined> {
  const { FamilyHiddenLearningPack } = await import('../models/FamilyHiddenLearningPack');
  const hidden = await FamilyHiddenLearningPack.findOne({ familyId, packId }).lean();
  if (hidden) return undefined;

  const { FamilyLearningPack } = await import('../models/FamilyLearningPack');
  const doc = await FamilyLearningPack.findOne({ familyId, packId });
  if (doc) return familyDocToPack(doc);
  return getLearningPack(packId);
}

export async function loadFamilyCustomPacks(familyId: string): Promise<LearningPack[]> {
  const { FamilyLearningPack } = await import('../models/FamilyLearningPack');
  const rows = await FamilyLearningPack.find({ familyId });
  return rows.map((doc) => familyDocToPack(doc));
}

export async function loadAllPacksForFamily(familyId: string): Promise<LearningPack[]> {
  const { FamilyHiddenLearningPack } = await import('../models/FamilyHiddenLearningPack');
  const hiddenRows = await FamilyHiddenLearningPack.find({ familyId }).select('packId').lean();
  const hidden = new Set(hiddenRows.map((r) => r.packId));

  const builtin = loadLearningPacks().filter((p) => !hidden.has(p.id));
  const custom = (await loadFamilyCustomPacks(familyId)).filter((p) => !hidden.has(p.id));
  const byId = new Map<string, LearningPack>();
  for (const p of builtin) byId.set(p.id, p);
  for (const p of custom) byId.set(p.id, p);
  return Array.from(byId.values()).sort((a, b) => {
    const cat = categorySortIndex(a.category) - categorySortIndex(b.category);
    if (cat !== 0) return cat;
    return a.title.he.localeCompare(b.title.he, 'he');
  });
}

export function toPublicActivity(activity: LearningActivity): PublicLearningActivity {
  if (activity.type === 'multiple_choice' || activity.type === 'select_all') {
    return {
      id: activity.id,
      type: activity.type,
      prompt: activity.prompt,
      options: activity.options,
      points: activity.points,
    };
  }
  if (activity.type === 'fill_blank') {
    return {
      id: activity.id,
      type: activity.type,
      prompt: activity.prompt,
      points: activity.points,
    };
  }
  if (activity.type === 'open_words') {
    return {
      id: activity.id,
      type: activity.type,
      prompt: activity.prompt,
      count: activity.count,
      points: activity.points,
    };
  }
  return {
    id: activity.id,
    type: activity.type,
    prompt: activity.prompt,
    points: activity.points,
  };
}

export function packToSummary(
  pack: LearningPack,
  progress?: ILearningProgress | null,
  settings?: { pointsPerActivity?: number; difficulty?: LearningDifficulty } | null
): LearningPackSummary {
  const completedIds = progress?.completedActivityIds ?? [];
  const completed = completedIds.length >= pack.activities.length;
  return {
    id: pack.id,
    title: pack.title,
    category: pack.category,
    kind: resolvePackKind(pack.kind),
    grade: pack.grade,
    tags: pack.tags ?? [],
    activityCount: pack.activities.length,
    defaultPoints: pack.defaultPoints,
    pointsPerActivity: settings?.pointsPerActivity ?? pack.defaultPoints,
    difficulty: settings?.difficulty ?? 'medium',
    completedCount: completedIds.length,
    completed,
    isCustom: pack.id.startsWith('custom_'),
  };
}

export function checkAnswer(activity: LearningActivity, answer: string | string[]): boolean {
  if (activity.type === 'multiple_choice') {
    const given = Array.isArray(answer) ? answer[0] : answer;
    return activity.answer === given;
  }
  if (activity.type === 'select_all') {
    return selectAllMatches(activity.answer, answer);
  }
  if (activity.type === 'open_words') {
    return openWordsMatch(activity.accept, answer, activity.count);
  }
  if (activity.type === 'fill_blank') {
    const given = Array.isArray(answer) ? String(answer[0] ?? '') : answer;
    const normalized = given.trim().toLowerCase();
    return activity.answer.some((a) => a.trim().toLowerCase() === normalized);
  }
  if (activity.type === 'flashcard') {
    const given = Array.isArray(answer) ? String(answer[0] ?? '') : answer;
    const normalized = given.trim().toLowerCase();
    return activity.answer.text.trim().toLowerCase() === normalized;
  }
  return false;
}

/** Points for finishing the whole pack — not per question, not based on score. */
export function packCompletionPoints(
  pack: LearningPack,
  pointsOverride?: number | null
): number {
  if (typeof pointsOverride === 'number' && pointsOverride >= 1) {
    return pointsOverride;
  }
  return pack.defaultPoints;
}

/** @deprecated Use packCompletionPoints. */
export function activityPoints(
  pack: LearningPack,
  _activity: LearningActivity,
  pointsOverride?: number | null
): number {
  return packCompletionPoints(pack, pointsOverride);
}

export function filterCatalogPacks(
  packs: LearningPack[],
  filters: LearningCatalogFilters
): LearningPack[] {
  let result = packs;

  if (filters.category) {
    result = result.filter((p) => p.category === filters.category);
  }

  const grades =
    filters.grades?.filter((g) => Number.isFinite(g)) ??
    (filters.grade != null && !Number.isNaN(filters.grade) ? [filters.grade] : undefined);
  if (grades && grades.length > 0) {
    const allowed = new Set(grades);
    result = result.filter((p) => p.grade != null && allowed.has(p.grade));
  }

  const search = filters.search?.trim().toLowerCase();
  if (search) {
    result = result.filter(
      (p) =>
        p.title.he.toLowerCase().includes(search) ||
        (p.title.en?.toLowerCase().includes(search) ?? false) ||
        p.id.toLowerCase().includes(search) ||
        (p.tags ?? []).some((tag) => tag.toLowerCase().includes(search))
    );
  }

  return result;
}

export function packToCatalogItem(
  pack: LearningPack,
  assignedKidIds: string[] = [],
  settings?: { pointsPerActivity?: number; difficulty?: LearningDifficulty } | null,
  completedKidIds: string[] = [],
  pastKidIds: string[] = []
) {
  return {
    id: pack.id,
    title: pack.title,
    category: pack.category,
    kind: resolvePackKind(pack.kind),
    grade: pack.grade,
    tags: pack.tags ?? [],
    activityCount: pack.activities.length,
    defaultPoints: pack.defaultPoints,
    pointsPerActivity: settings?.pointsPerActivity,
    difficulty: settings?.difficulty,
    assignedKidIds,
    completedKidIds,
    pastKidIds,
    isCustom: pack.id.startsWith('custom_'),
  };
}
