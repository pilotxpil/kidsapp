/**
 * Learning content (daily riddles, daily words, built-in learning packs) lives in MongoDB.
 * This module keeps an in-memory snapshot so request handlers stay synchronous and fast.
 * The API runs as a single pm2 instance, so admin writes call reloadContent() directly;
 * a periodic refresh also picks up edits made straight in the database.
 */
import type { DailyRiddleEntry, DailyWordEntry, LearningPack, RiddleTrack } from '@kidsapp/shared';
import { ContentRiddle } from '../models/ContentRiddle';
import { ContentWord } from '../models/ContentWord';
import { ContentPack } from '../models/ContentPack';

type Snapshot = {
  riddles: DailyRiddleEntry[];
  riddleById: Map<string, DailyRiddleEntry>;
  words: DailyWordEntry[];
  wordById: Map<string, DailyWordEntry>;
  packs: LearningPack[];
  packById: Map<string, LearningPack>;
  loadedAt: number;
};

let snap: Snapshot = {
  riddles: [],
  riddleById: new Map(),
  words: [],
  wordById: new Map(),
  packs: [],
  packById: new Map(),
  loadedAt: 0,
};
let timer: NodeJS.Timeout | null = null;

function toRiddle(d: InstanceType<typeof ContentRiddle>): DailyRiddleEntry {
  return {
    id: d.riddleId,
    track: d.track,
    cat: d.cat,
    prompt: d.prompt,
    ...(d.extra ? { extra: d.extra } : {}),
    ...(d.visual ? { visual: d.visual } : {}),
    hint: d.hint,
    answer: d.answer,
    ...(d.alts?.length ? { alts: d.alts } : {}),
    why: d.why,
    choices: d.choices,
    ...(d.minGrade ? { minGrade: d.minGrade } : {}),
    ...(d.maxGrade ? { maxGrade: d.maxGrade } : {}),
  };
}

function toWord(d: InstanceType<typeof ContentWord>): DailyWordEntry {
  return {
    id: d.wordId,
    word: d.word,
    definition: d.definition,
    hint: d.hint,
    ...(d.minGrade ? { minGrade: d.minGrade } : {}),
    ...(d.maxGrade ? { maxGrade: d.maxGrade } : {}),
  };
}

export async function reloadContent(): Promise<void> {
  const { parseLearningPack, sortPacks } = await import('./learningPacks');
  const [riddleDocs, wordDocs, packDocs] = await Promise.all([
    ContentRiddle.find({}),
    ContentWord.find({}),
    ContentPack.find({}),
  ]);
  const riddleById = new Map(riddleDocs.map((d) => [d.riddleId, toRiddle(d)]));
  const wordById = new Map(wordDocs.map((d) => [d.wordId, toWord(d)]));
  const packById = new Map<string, LearningPack>();
  const activePacks: LearningPack[] = [];
  for (const d of packDocs) {
    const pack = parseLearningPack(d.data);
    if (!pack) {
      console.warn(`content: invalid pack in DB skipped: ${d.packId}`);
      continue;
    }
    packById.set(d.packId, pack);
    if (d.active) activePacks.push(pack);
  }
  snap = {
    riddles: riddleDocs.filter((d) => d.active).map((d) => riddleById.get(d.riddleId)!),
    riddleById,
    words: wordDocs.filter((d) => d.active).map((d) => wordById.get(d.wordId)!),
    wordById,
    packs: sortPacks(activePacks),
    packById,
    loadedAt: Date.now(),
  };
}

export async function startContentStore(refreshMs = 120_000): Promise<void> {
  await reloadContent();
  const s = contentStats();
  console.log(`content: ${s.riddles.math}+${s.riddles.language} riddles, ${s.words} words, ${s.packs} packs`);
  if (timer) clearInterval(timer);
  timer = setInterval(() => void reloadContent().catch((e) => console.error('content reload', e)), refreshMs);
  timer.unref?.();
}

/** Active riddles of a track that fit the kid's grade (riddles without a grade range fit everyone). */
export function riddlesFor(track: RiddleTrack, grade?: number | null): DailyRiddleEntry[] {
  const all = snap.riddles.filter((r) => r.track === track);
  if (!grade) return all;
  const fit = all.filter((r) => (!r.minGrade || grade >= r.minGrade) && (!r.maxGrade || grade <= r.maxGrade));
  return fit.length ? fit : all;
}

/** Includes deactivated riddles so a kid's already-pinned riddle still resolves. */
export function riddleById(id: string): DailyRiddleEntry | undefined {
  return snap.riddleById.get(id);
}

export function wordsFor(grade?: number | null): DailyWordEntry[] {
  if (!grade) return snap.words;
  const fit = snap.words.filter((w) => (!w.minGrade || grade >= w.minGrade) && (!w.maxGrade || grade <= w.maxGrade));
  return fit.length ? fit : snap.words;
}

export function wordById(id: string): DailyWordEntry | undefined {
  return snap.wordById.get(id);
}

export function activePacks(): LearningPack[] {
  return snap.packs;
}

/** Includes deactivated packs (progress history still resolves). */
export function packById(id: string): LearningPack | undefined {
  return snap.packById.get(id);
}

export function isActivePack(id: string): boolean {
  return snap.packs.some((p) => p.id === id);
}

export function contentStats() {
  return {
    riddles: {
      math: snap.riddles.filter((r) => r.track === 'math').length,
      language: snap.riddles.filter((r) => r.track === 'language').length,
    },
    words: snap.words.length,
    packs: snap.packs.length,
    loadedAt: new Date(snap.loadedAt).toISOString(),
  };
}
