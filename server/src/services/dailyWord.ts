import {
  DAILY_WORDS,
  DAILY_WORD_POINTS,
  type DailyWordEntry,
  type DailyWordPlayStatus,
  type KidDailyWord,
  type ParentDailyWordKid,
} from '@kidsapp/shared';
import { IUser } from '../models/User';
import { DailyWordClaim } from '../models/DailyWordClaim';
import { todayString } from '../utils/format';
import { awardPoints } from './gamification';


function hashUint(kidId: string, date: string): number {
  const str = `${kidId}:${date}:daily-word`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function entryById(wordId: string): DailyWordEntry | undefined {
  return DAILY_WORDS.find((w) => w.id === wordId);
}

/** Unused words first; a scored word never returns until the pool is empty. */
function pickFromPool(kidId: string, date: string, wonIds: Set<string>): DailyWordEntry {
  const pool = DAILY_WORDS.filter((w) => !wonIds.has(w.id));
  const source = pool.length ? pool : DAILY_WORDS;
  return source[hashUint(kidId, date) % source.length];
}

function statusFromClaims(claims: Array<{ status: string }>): DailyWordPlayStatus {
  if (claims.some((c) => c.status === 'approved')) return 'won';
  return 'open';
}

function pinnedWordId(claims: Array<{ status: string; wordId: string }>): string | undefined {
  const won = claims.find((c) => c.status === 'approved');
  if (won) return won.wordId;
  const started = claims.find((c) => c.status === 'pending' || c.status === 'rejected');
  if (started) return started.wordId;
  return undefined;
}

async function expireStaleAsks(kidIds: Array<string | IUser['_id']>, date: string): Promise<void> {
  await DailyWordClaim.updateMany(
    { kidId: { $in: kidIds }, status: 'pending', date: { $ne: date } },
    { $set: { status: 'rejected', reviewedAt: new Date() } }
  );
}

async function wonWordIdsFor(kidId: string): Promise<Set<string>> {
  const won = await DailyWordClaim.find({ kidId, status: 'approved' }).select('wordId');
  return new Set(won.map((c) => c.wordId));
}

function entryForKid(
  kidId: string,
  date: string,
  todayClaims: Array<{ status: string; wordId: string }>,
  wonIds: Set<string>
): DailyWordEntry {
  const pinned = pinnedWordId(todayClaims);
  if (pinned) {
    const entry = entryById(pinned);
    if (entry) return entry;
  }
  return pickFromPool(kidId, date, wonIds);
}

function toKidPayload(
  date: string,
  entry: DailyWordEntry,
  status: DailyWordPlayStatus
): KidDailyWord {
  return {
    date,
    word: entry.word,
    definition: entry.definition,
    hint: entry.hint,
    points: DAILY_WORD_POINTS,
    status,
  };
}

export async function getKidDailyWord(kid: IUser): Promise<KidDailyWord> {
  const date = todayString();
  const kidId = kid._id.toString();
  await expireStaleAsks([kid._id], date);
  const [todayClaims, wonIds] = await Promise.all([
    DailyWordClaim.find({ kidId: kid._id, date }),
    wonWordIdsFor(kidId),
  ]);
  const status = statusFromClaims(todayClaims);
  const entry = entryForKid(kidId, date, todayClaims, wonIds);
  return toKidPayload(date, entry, status);
}

export async function listFamilyDailyWords(kids: IUser[]): Promise<ParentDailyWordKid[]> {
  const date = todayString();
  if (!kids.length) return [];
  const kidObjectIds = kids.map((k) => k._id);
  await expireStaleAsks(kidObjectIds, date);

  const [todayClaims, wonClaims] = await Promise.all([
    DailyWordClaim.find({ kidId: { $in: kidObjectIds }, date }),
    DailyWordClaim.find({ kidId: { $in: kidObjectIds }, status: 'approved' }).select('kidId wordId'),
  ]);

  const wonByKid = new Map<string, Set<string>>();
  for (const c of wonClaims) {
    const id = c.kidId.toString();
    const set = wonByKid.get(id) ?? new Set<string>();
    set.add(c.wordId);
    wonByKid.set(id, set);
  }

  return kids.map((kid) => {
    const kidId = kid._id.toString();
    const kidClaims = todayClaims.filter((c) => c.kidId.toString() === kidId);
    const status = statusFromClaims(kidClaims);
    const entry = entryForKid(kidId, date, kidClaims, wonByKid.get(kidId) ?? new Set());
    return {
      kidId,
      date,
      word: entry.word,
      definition: entry.definition,
      hint: entry.hint,
      points: DAILY_WORD_POINTS,
      status,
      kid: { displayName: kid.displayName, avatar: kid.avatar || '🎮' },
    };
  });
}

export async function reviewDailyWord(
  familyId: string,
  kidId: string,
  action: 'approve' | 'reject'
): Promise<{ ok: true; points?: number } | { ok: false; error: string }> {
  if (action !== 'approve') return { ok: true };

  const { User } = await import('../models/User');
  const kid = await User.findOne({ _id: kidId, familyId, role: 'kid' });
  if (!kid) return { ok: false, error: 'ילד לא נמצא' };

  const date = todayString();
  await expireStaleAsks([kid._id], date);

  const existing = await DailyWordClaim.find({ kidId: kid._id, date });
  if (existing.some((c) => c.status === 'approved')) {
    return { ok: false, error: 'הילד כבר הסביר היום' };
  }

  const wonIds = await wonWordIdsFor(kid._id.toString());
  const entry = entryForKid(kid._id.toString(), date, existing, wonIds);

  const alreadyWon = await DailyWordClaim.findOne({
    kidId: kid._id,
    wordId: entry.id,
    status: 'approved',
  });
  if (alreadyWon) return { ok: false, error: 'המילה הזו כבר אושרה' };

  let claim = existing.find((c) => c.status === 'pending') ?? existing[0];
  if (claim) {
    claim.wordId = entry.id;
    claim.status = 'approved';
    claim.reviewedAt = new Date();
    await claim.save();
  } else {
    claim = await DailyWordClaim.create({
      kidId: kid._id,
      familyId: kid.familyId,
      date,
      wordId: entry.id,
      status: 'approved',
      reviewedAt: new Date(),
    });
  }

  await awardPoints(kid, DAILY_WORD_POINTS, 'bonus', 'מילה יומית', claim._id.toString());
  const { pushDailyWordReviewed } = await import('./push');
  pushDailyWordReviewed(kid._id.toString(), true, DAILY_WORD_POINTS);
  return { ok: true, points: DAILY_WORD_POINTS };
}
