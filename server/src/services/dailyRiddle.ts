/**
 * Daily riddles: every kid gets two per day, one math and one language (slots).
 * Riddles come from the database through the content store. Unsolved riddles come first;
 * a riddle the kid solved never returns until that track's pool is exhausted.
 *
 * Backward compatibility: callers that don't pass a slot (app builds before 2.2) get the
 * math riddle, which is picked exactly like the single riddle used to be.
 */
import {
  DAILY_RIDDLE_POINTS,
  RIDDLE_TRACKS,
  riddleGuessMatches,
  seededShuffle,
  type BadgeUnlock,
  type DailyRiddleAppeal,
  type DailyRiddleEntry,
  type DailyRiddlePlayStatus,
  type KidDailyRiddle,
  type ParentDailyRiddleKid,
  type RiddleTrack,
  type RiddleVisual,
} from '@kidsapp/shared';
import { IUser, User } from '../models/User';
import { DailyRiddleClaim, IDailyRiddleClaim } from '../models/DailyRiddleClaim';
import { todayString } from '../utils/format';
import { awardPoints } from './gamification';
import { riddleById, riddlesFor } from './contentStore';
import { clientShowsRiddleImages } from '../utils/clientContext';

/** Uploaded pictures go only to apps that can show them (older ones would draw the forest). */
function visibleVisual(v: RiddleVisual | undefined): RiddleVisual | undefined {
  if (v?.kind === 'image' && !clientShowsRiddleImages()) return undefined;
  return v;
}

export function parseSlot(raw: unknown): RiddleTrack {
  return raw === 'language' ? 'language' : 'math';
}

