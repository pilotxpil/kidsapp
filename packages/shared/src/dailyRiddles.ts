export const DAILY_RIDDLE_POINTS = 15;

export type DailyRiddlePlayStatus = 'open' | 'won' | 'missed' | 'appealed';

/** Kid asked a parent to accept an answer that was right, but not the exact wording. */
export type DailyRiddleAppeal = 'pending' | 'rejected';

export type DailyRiddleCat = 'pic' | 'odd' | 'idiom' | 'math' | 'logic' | 'word';

/** Each kid gets one riddle per track per day. */
export type RiddleTrack = 'math' | 'language';
export const RIDDLE_TRACKS: RiddleTrack[] = ['math', 'language'];
export const RIDDLE_TRACK_LABELS: Record<RiddleTrack, string> = { math: 'חידת חשבון', language: 'חידת שפה' };

export type RiddleVisualPart = {
  text: string;
  size?: 's' | 'm' | 'l';
};

export type RiddleVisual =
  | { kind: 'grid3' }
  | { kind: 'triangles' }
  | { kind: 'row'; parts: RiddleVisualPart[] }
  | { kind: 'stack'; parts: RiddleVisualPart[] }
  | { kind: 'bag'; emoji: string }
  | { kind: 'forest'; hidden: string }
  /** An uploaded picture, served at /app/images/:id. `ratio` = width / height. Apps from 2.3.1. */
  | { kind: 'image'; id: string; ratio?: number; alt?: string };

/** First app version that can show `{ kind: 'image' }`; older apps draw unknown kinds as the forest. */
export const RIDDLE_IMAGE_MIN_APP_VERSION = '2.3.1';

export interface DailyRiddleEntry {
  id: string;
  track: RiddleTrack;
  cat: DailyRiddleCat;
  /** Optional grade range (1–6) the riddle suits. */
  minGrade?: number;
  maxGrade?: number;
  prompt: string;
  extra?: string;
  visual?: RiddleVisual;
  hint: string;
  answer: string;
  alts?: string[];
  why: string;
  choices: string[];
}

export interface KidDailyRiddle {
  date: string;
  /** Which of today's riddles this is. Absent from API builds before 2.2 (treat as 'math'). */
  slot?: RiddleTrack;
  id: string;
  cat: DailyRiddleCat;
  prompt: string;
  extra?: string;
  visual?: RiddleVisual;
  choices: string[];
  points: number;
  status: DailyRiddlePlayStatus;
  attempts: number;
  /** The answer the kid submitted, once the riddle is no longer open. */
  guess?: string;
  /** Set when the kid appealed a miss, until a parent accepts it (then status is won). */
  appeal?: DailyRiddleAppeal;
  hint?: string;
  why?: string;
  answer?: string;
}

export interface ParentDailyRiddleKid {
  kidId: string;
  date: string;
  slot?: RiddleTrack;
  id: string;
  cat: DailyRiddleCat;
  prompt: string;
  extra?: string;
  visual?: RiddleVisual;
  points: number;
  status: DailyRiddlePlayStatus;
  kid?: { displayName: string; avatar: string };
  /** Kid's submitted answer, present on an appeal. */
  guess?: string;
  appeal?: DailyRiddleAppeal;
  why?: string;
  answer?: string;
}

export function normalizeRiddleGuess(value: string): string {
  return value
    .trim()
    .replace(/[״"׳'`]/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function riddleGuessMatches(entry: DailyRiddleEntry, guess: string): boolean {
  const normalized = normalizeRiddleGuess(guess);
  if (!normalized) return false;
  const answers = [entry.answer, ...(entry.alts ?? [])].map(normalizeRiddleGuess);
  return answers.includes(normalized);
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const arr = [...items];
  let s = seed >>> 0 || 1;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const current = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = current as T;
  }
  return arr;
}

/**
 * Riddle content lives in the database (collection `contentriddles`, managed through the admin API).
 * Seed files: content/riddles/*.json at the repo root.
 */
