/**
 * Validation for content written through the admin API (riddles and daily words).
 * Learning packs are validated by parseLearningPack in learningPacks.ts.
 */
import type { DailyRiddleCat, DailyRiddleEntry, DailyWordEntry, RiddleTrack, RiddleVisual } from '@kidsapp/shared';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const CATS: DailyRiddleCat[] = ['pic', 'odd', 'idiom', 'math', 'logic', 'word'];
const ID_RE = /^[a-z0-9][a-z0-9_-]{1,63}$/;

function str(v: unknown, max = 600): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s && s.length <= max ? s : null;
}

function grade(v: unknown): number | undefined | null {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : null;
}

function gradeRange(raw: Record<string, unknown>): Result<{ minGrade?: number; maxGrade?: number }> {
  const minGrade = grade(raw.minGrade);
  const maxGrade = grade(raw.maxGrade);
  if (minGrade === null || maxGrade === null) return { ok: false, error: 'כיתה חייבת להיות מספר בין 1 ל-6' };
  if (minGrade && maxGrade && minGrade > maxGrade) return { ok: false, error: 'כיתה מינימלית גדולה מהמקסימלית' };
  return { ok: true, value: { ...(minGrade ? { minGrade } : {}), ...(maxGrade ? { maxGrade } : {}) } };
}

function visual(v: unknown): RiddleVisual | undefined | null {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const parts = (p: unknown) =>
    Array.isArray(p) &&
    p.length > 0 &&
    p.length <= 12 &&
    p.every((x) => x && typeof x === 'object' && typeof (x as { text?: unknown }).text === 'string');
  switch (o.kind) {
    case 'grid3':
    case 'triangles':
      return { kind: o.kind };
    case 'row':
    case 'stack':
      return parts(o.parts) ? ({ kind: o.kind, parts: o.parts } as RiddleVisual) : null;
    case 'bag':
      return typeof o.emoji === 'string' && o.emoji ? { kind: 'bag', emoji: o.emoji } : null;
    case 'forest':
      return typeof o.hidden === 'string' && o.hidden ? { kind: 'forest', hidden: o.hidden } : null;
    default:
      return null;
  }
}

export function validateRiddle(input: unknown): Result<DailyRiddleEntry> {
  if (!input || typeof input !== 'object') return { ok: false, error: 'חידה לא תקינה' };
  const raw = input as Record<string, unknown>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!ID_RE.test(id)) return { ok: false, error: `מזהה לא תקין: "${id}" (אותיות אנגליות קטנות, ספרות, - או _)` };
  const track = raw.track as RiddleTrack;
  if (track !== 'math' && track !== 'language') return { ok: false, error: `${id}: track חייב להיות math או language` };
  const cat = raw.cat as DailyRiddleCat;
  if (!CATS.includes(cat)) return { ok: false, error: `${id}: cat חייב להיות אחד מ-${CATS.join(', ')}` };
  const prompt = str(raw.prompt);
  const hint = str(raw.hint);
  const answer = str(raw.answer, 120);
  const why = str(raw.why);
  if (!prompt || !hint || !answer || !why) return { ok: false, error: `${id}: חסר prompt, hint, answer או why` };
  const extra = raw.extra === undefined || raw.extra === '' ? undefined : str(raw.extra);
  if (extra === null) return { ok: false, error: `${id}: extra לא תקין` };
  if (!Array.isArray(raw.choices)) return { ok: false, error: `${id}: choices חייב להיות רשימה` };
  const choices = raw.choices.map((c) => str(c, 120));
  if (choices.some((c) => !c) || choices.length < 2 || choices.length > 6) {
    return { ok: false, error: `${id}: צריך 2–6 תשובות לבחירה` };
  }
  if (new Set(choices).size !== choices.length) return { ok: false, error: `${id}: יש תשובה כפולה ב-choices` };
  if (!choices.includes(answer)) return { ok: false, error: `${id}: answer חייב להופיע ב-choices` };
  const alts = Array.isArray(raw.alts) ? raw.alts.map((a) => str(a, 120)).filter((a): a is string => !!a) : [];
  const vis = visual(raw.visual);
  if (vis === null) return { ok: false, error: `${id}: visual לא תקין` };
  const grades = gradeRange(raw);
  if (!grades.ok) return { ok: false, error: `${id}: ${grades.error}` };
  return {
    ok: true,
    value: {
      id,
      track,
      cat,
      prompt,
      ...(extra ? { extra } : {}),
      ...(vis ? { visual: vis } : {}),
      hint,
      answer,
      ...(alts.length ? { alts } : {}),
      why,
      choices: choices as string[],
      ...grades.value,
    },
  };
}

export function validateWord(input: unknown): Result<DailyWordEntry> {
  if (!input || typeof input !== 'object') return { ok: false, error: 'מילה לא תקינה' };
  const raw = input as Record<string, unknown>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!ID_RE.test(id)) return { ok: false, error: `מזהה לא תקין: "${id}" (אותיות אנגליות קטנות, ספרות, - או _)` };
  const word = str(raw.word, 60);
  const definition = str(raw.definition);
  const hint = str(raw.hint);
  if (!word || !definition || !hint) return { ok: false, error: `${id}: חסר word, definition או hint` };
  const grades = gradeRange(raw);
  if (!grades.ok) return { ok: false, error: `${id}: ${grades.error}` };
  return { ok: true, value: { id, word, definition, hint, ...grades.value } };
}
