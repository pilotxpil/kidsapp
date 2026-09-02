import fs from 'fs';
import path from 'path';
import type {
  LearningPack,
  LearningActivity,
  PublicLearningActivity,
  LearningPackSummary,
} from '@kidsapp/shared';
import { LEARNING_CATEGORIES, LEARNING_CATEGORY_ORDER } from '@kidsapp/shared';
import type { LearningCategory, LearningCatalogFilters } from '@kidsapp/shared';
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

function validatePack(raw: unknown): LearningPack | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;

  if (typeof p.id !== 'string' || !p.id) return null;
  if (p.version !== 1) return null;
  if (!p.title || typeof (p.title as { he?: string }).he !== 'string') return null;
  const category = resolveCategory(p);
  if (!category) return null;
  if (typeof p.defaultPoints !== 'number' || p.defaultPoints < 1) return null;
  if (!Array.isArray(p.activities) || p.activities.length === 0) return null;

  for (const act of p.activities) {
    if (!act || typeof act !== 'object') return null;
    const a = act as Record<string, unknown>;
    if (typeof a.id !== 'string' || !a.id) return null;
    if (a.type !== 'multiple_choice') return null;
    if (!a.prompt || typeof (a.prompt as { text?: string }).text !== 'string') return null;
    if (!Array.isArray(a.options) || a.options.length < 2) return null;
    if (typeof a.answer !== 'string' || !a.answer) return null;
  }

  const normalized = { ...(p as object), category } as LearningPack;
  return normalized;
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

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
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

export function toPublicActivity(activity: LearningActivity): PublicLearningActivity {
  if (activity.type === 'multiple_choice') {
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
  return {
    id: activity.id,
    type: activity.type,
    prompt: activity.prompt,
    points: activity.points,
  };
}

export function packToSummary(
  pack: LearningPack,
  progress?: ILearningProgress | null
): LearningPackSummary {
  const completedIds = progress?.completedActivityIds ?? [];
  const completed = completedIds.length >= pack.activities.length;
  return {
    id: pack.id,
    title: pack.title,
    category: pack.category,
    grade: pack.grade,
    tags: pack.tags ?? [],
    activityCount: pack.activities.length,
    defaultPoints: pack.defaultPoints,
    completedCount: completedIds.length,
    completed,
  };
}

export function checkAnswer(activity: LearningActivity, answer: string): boolean {
  if (activity.type === 'multiple_choice') {
    return activity.answer === answer;
  }
  if (activity.type === 'fill_blank') {
    const normalized = answer.trim().toLowerCase();
    return activity.answer.some((a) => a.trim().toLowerCase() === normalized);
  }
  if (activity.type === 'flashcard') {
    const normalized = answer.trim().toLowerCase();
    return activity.answer.text.trim().toLowerCase() === normalized;
  }
  return false;
}

export function activityPoints(pack: LearningPack, activity: LearningActivity): number {
  return activity.points ?? pack.defaultPoints;
}

export function filterCatalogPacks(
  packs: LearningPack[],
  filters: LearningCatalogFilters
): LearningPack[] {
  let result = packs;

  if (filters.category) {
    result = result.filter((p) => p.category === filters.category);
  }

  if (filters.grade != null && !Number.isNaN(filters.grade)) {
    result = result.filter((p) => p.grade === filters.grade);
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
  assignedKidIds: string[] = []
) {
  return {
    id: pack.id,
    title: pack.title,
    category: pack.category,
    grade: pack.grade,
    tags: pack.tags ?? [],
    activityCount: pack.activities.length,
    defaultPoints: pack.defaultPoints,
    assignedKidIds,
  };
}
