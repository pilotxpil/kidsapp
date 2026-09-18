export type LearningDifficulty = 'easy' | 'medium' | 'hard';

export const LEARNING_DIFFICULTIES: LearningDifficulty[] = ['easy', 'medium', 'hard'];

export const LEARNING_DIFFICULTY_LABELS: Record<LearningDifficulty, string> = {
  easy: 'קל',
  medium: 'בינוני',
  hard: 'קשה',
};

export type LearningCategory = 'language' | 'math' | 'english' | 'science' | 'general';

/** @deprecated Use LearningCategory */
export type LearningSubject = LearningCategory;

export type ActivityType = 'multiple_choice' | 'fill_blank' | 'flashcard';

export interface LocalizedText {
  he: string;
  en?: string;
}

export interface ActivityPrompt {
  text: string;
  image?: string;
  audio?: string;
}

export interface ActivityOption {
  id: string;
  text: string;
}

export interface MultipleChoiceActivity {
  id: string;
  type: 'multiple_choice';
  prompt: ActivityPrompt;
  options: ActivityOption[];
  answer: string;
  explanation?: LocalizedText;
  points?: number;
}

export interface FillBlankActivity {
  id: string;
  type: 'fill_blank';
  prompt: ActivityPrompt;
  answer: string[];
  explanation?: LocalizedText;
  points?: number;
}

export interface FlashcardActivity {
  id: string;
  type: 'flashcard';
  prompt: ActivityPrompt;
  answer: ActivityPrompt;
  explanation?: LocalizedText;
  points?: number;
}

export type LearningActivity = MultipleChoiceActivity | FillBlankActivity | FlashcardActivity;

export interface LearningPack {
  id: string;
  version: number;
  /** Display name inside the category, e.g. "Multiply by 12" or "The Tale of the Fox" */
  title: LocalizedText;
  category: LearningCategory;
  /** @deprecated Use category */
  subject?: LearningCategory;
  grade?: number;
  tags?: string[];
  defaultPoints: number;
  activities: LearningActivity[];
}

/** Pack metadata + progress — no answers. */
export interface LearningPackSummary {
  id: string;
  title: LocalizedText;
  category: LearningCategory;
  grade?: number;
  tags: string[];
  activityCount: number;
  defaultPoints: number;
  /** Effective points per activity (family override or pack default). */
  pointsPerActivity: number;
  difficulty: LearningDifficulty;
  completedCount: number;
  completed: boolean;
}

/** Full catalog entry for parents (no kid progress). */
export interface LearningCatalogItem {
  id: string;
  title: LocalizedText;
  category: LearningCategory;
  grade?: number;
  tags: string[];
  activityCount: number;
  defaultPoints: number;
  /** Family override — points awarded per correct activity. */
  pointsPerActivity?: number;
  difficulty?: LearningDifficulty;
  assignedKidIds: string[];
}

export interface LearningPackSettings {
  packId: string;
  pointsPerActivity: number;
  difficulty: LearningDifficulty;
}

export interface LearningCatalogFilters {
  search?: string;
  category?: LearningCategory;
  grade?: number;
}

export interface LearningAssignment {
  _id: string;
  packId: string;
  kidId: string;
  familyId: string;
  assignedBy: string;
  createdAt: string;
}

/** Activity sent to client — answers stripped. */
export interface PublicLearningActivity {
  id: string;
  type: ActivityType;
  prompt: ActivityPrompt;
  options?: ActivityOption[];
  points?: number;
}

export interface LearningPackDetail {
  pack: {
    id: string;
    title: LocalizedText;
    category: LearningCategory;
    grade?: number;
    defaultPoints: number;
    pointsPerActivity: number;
    difficulty: LearningDifficulty;
    activities: PublicLearningActivity[];
  };
  completedActivityIds: string[];
  completed: boolean;
}

export interface LearningCheckResult {
  correct: boolean;
  correctOptionId?: string;
  explanation?: LocalizedText;
  pointsAwarded: number;
  alreadyCompleted: boolean;
  points: number;
  level: number;
  xp: number;
  newBadges?: { id: string; xpAwarded: number }[];
  packCompleted: boolean;
}

export const LEARNING_CATEGORIES: Record<
  LearningCategory,
  { label: string; icon: string; order: number }
> = {
  language: { label: 'עברית', icon: '🇮🇱', order: 0 },
  math: { label: 'חשבון', icon: '🔢', order: 1 },
  english: { label: 'אנגלית', icon: '🇬🇧', order: 2 },
  science: { label: 'מדעים', icon: '🔬', order: 3 },
  general: { label: 'כללי', icon: '📚', order: 4 },
};

/** @deprecated Use LEARNING_CATEGORIES */
export const LEARNING_SUBJECTS: Record<LearningCategory, { label: string; icon: string }> =
  Object.fromEntries(
    Object.entries(LEARNING_CATEGORIES).map(([k, v]) => [k, { label: v.label, icon: v.icon }])
  ) as Record<LearningCategory, { label: string; icon: string }>;

export const LEARNING_CATEGORY_ORDER: LearningCategory[] = (
  Object.entries(LEARNING_CATEGORIES) as [LearningCategory, { order: number }][]
)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([id]) => id);

export const LEARNING_PACK_VERSION = 1 as const;

/** Israeli elementary grades: 1=א … 6=ו (stored as numbers in pack JSON). */
export const GRADE_LETTERS: Record<number, string> = {
  1: 'א',
  2: 'ב',
  3: 'ג',
  4: 'ד',
  5: 'ה',
  6: 'ו',
};

export const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

/** Display grade as Hebrew letter (e.g. 2 → "ב"). Falls back to the number. */
export function formatGrade(grade: number | null | undefined): string {
  if (grade == null || !Number.isFinite(grade)) return '';
  return GRADE_LETTERS[grade] ?? String(grade);
}

/** Label like "כיתה ב". */
export function formatGradeLabel(grade: number | null | undefined, gradeWord = 'כיתה'): string {
  const letter = formatGrade(grade);
  if (!letter) return '';
  return `${gradeWord} ${letter}`;
}

/** Primary label for a pack in lists (Hebrew UI by default). */
export function packDisplayTitle(title: LocalizedText, locale: 'en' | 'he' = 'he'): string {
  if (locale === 'en') return title.en || title.he;
  return title.he;
}

/** Optional secondary label — unused in Hebrew UI (kept for API compatibility). */
export function packDisplaySubtitle(_title: LocalizedText): string | undefined {
  return undefined;
}
