import {
  DAILY_RIDDLES,
  DAILY_RIDDLE_POINTS,
  riddleGuessMatches,
  seededShuffle,
  type BadgeUnlock,
  type DailyRiddleEntry,
  type DailyRiddlePlayStatus,
  type KidDailyRiddle,
  type ParentDailyRiddleKid,
} from '@kidsapp/shared';
import { IUser } from '../models/User';
import { DailyRiddleClaim } from '../models/DailyRiddleClaim';
import { todayString } from '../utils/format';
import { awardPoints } from './gamification';

function hashUint(kidId: string, date: string): number {
  const str = `${kidId}:${date}:daily-riddle`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function entryById(riddleId: string): DailyRiddleEntry | undefined {
  return DAILY_RIDDLES.find((r) => r.id === riddleId);
}

function pickFromPool(kidId: string, date: string, wonIds: Set<string>): DailyRiddleEntry {
  const pool = DAILY_RIDDLES.filter((r) => !wonIds.has(r.id));
  const source = pool.length ? pool : DAILY_RIDDLES;
  return source[hashUint(kidId, date) % source.length];
}

async function wonRiddleIdsFor(kidId: string): Promise<Set<string>> {
  const won = await DailyRiddleClaim.find({ kidId, status: 'won' }).select('riddleId');
  return new Set(won.map((c) => c.riddleId));
}

function shuffledChoices(entry: DailyRiddleEntry, kidId: string, date: string): string[] {
  return seededShuffle(entry.choices, hashUint(kidId, `${date}:${entry.id}`));
}

function toKidPayload(
  date: string,
  entry: DailyRiddleEntry,
  status: DailyRiddlePlayStatus,
  attempts: number,
  kidId: string
): KidDailyRiddle {
  const payload: KidDailyRiddle = {
    date,
    id: entry.id,
    cat: entry.cat,
    prompt: entry.prompt,
    extra: entry.extra,
    visual: entry.visual,
    choices: shuffledChoices(entry, kidId, date),
    points: DAILY_RIDDLE_POINTS,
    status,
    attempts,
  };
  if (status === 'won' || status === 'missed') {
    payload.why = entry.why;
    payload.answer = entry.answer;
  }
  return payload;
}

function playStatus(claim: { status: string; attempts: number } | null): DailyRiddlePlayStatus {
  if (!claim) return 'open';
  if (claim.status === 'won') return 'won';
  if (claim.status === 'missed' || claim.attempts > 0) return 'missed';
  return 'open';
}

async function entryForKid(
  kid: IUser,
  date: string
): Promise<{ entry: DailyRiddleEntry; status: DailyRiddlePlayStatus; attempts: number }> {
  const kidId = kid._id.toString();
  const [todayClaim, wonIds] = await Promise.all([
    DailyRiddleClaim.findOne({ kidId: kid._id, date }),
    wonRiddleIdsFor(kidId),
  ]);
  if (todayClaim) {
    const pinned = entryById(todayClaim.riddleId) ?? pickFromPool(kidId, date, wonIds);
    return { entry: pinned, status: playStatus(todayClaim), attempts: todayClaim.attempts };
  }
  return { entry: pickFromPool(kidId, date, wonIds), status: 'open', attempts: 0 };
}

export async function getKidDailyRiddle(kid: IUser): Promise<KidDailyRiddle> {
  const date = todayString();
  const { entry, status, attempts } = await entryForKid(kid, date);
  return toKidPayload(date, entry, status, attempts, kid._id.toString());
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

  return kids.map((kid) => {
    const kidId = kid._id.toString();
    const claim = todayClaims.find((c) => c.kidId.toString() === kidId);
    const wonIds = wonByKid.get(kidId) ?? new Set<string>();
    const entry = claim
      ? entryById(claim.riddleId) ?? pickFromPool(kidId, date, wonIds)
      : pickFromPool(kidId, date, wonIds);
    const status = playStatus(claim ?? null);
    return {
      kidId,
      date,
      id: entry.id,
      cat: entry.cat,
      prompt: entry.prompt,
      extra: entry.extra,
      visual: entry.visual,
      points: DAILY_RIDDLE_POINTS,
      status,
      kid: { displayName: kid.displayName, avatar: kid.avatar || '🎮' },
      ...(status === 'won' || status === 'missed' ? { why: entry.why, answer: entry.answer } : {}),
    };
  });
}

export async function guessDailyRiddle(
  kid: IUser,
  guess: string
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
  const { entry, status, attempts } = await entryForKid(kid, date);
  if (status !== 'open') {
    return {
      ok: true,
      correct: status === 'won',
      dailyRiddle: toKidPayload(date, entry, status, attempts, kidId),
    };
  }

  let claim = await DailyRiddleClaim.findOne({ kidId: kid._id, date });
  if (!claim) {
    claim = await DailyRiddleClaim.create({
      kidId: kid._id,
      familyId: kid.familyId,
      date,
      riddleId: entry.id,
      status: 'open',
      attempts: 0,
    });
  }

  const correct = riddleGuessMatches(entry, trimmed);
  claim.attempts += 1;
  claim.status = correct ? 'won' : 'missed';
  await claim.save();
  if (correct) {
    const newBadges = await awardPoints(kid, DAILY_RIDDLE_POINTS, 'bonus', 'חידה יומית', claim._id.toString());
    return {
      ok: true,
      correct: true,
      dailyRiddle: toKidPayload(date, entry, 'won', claim.attempts, kidId),
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
    dailyRiddle: toKidPayload(date, entry, 'missed', claim.attempts, kidId),
  };
}