function hashUint(kidId: string, date: string, slot: RiddleTrack, extra = ''): number {
  // The math slot keeps the original salt so in-flight days pick the same riddle as before.
  const str = `${kidId}:${date}:daily-riddle${slot === 'math' ? '' : `:${slot}`}${extra}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const FALLBACK: DailyRiddleEntry = {
  id: 'fallback-2plus2',
  track: 'math',
  cat: 'math',
  prompt: 'כמה זה 2 + 2?',
  hint: 'ספרו על האצבעות.',
  answer: '4',
  why: '2 + 2 = 4.',
  choices: ['3', '4', '5', '22'],
};

function pickFromPool(kid: IUser, date: string, slot: RiddleTrack, wonIds: Set<string>): DailyRiddleEntry {
  const showImages = clientShowsRiddleImages();
  const all = riddlesFor(slot, kid.grade).filter((r) => showImages || r.visual?.kind !== 'image');
  if (!all.length) return FALLBACK;
  const pool = all.filter((r) => !wonIds.has(r.id));
  const source = pool.length ? pool : all;
  return source[hashUint(kid._id.toString(), date, slot) % source.length];
}

async function wonRiddleIdsFor(kidId: string): Promise<Set<string>> {
  const won = await DailyRiddleClaim.find({ kidId, status: 'won' }).select('riddleId');
  return new Set(won.map((c) => c.riddleId));
}

function kidAppeal(appeal?: string): DailyRiddleAppeal | undefined {
  if (appeal === 'pending' || appeal === 'rejected') return appeal;
  return undefined;
}

function playStatus(claim: { status: string; attempts: number; appeal?: string } | null): DailyRiddlePlayStatus {
  if (!claim) return 'open';
  if (claim.status === 'won') return 'won';
  if (claim.appeal === 'pending') return 'appealed';
  if (claim.status === 'missed' || claim.attempts > 0) return 'missed';
  return 'open';
}

function toKidPayload(
  date: string,
  slot: RiddleTrack,
  entry: DailyRiddleEntry,
  status: DailyRiddlePlayStatus,
  attempts: number,
  kidId: string,
  extra?: { guess?: string; appeal?: string }
): KidDailyRiddle {
  const payload: KidDailyRiddle = {
    date,
    slot,
    id: entry.id,
    cat: entry.cat,
    prompt: entry.prompt,
    extra: entry.extra,
    visual: visibleVisual(entry.visual),
    choices: seededShuffle(entry.choices, hashUint(kidId, date, slot, `:${entry.id}`)),
    points: DAILY_RIDDLE_POINTS,
    status,
    attempts,
  };
  if (status === 'won' || status === 'missed' || status === 'appealed') {
    payload.why = entry.why;
    payload.answer = entry.answer;
    if (extra?.guess) payload.guess = extra.guess;
    const appeal = kidAppeal(extra?.appeal);
    if (appeal) payload.appeal = appeal;
  }
  return payload;
}

type Today = {
  entry: DailyRiddleEntry;
  status: DailyRiddlePlayStatus;
  attempts: number;
  guess?: string;
  appeal?: string;
  claim: IDailyRiddleClaim | null;
};

function resolveToday(kid: IUser, date: string, slot: RiddleTrack, claim: IDailyRiddleClaim | null, wonIds: Set<string>): Today {
  if (claim) {
    return {
      entry: riddleById(claim.riddleId) ?? pickFromPool(kid, date, slot, wonIds),
      status: playStatus(claim),
      attempts: claim.attempts,
      guess: claim.guess,
      appeal: claim.appeal,
      claim,
    };
  }
  return { entry: pickFromPool(kid, date, slot, wonIds), status: 'open', attempts: 0, claim: null };
}

async function entryForKid(kid: IUser, date: string, slot: RiddleTrack): Promise<Today> {
  const [claim, wonIds] = await Promise.all([
    DailyRiddleClaim.findOne({ kidId: kid._id, date, slot }),
    wonRiddleIdsFor(kid._id.toString()),
  ]);
  return resolveToday(kid, date, slot, claim, wonIds);
}

export async function getKidDailyRiddle(kid: IUser, slot: RiddleTrack = 'math'): Promise<KidDailyRiddle> {
  const date = todayString();
  const t = await entryForKid(kid, date, slot);
  return toKidPayload(date, slot, t.entry, t.status, t.attempts, kid._id.toString(), { guess: t.guess, appeal: t.appeal });
}

export async function getKidDailyRiddles(kid: IUser): Promise<KidDailyRiddle[]> {
  const date = todayString();
  const [claims, wonIds] = await Promise.all([
    DailyRiddleClaim.find({ kidId: kid._id, date }),
    wonRiddleIdsFor(kid._id.toString()),
  ]);
  return RIDDLE_TRACKS.map((slot) => {
    const t = resolveToday(kid, date, slot, claims.find((c) => (c.slot ?? 'math') === slot) ?? null, wonIds);
    return toKidPayload(date, slot, t.entry, t.status, t.attempts, kid._id.toString(), { guess: t.guess, appeal: t.appeal });
  });
}

export async function listFamilyDailyRiddles(kids: IUser[]): Promise<ParentDailyRiddleKid[]> {
  const date = todayString();
  if (!kids.length) return [];
  const kidObjectIds = kids.map((k) => k._id);
  const [todayClaims, wonClaims] = await Promise.all([
    DailyRiddleClaim.find({ kidId: { $in: kidObjectIds }, date }),
    DailyRiddleClaim.find({ kidId: { $in: kidObjectIds }, status: 'won' }).select('kidId riddleId'),
  ]);
  const wonByKid = new Map<string, Set<string>>();
  for (const c of wonClaims) {
    const id = c.kidId.toString();
    const set = wonByKid.get(id) ?? new Set<string>();
    set.add(c.riddleId);
    wonByKid.set(id, set);
  }

  const out: ParentDailyRiddleKid[] = [];
  for (const kid of kids) {
    const kidId = kid._id.toString();
    for (const slot of RIDDLE_TRACKS) {
      const claim = todayClaims.find((c) => c.kidId.toString() === kidId && (c.slot ?? 'math') === slot) ?? null;
      const t = resolveToday(kid, date, slot, claim, wonByKid.get(kidId) ?? new Set());
      const revealed = t.status === 'won' || t.status === 'missed' || t.status === 'appealed';
      out.push({
        kidId,
        date,
        slot,
        id: t.entry.id,
        cat: t.entry.cat,
        prompt: t.entry.prompt,
        extra: t.entry.extra,
        visual: visibleVisual(t.entry.visual),
        points: DAILY_RIDDLE_POINTS,
        status: t.status,
        kid: { displayName: kid.displayName, avatar: kid.avatar || '🎮' },
        ...(revealed ? { why: t.entry.why, answer: t.entry.answer, guess: claim?.guess, appeal: kidAppeal(claim?.appeal) } : {}),
      });
    }
  }
  return out;
}

export async function guessDailyRiddle(
  kid: IUser,
  guess: string,
  slot: RiddleTrack = 'math'
): Promise<
  | {
      ok: true;
      correct: boolean;
      dailyRiddle: KidDailyRiddle;
      pointsAwarded?: number;
      points?: number;
      level?: number;
      xp?: number;
      newBadges?: BadgeUnlock[];
    }
  | { ok: false; error: string }
> {
  const trimmed = typeof guess === 'string' ? guess.trim() : '';
  if (!trimmed) return { ok: false, error: 'בחרו תשובה' };

  const date = todayString();
  const kidId = kid._id.toString();
  const today = await entryForKid(kid, date, slot);
  if (today.status !== 'open') {
    return {
      ok: true,
      correct: today.status === 'won',
      dailyRiddle: toKidPayload(date, slot, today.entry, today.status, today.attempts, kidId, {
        guess: today.guess,
        appeal: today.appeal,
      }),
    };
  }

  const claim =
    today.claim ??
    (await DailyRiddleClaim.create({
      kidId: kid._id,
      familyId: kid.familyId,
      date,
      slot,
      riddleId: today.entry.id,
      status: 'open',
      attempts: 0,
    }));

  const correct = riddleGuessMatches(today.entry, trimmed);
  claim.attempts += 1;
  claim.guess = trimmed;
  claim.status = correct ? 'won' : 'missed';
  await claim.save();
  if (correct) {
    const label = slot === 'language' ? 'חידת שפה' : 'חידה יומית';
    const newBadges = await awardPoints(kid, DAILY_RIDDLE_POINTS, 'bonus', label, claim._id.toString());
    return {
      ok: true,
      correct: true,
      dailyRiddle: toKidPayload(date, slot, today.entry, 'won', claim.attempts, kidId),
      pointsAwarded: DAILY_RIDDLE_POINTS,
      points: kid.points,
      level: kid.level,
      xp: kid.xp,
      newBadges,
    };
  }
  return {
    ok: true,
    correct: false,
    dailyRiddle: toKidPayload(date, slot, today.entry, 'missed', claim.attempts, kidId, { guess: trimmed }),
  };
}

export async function appealDailyRiddle(
  kid: IUser,
  slot: RiddleTrack = 'math'
): Promise<{ ok: true; dailyRiddle: KidDailyRiddle } | { ok: false; error: string }> {
  const date = todayString();
  const kidId = kid._id.toString();
  const claim = await DailyRiddleClaim.findOne({ kidId: kid._id, date, slot });
  if (!claim || claim.status !== 'missed' || !claim.guess) {
    return { ok: false, error: 'אפשר לערער רק אחרי תשובה שלא התקבלה' };
  }
  if (claim.appeal === 'pending' || claim.appeal === 'approved') return { ok: false, error: 'הערעור כבר נשלח להורה' };
  if (claim.appeal === 'rejected') return { ok: false, error: 'ההורה כבר בדק את הערעור' };

  claim.appeal = 'pending';
  await claim.save();
  const wonIds = await wonRiddleIdsFor(kidId);
  const entry = riddleById(claim.riddleId) ?? pickFromPool(kid, date, slot, wonIds);
  return {
    ok: true,
    dailyRiddle: toKidPayload(date, slot, entry, 'appealed', claim.attempts, kidId, { guess: claim.guess, appeal: 'pending' }),
  };
}

export async function reviewDailyRiddleAppeal(
  familyId: string,
  kidId: string,
  action: 'approve' | 'reject',
  slot?: RiddleTrack
): Promise<{ ok: true; points?: number } | { ok: false; error: string }> {
  const kid = await User.findOne({ _id: kidId, familyId, role: 'kid' });
  if (!kid) return { ok: false, error: 'ילד לא נמצא' };

  const date = todayString();
  // Older apps don't send a slot: review whichever riddle has the pending appeal.
  const claim = await DailyRiddleClaim.findOne({
    kidId: kid._id,
    familyId,
    date,
    appeal: 'pending',
    ...(slot ? { slot } : {}),
  });
  if (!claim || claim.status === 'won') return { ok: false, error: 'אין ערעור ממתין' };

  if (action === 'reject') {
    claim.appeal = 'rejected';
    await claim.save();
    return { ok: true };
  }
  claim.status = 'won';
  claim.appeal = 'approved';
  await claim.save();
  await awardPoints(kid, DAILY_RIDDLE_POINTS, 'bonus', 'ערעור חידה יומית', claim._id.toString());
  return { ok: true, points: kid.points };
}
