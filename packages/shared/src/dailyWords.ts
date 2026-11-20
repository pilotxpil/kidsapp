export const DAILY_WORD_POINTS = 25;

export type DailyWordPlayStatus = 'open' | 'won';

export interface DailyWordEntry {
  id: string;
  word: string;
  minGrade?: number;
  maxGrade?: number;
  /** Short dictionary meaning a kid can understand. */
  definition: string;
  /** Spoken-style example that uses the word. */
  hint: string;
}

export interface KidDailyWord {
  date: string;
  word: string;
  definition: string;
  hint: string;
  points: number;
  status: DailyWordPlayStatus;
}

export interface ParentDailyWordKid {
  kidId: string;
  date: string;
  word: string;
  definition: string;
  hint: string;
  points: number;
  status: DailyWordPlayStatus;
  kid?: { displayName: string; avatar: string };
}

/**
 * Word content lives in the database (collection `contentwords`, managed through the admin API).
 * Seed files: content/words/*.json at the repo root.
 */
