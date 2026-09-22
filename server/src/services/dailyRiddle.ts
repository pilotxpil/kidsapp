import {
  DAILY_RIDDLES,
  DAILY_RIDDLE_POINTS,
  riddleGuessMatches,
  seededShuffle,
  type BadgeUnlock,
  type DailyRiddleEntry,
  type DailyRiddleAppeal,
  type DailyRiddlePlayStatus,
  type KidDailyRiddle,
  type ParentDailyRiddleKid,
} from '@kidsapp/shared';
import { IUser, User } from '../models/User';
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

function kidAppeal(appeal?: string): DailyRiddleAppeal | undefined {
  if (appeal === 'pending' || appeal === 'rejected') return appeal;
  return undefined;
}

function toKidPayload(
  date: string,
  entry: DailyRiddleEntry,
  status: DailyRiddlePlayStatus,
  attempts: number,
  kidId: string,
  extra?: { guess?: string; appeal?: string }
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
  if (status === 'won' || status === 'missed' || status === 'appealed') {
    payload.why = entry.why;
    payload.answer = entry.answer;
    if (extra?.guess) payload.guess = extra.guess;
    const appeal = kidAppeal(extra?.appeal);
    if (appeal) payload.appeal = appeal;
  }
  return payload;
}

function playStatus(claim: { status: string; attempts: number; appeal?: string } | null): DailyRiddlePlayStatus {
  if (!claim) return 'open';
  if (claim.status === 'won') return 'won';
  if (claim.appeal === 'pending') return 'appealed';
  if (claim.status === 'missed' || claim.attempts > 0) return 'missed';
  return 'open';
}

async function entryForKid(kid: IUser, date: string): Promise<{
  entry: DailyRiddleEntry;
  status: DailyRiddlePlayStatus;
  attempts: number;
  guess?: string;
  appeal?: string;
}> {
  const kidId = kid._id.toString();
  const [todayClaim, wonIds] = await Promise.all([
    DailyRiddleClaim.findOne({ kidId: kid._id, date }),
    wonRiddleIdsFor(kidId),
  ]);
  if (todayClaim) {
    const pinned = entryById(todayClaim.riddleId) ?? pickFromPool(kidId, date, wonIds);
    return {
      entry: pinned,
      status: playStatus(todayClaim),
      attempts: todayClaim.attempts,
      guess: todayClaim.guess,
      appeal: todayClaim.appeal,
    };
  }
  return { entry: pickFromPool(kidId, date, wonIds), status: 'open', attempts: 0 };
}

export async function getKidDailyRiddle(kid: IUser): Promise<KidDailyRiddle> {
  const date = todayString();
  const { entry, status, attempts, guess, appeal } = await entryForKid(kid, date);
  return toKidPayload(date, entry, status, attempts, kid._id.toString(), { guess, appeal });
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
    const revealed = status === 'won' || status === 'missed' || status === 'appealed';
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
      ...(revealed
        ? {
            why: entry.why,
            answer: entry.answer,
            guess: claim?.guess,
            appeal: kidAppeal(claim?.appeal),
          }
        : {}),
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
  const today = await entryForKid(kid, date);
  const { entry, status, attempts } = today;
  if (status !== 'open') {
    return {
      ok: true,
      correct: status === 'won',
      dailyRiddle: toKidPayload(date, entry, status, attempts, kidId, {
        guess: today.guess,
        appeal: today.appeal,
      }),
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
  claim.guess = trimmed;
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
    dailyRiddle: toKidPayload(date, entry, 'missed', claim.attempts, kidId, { guess: trimmed }),
  };
}

export async function appealDailyRiddle(
  kid: IUser
): Promise<{ ok: true; dailyRiddle: KidDailyRiddle } | { ok: false; error: string }> {
  const date = todayString();
  const kidId = kid._id.toString();
  const claim = await DailyRiddleClaim.findOne({ kidId: kid._id, date });
  if (!claim || claim.status !== 'missed' || !claim.guess) {
    return { ok: false, error: 'אפשר לערער רק אחרי תשובה שלא התקבלה' };
  }
  if (claim.appeal === 'pending' || claim.appeal === 'approved') {
    return { ok: false, error: 'הערעור כבר נשלח להורה' };
  }
  if (claim.appeal === 'rejected') {
    return { ok: false, error: 'ההורה כבר בדק את הערעור' };
  }

  claim.appeal = 'pending';
  await claim.save();

  const wonIds = await wonRiddleIdsFor(kidId);
  const entry = entryById(claim.riddleId) ?? pickFromPool(kidId, date, wonIds);
  return {
    ok: true,
    dailyRiddle: toKidPayload(date, entry, 'appealed', claim.attempts, kidId, {
      guess: claim.guess,
      appeal: 'pending',
    }),
  };
}

export async function reviewDailyRiddleAppeal(
  familyId: string,
  kidId: string,
  action: 'approve' | 'reject'
): Promise<{ ok: true; points?: number } | { ok: false; error: string }> {
  const kid = await User.findOne({ _id: kidId, familyId, role: 'kid' });
  if (!kid) return { ok: false, error: 'ילד לא נמצא' };

  const date = todayString();
  const claim = await DailyRiddleClaim.findOne({ kidId: kid._id, familyId, date });
  if (!claim || claim.appeal !== 'pending' || claim.status === 'won') {
    return { ok: false, error: 'אין ערעור ממתין' };
  }

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
