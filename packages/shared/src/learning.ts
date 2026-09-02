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
  version: 1;
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
  assignedKidIds: string[];
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
  language: { label: 'שפה', icon: '🇮🇱', order: 0 },
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

/** Primary label for a pack in lists (prefers English title when set). */
export function packDisplayTitle(title: LocalizedText, locale: 'en' | 'he' = 'en'): string {
  if (locale === 'he') return title.he;
  return title.en || title.he;
}

export function packDisplaySubtitle(title: LocalizedText): string | undefined {
  if (title.en && title.he !== title.en) return title.he;
  return undefined;
}
