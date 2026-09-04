import {
  calculateLevel,
  DAILY_STAR_TAPS,
  DAILY_STAR_BONUS,
  FORTUNE_WHEEL_SEGMENTS,
  SURPRISE_CHEST_DAILY_CHANCE,
  BADGES,
  BADGE_REWARDS,
  type BadgeUnlock,
  type DailyGiftType,
  type FortuneWheelSegment,
  defaultUiThemeForRole,
} from '@kidsapp/shared';
import { IUser, User } from '../models/User';
import { PointTransaction } from '../models/PointTransaction';
import { TaskCompletion } from '../models/TaskCompletion';
import { Task } from '../models/Task';
import { todayString } from '../utils/format';

const STREAK_BONUSES: Record<number, number> = {
  3: 25,
  7: 50,
  30: 200,
};

const WHEEL_DESC = 'גלגל מזל';
const CHEST_DESC = 'תיבת אוצר';
const CHEST_REWARDS = [8, 10, 12, 15, 18];

function startOfUtcDay(): Date {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/** Deterministic 0–1 roll — stable for the same kid + date + salt all day. */
function dailyRoll(kidId: string, date: string, salt: string): number {
  const str = `${kidId}:${date}:${salt}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function getDailyGiftType(kidId: IUser['_id']): DailyGiftType {
  const today = todayString();
  return dailyRoll(kidId.toString(), today, 'gift') < 0.5 ? 'star' : 'wheel';
}

function isSurpriseChestDay(kidId: IUser['_id']): boolean {
  const today = todayString();
  return dailyRoll(kidId.toString(), today, 'chest') < SURPRISE_CHEST_DAILY_CHANCE;
}

function projectedStreak(kid: IUser): number {
  const today = todayString();
  if (kid.lastActiveDate === today) return kid.streak;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (kid.lastActiveDate === yesterdayStr) return kid.streak + 1;
  return 1;
}

async function hasClaimedDailyStarToday(kidId: IUser['_id']): Promise<boolean> {
  const existing = await PointTransaction.findOne({
    kidId,
    type: 'daily',
    createdAt: { $gte: startOfUtcDay() },
  });
  return !!existing;
}

async function hasSpunWheelToday(kidId: IUser['_id']): Promise<boolean> {
  const existing = await PointTransaction.findOne({
    kidId,
    type: 'bonus',
    description: WHEEL_DESC,
    createdAt: { $gte: startOfUtcDay() },
  });
  return !!existing;
}

async function hasOpenedChestToday(kidId: IUser['_id']): Promise<boolean> {
  const existing = await PointTransaction.findOne({
    kidId,
    type: 'bonus',
    description: CHEST_DESC,
    createdAt: { $gte: startOfUtcDay() },
  });
  return !!existing;
}

async function hasUsedDailyGiftToday(kidId: IUser['_id']): Promise<boolean> {
  const [star, wheel] = await Promise.all([
    hasClaimedDailyStarToday(kidId),
    hasSpunWheelToday(kidId),
  ]);
  return star || wheel;
}

/** Updates streak / lastActiveDate and awards milestone streak bonus once per day. */
async function recordDailyActivity(kid: IUser): Promise<number> {
  const today = todayString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (kid.lastActiveDate === yesterdayStr) {
    kid.streak += 1;
  } else if (kid.lastActiveDate !== today) {
    kid.streak = 1;
  }
  kid.lastActiveDate = today;

  const streakBonus = STREAK_BONUSES[kid.streak] ?? 0;
  if (!streakBonus) return 0;

  kid.points += streakBonus;
  kid.xp += streakBonus;
  await PointTransaction.create({
    kidId: kid._id,
    familyId: kid.familyId,
    amount: streakBonus,
    type: 'streak',
    description: `בונוס רצף ${kid.streak} ימים`,
  });
  return streakBonus;
}

async function saveKidProgress(kid: IUser): Promise<void> {
  kid.badges = Array.isArray(kid.badges) ? kid.badges : [];
  try {
    await kid.save({ validateModifiedOnly: true });
  } catch (err) {
    console.error('saveKidProgress document save failed, using updateOne', err);
    await User.updateOne(
      { _id: kid._id },
      {
        $set: {
          points: kid.points,
          xp: kid.xp,
          level: kid.level,
          streak: kid.streak,
          lastActiveDate: kid.lastActiveDate,
          badges: kid.badges,
        },
      }
    );
  }
}

function starClaimPayload(kid: IUser, dailyBonus: number, streakBonus: number, newBadges: BadgeUnlock[] = []) {
  return {
    ok: true as const,
    dailyBonus,
    streakBonus,
    totalPoints: dailyBonus + streakBonus,
    streak: kid.streak,
    points: kid.points,
    level: kid.level,
    xp: kid.xp,
    newBadges,
  };
}

export async function getDailyStarStatus(kid: IUser) {
  const giftType = getDailyGiftType(kid._id);
  const claimedToday = await hasClaimedDailyStarToday(kid._id);
  const available = giftType === 'star' && !claimedToday;
  const streak = available ? projectedStreak(kid) : kid.streak;
  const streakBonus = available && STREAK_BONUSES[streak] ? STREAK_BONUSES[streak] : 0;
  const dailyBonus = available ? DAILY_STAR_BONUS : 0;

  return {
    available,
    tapsRequired: DAILY_STAR_TAPS,
    dailyBonus,
    streakBonus,
    totalPoints: dailyBonus + streakBonus,
    streak,
    giftType,
  };
}

export async function processDailyLogin(kid: IUser) {
  const giftType = getDailyGiftType(kid._id);
  const used = await hasUsedDailyGiftToday(kid._id);
  return {
    dailyGiftType: giftType,
    dailyGiftAvailable: !used,
  };
}

export async function claimDailyStar(kid: IUser) {
  if (getDailyGiftType(kid._id) !== 'star') {
    return { ok: false as const, error: 'היום מתנה אחרת מחכה לך' };
  }

  const today = todayString();
  const existing = await PointTransaction.findOne({
    kidId: kid._id,
    type: 'daily',
    createdAt: { $gte: startOfUtcDay() },
  });

  if (existing) {
    if (kid.lastActiveDate !== today) {
      const streakBonus = await recordDailyActivity(kid);
      kid.points += existing.amount;
      kid.xp += existing.amount;
      const newBadges = await updateLevelAndBadges(kid);
      await saveKidProgress(kid);
      return starClaimPayload(kid, existing.amount, streakBonus, newBadges);
    }
    return starClaimPayload(kid, existing.amount, 0);
  }

  const streakBonus = await recordDailyActivity(kid);
  const dailyBonus = DAILY_STAR_BONUS;
  kid.points += dailyBonus;
  kid.xp += dailyBonus;
  const newBadges = await updateLevelAndBadges(kid);
  await saveKidProgress(kid);
  await PointTransaction.create({
    kidId: kid._id,
    familyId: kid.familyId,
    amount: dailyBonus,
    type: 'daily',
    description: 'כוכב יומי',
  });

  return starClaimPayload(kid, dailyBonus, streakBonus, newBadges);
}

function pickWeightedSegment(): { index: number; segment: FortuneWheelSegment } {
  const total = FORTUNE_WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < FORTUNE_WHEEL_SEGMENTS.length; i++) {
    roll -= FORTUNE_WHEEL_SEGMENTS[i].weight;
    if (roll <= 0) return { index: i, segment: FORTUNE_WHEEL_SEGMENTS[i] };
  }
  const last = FORTUNE_WHEEL_SEGMENTS.length - 1;
  return { index: last, segment: FORTUNE_WHEEL_SEGMENTS[last] };
}

export async function getFortuneWheelStatus(kid: IUser) {
  const giftType = getDailyGiftType(kid._id);
  const spun = await hasSpunWheelToday(kid._id);
  return {
    available: giftType === 'wheel' && !spun,
    segments: FORTUNE_WHEEL_SEGMENTS,
    giftType,
  };
}

export async function spinFortuneWheel(kid: IUser) {
  if (getDailyGiftType(kid._id) !== 'wheel') {
    return { ok: false as const, error: 'היום מתנה אחרת מחכה לך' };
  }

  if (await hasSpunWheelToday(kid._id)) {
    return { ok: false as const, error: 'כבר סובבת את הגלגל היום' };
  }

  const streakBonus = await recordDailyActivity(kid);
  const { index, segment } = pickWeightedSegment();

  kid.points += segment.points;
  kid.xp += segment.points;
  const newBadges = await updateLevelAndBadges(kid);
  await saveKidProgress(kid);

  await PointTransaction.create({
    kidId: kid._id,
    familyId: kid.familyId,
    amount: segment.points,
    type: 'bonus',
    description: WHEEL_DESC,
  });

  return {
    ok: true as const,
    segmentIndex: index,
    segment,
    pointsAwarded: segment.points,
    streakBonus,
    streak: kid.streak,
    points: kid.points,
    level: kid.level,
    xp: kid.xp,
    newBadges,
  };
}

export async function getTreasureChestStatus(kid: IUser) {
  const openedToday = await hasOpenedChestToday(kid._id);
  const ready = isSurpriseChestDay(kid._id) && !openedToday;
  return { ready };
}

export async function openTreasureChest(kid: IUser) {
  const status = await getTreasureChestStatus(kid);

  if (!status.ready) {
    return { ok: false as const, error: 'אין תיבה היום — נסה שוב מחר!' };
  }

  const pointsAwarded = CHEST_REWARDS[Math.floor(Math.random() * CHEST_REWARDS.length)];
  const newBadges = await awardPoints(kid, pointsAwarded, 'bonus', CHEST_DESC);

  return {
    ok: true as const,
    pointsAwarded,
    points: kid.points,
    level: kid.level,
    xp: kid.xp,
    newBadges,
  };
}

export async function awardPoints(
  kid: IUser,
  amount: number,
  type: 'task' | 'bonus',
  description: string,
  referenceId?: string
): Promise<BadgeUnlock[]> {
  kid.points += amount;
  kid.xp += amount;
  const newBadges = await updateLevelAndBadges(kid);
  await saveKidProgress(kid);

  await PointTransaction.create({
    kidId: kid._id,
    familyId: kid.familyId,
    amount,
    type,
    description,
    referenceId,
  });

  return newBadges;
}

export async function deductPoints(kid: IUser, amount: number, description: string, referenceId?: string) {
  kid.points -= amount;
  await saveKidProgress(kid);

  await PointTransaction.create({
    kidId: kid._id,
    familyId: kid.familyId,
    amount: -amount,
    type: 'redemption',
    description,
    referenceId,
  });
}

async function updateLevelAndBadges(kid: IUser): Promise<BadgeUnlock[]> {
  const { level } = calculateLevel(kid.xp);
  kid.level = level;
  if (!Array.isArray(kid.badges)) kid.badges = [];

  const approvedCount = await TaskCompletion.countDocuments({
    kidId: kid._id,
    status: 'approved',
  });

  const candidates: string[] = [];

  if (approvedCount >= 1 && !kid.badges.includes('first_task')) candidates.push('first_task');
  if (approvedCount >= 50 && !kid.badges.includes('task_master')) candidates.push('task_master');
  if (kid.streak >= 3 && !kid.badges.includes('streak_3')) candidates.push('streak_3');
  if (kid.streak >= 7 && !kid.badges.includes('streak_7')) candidates.push('streak_7');
  if (kid.streak >= 30 && !kid.badges.includes('streak_30')) candidates.push('streak_30');
  if (level >= 5 && !kid.badges.includes('level_5')) candidates.push('level_5');
  if (level >= 10 && !kid.badges.includes('level_10')) candidates.push('level_10');

  if (!kid.badges.includes('sport_star')) {
    const sportTasks = await Task.find({ familyId: kid.familyId, category: 'sport' });
    if (sportTasks.length > 0) {
      const sportCompletions = await TaskCompletion.countDocuments({
        kidId: kid._id,
        status: 'approved',
        taskId: { $in: sportTasks.map((t) => t._id) },
      });
      if (sportCompletions >= 10) candidates.push('sport_star');
    }
  }

  if (!kid.badges.includes('scholar')) {
    const schoolTasks = await Task.find({ familyId: kid.familyId, category: 'school' });
    if (schoolTasks.length > 0) {
      const schoolCompletions = await TaskCompletion.countDocuments({
        kidId: kid._id,
        status: 'approved',
        taskId: { $in: schoolTasks.map((t) => t._id) },
      });
      if (schoolCompletions >= 10) candidates.push('scholar');
    }
  }

  const unlocks: BadgeUnlock[] = [];

  for (const id of candidates) {
    const xpAwarded = BADGE_REWARDS[id] ?? 0;
    kid.badges.push(id);
    if (xpAwarded > 0) {
      kid.points += xpAwarded;
      kid.xp += xpAwarded;
      await PointTransaction.create({
        kidId: kid._id,
        familyId: kid.familyId,
        amount: xpAwarded,
        type: 'bonus',
        description: `תג: ${BADGES[id]?.label ?? id}`,
      });
    }
    unlocks.push({ id, xpAwarded });
  }

  kid.badges = [...new Set(kid.badges)];

  // Badge XP may push level — check level badges once more
  const finalLevel = calculateLevel(kid.xp).level;
  kid.level = finalLevel;
  const levelCandidates: string[] = [];
  if (finalLevel >= 5 && !kid.badges.includes('level_5')) levelCandidates.push('level_5');
  if (finalLevel >= 10 && !kid.badges.includes('level_10')) levelCandidates.push('level_10');

  for (const id of levelCandidates) {
    const xpAwarded = BADGE_REWARDS[id] ?? 0;
    kid.badges.push(id);
    if (xpAwarded > 0) {
      kid.points += xpAwarded;
      kid.xp += xpAwarded;
      await PointTransaction.create({
        kidId: kid._id,
        familyId: kid.familyId,
        amount: xpAwarded,
        type: 'bonus',
        description: `תג: ${BADGES[id]?.label ?? id}`,
      });
    }
    unlocks.push({ id, xpAwarded });
  }

  kid.badges = [...new Set(kid.badges)];
  return unlocks;
}

export async function getKidProfile(kidId: string) {
  const kid = await User.findById(kidId);
  if (!kid || kid.role !== 'kid') return null;

  const { xpInLevel, xpToNext } = calculateLevel(kid.xp);
  const recentTransactions = await PointTransaction.find({ kidId: kid._id })
    .sort({ createdAt: -1 })
    .limit(20);
  const pendingCompletions = await TaskCompletion.countDocuments({
    kidId: kid._id,
    status: 'pending',
  });

  return {
    ...formatKid(kid),
    xpToNextLevel: xpToNext,
    xpProgress: xpInLevel,
    recentTransactions: recentTransactions.map((t) => ({
      _id: t._id.toString(),
      kidId: t.kidId.toString(),
      familyId: t.familyId.toString(),
      amount: t.amount,
      type: t.type,
      description: t.description,
      referenceId: t.referenceId?.toString(),
      createdAt: t.createdAt.toISOString(),
    })),
    pendingCompletions,
  };
}

function formatKid(kid: IUser) {
  return {
    _id: kid._id.toString(),
    role: kid.role,
    familyId: kid.familyId.toString(),
    displayName: kid.displayName,
    avatar: kid.avatar,
    username: kid.username,
    points: kid.points,
    level: kid.level,
    xp: kid.xp,
    streak: kid.streak,
    lastActiveDate: kid.lastActiveDate,
    badges: kid.badges,
    uiTheme: kid.uiTheme || defaultUiThemeForRole('kid'),
    createdAt: kid.createdAt.toISOString(),
  };
}
