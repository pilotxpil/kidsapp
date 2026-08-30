import {
  calculateLevel,
  DAILY_STAR_TAPS,
  DAILY_STAR_BONUS,
  FORTUNE_WHEEL_SEGMENTS,
  TREASURE_CHEST_TASKS,
  type FortuneWheelSegment,
} from '@kidsapp/shared';
import { IUser, User } from '../models/User';
import { PointTransaction } from '../models/PointTransaction';
import { TaskCompletion } from '../models/TaskCompletion';
import { todayString } from '../utils/format';

const STREAK_BONUSES: Record<number, number> = {
  3: 25,
  7: 50,
  30: 200,
};

const WHEEL_DESC = 'גלגל מזל';
const CHEST_DESC = 'תיבת אוצר';

function isDevUnlimited(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function startOfUtcDay(): Date {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return start;
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

export async function getDailyStarStatus(kid: IUser) {
  const unlimited = isDevUnlimited();
  const claimedToday = await hasClaimedDailyStarToday(kid._id);
  const available = unlimited || !claimedToday;
  const streak = !claimedToday ? projectedStreak(kid) : kid.streak;
  const streakBonus = available && !claimedToday && STREAK_BONUSES[streak] ? STREAK_BONUSES[streak] : 0;
  const dailyBonus = available ? DAILY_STAR_BONUS : 0;

  return {
    available,
    tapsRequired: DAILY_STAR_TAPS,
    dailyBonus,
    streakBonus,
    totalPoints: dailyBonus + streakBonus,
    streak,
    unlimited,
  };
}

/** Login no longer awards points — the daily star claim does. */
export async function processDailyLogin(kid: IUser): Promise<{ dailyStarAvailable: boolean }> {
  const status = await getDailyStarStatus(kid);
  return { dailyStarAvailable: status.available };
}

export async function claimDailyStar(kid: IUser) {
  const today = todayString();
  const unlimited = isDevUnlimited();
  const claimedToday = await hasClaimedDailyStarToday(kid._id);

  if (claimedToday && !unlimited) {
    return { ok: false as const, error: 'כבר פתחת את הכוכב היום' };
  }

  // Dev re-claim: award daily bonus only, skip streak side-effects
  if (claimedToday && unlimited) {
    const dailyBonus = DAILY_STAR_BONUS;
    kid.points += dailyBonus;
    kid.xp += dailyBonus;
    await PointTransaction.create({
      kidId: kid._id,
      familyId: kid.familyId,
      amount: dailyBonus,
      type: 'daily',
      description: 'כוכב יומי (בדיקה)',
    });
    await updateLevelAndBadges(kid);
    await kid.save();

    return {
      ok: true as const,
      dailyBonus,
      streakBonus: 0,
      totalPoints: dailyBonus,
      streak: kid.streak,
      points: kid.points,
      level: kid.level,
      xp: kid.xp,
      unlimited: true,
    };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (kid.lastActiveDate === yesterdayStr) {
    kid.streak += 1;
  } else if (kid.lastActiveDate !== today) {
    kid.streak = 1;
  }

  kid.lastActiveDate = today;

  const dailyBonus = DAILY_STAR_BONUS;
  kid.points += dailyBonus;
  kid.xp += dailyBonus;

  await PointTransaction.create({
    kidId: kid._id,
    familyId: kid.familyId,
    amount: dailyBonus,
    type: 'daily',
    description: 'כוכב יומי',
  });

  let streakBonus = 0;
  if (STREAK_BONUSES[kid.streak]) {
    streakBonus = STREAK_BONUSES[kid.streak];
    kid.points += streakBonus;
    kid.xp += streakBonus;
    await PointTransaction.create({
      kidId: kid._id,
      familyId: kid.familyId,
      amount: streakBonus,
      type: 'streak',
      description: `בונוס רצף ${kid.streak} ימים`,
    });
  }

  await updateLevelAndBadges(kid);
  await kid.save();

  return {
    ok: true as const,
    dailyBonus,
    streakBonus,
    totalPoints: dailyBonus + streakBonus,
    streak: kid.streak,
    points: kid.points,
    level: kid.level,
    xp: kid.xp,
    unlimited,
  };
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
  const unlimited = isDevUnlimited();
  const spun = await hasSpunWheelToday(kid._id);
  return {
    available: unlimited || !spun,
    segments: FORTUNE_WHEEL_SEGMENTS,
    unlimited,
  };
}

export async function spinFortuneWheel(kid: IUser) {
  const unlimited = isDevUnlimited();
  const spun = await hasSpunWheelToday(kid._id);

  if (spun && !unlimited) {
    return { ok: false as const, error: 'כבר סובבת את הגלגל היום' };
  }

  const { index, segment } = pickWeightedSegment();
  await awardPoints(kid, segment.points, 'bonus', WHEEL_DESC);

  return {
    ok: true as const,
    segmentIndex: index,
    segment,
    pointsAwarded: segment.points,
    points: kid.points,
    level: kid.level,
    xp: kid.xp,
  };
}

async function countChestsOpened(kidId: IUser['_id']): Promise<number> {
  return PointTransaction.countDocuments({
    kidId,
    type: 'bonus',
    description: CHEST_DESC,
  });
}

export async function getTreasureChestStatus(kid: IUser) {
  const unlimited = isDevUnlimited();
  const approvedTasks = await TaskCompletion.countDocuments({
    kidId: kid._id,
    status: 'approved',
  });
  const chestsOpened = await countChestsOpened(kid._id);
  const chestsEarned = Math.floor(approvedTasks / TREASURE_CHEST_TASKS);
  const ready = unlimited || chestsEarned > chestsOpened;
  const progress = unlimited ? TREASURE_CHEST_TASKS : approvedTasks % TREASURE_CHEST_TASKS;

  return {
    ready,
    progress: ready && !unlimited ? TREASURE_CHEST_TASKS : progress,
    needed: TREASURE_CHEST_TASKS,
    approvedTasks,
    chestsOpened,
    unlimited,
  };
}

const CHEST_REWARDS = [15, 20, 25, 30, 40];

export async function openTreasureChest(kid: IUser) {
  const unlimited = isDevUnlimited();
  const status = await getTreasureChestStatus(kid);

  if (!status.ready && !unlimited) {
    return { ok: false as const, error: 'התיבה עדיין לא מוכנה' };
  }

  if (!unlimited) {
    const approvedTasks = status.approvedTasks;
    const chestsEarned = Math.floor(approvedTasks / TREASURE_CHEST_TASKS);
    if (chestsEarned <= status.chestsOpened) {
      return { ok: false as const, error: 'התיבה עדיין לא מוכנה' };
    }
  }

  const pointsAwarded = CHEST_REWARDS[Math.floor(Math.random() * CHEST_REWARDS.length)];
  await awardPoints(kid, pointsAwarded, 'bonus', CHEST_DESC);

  return {
    ok: true as const,
    pointsAwarded,
    points: kid.points,
    level: kid.level,
    xp: kid.xp,
  };
}

export async function awardPoints(
  kid: IUser,
  amount: number,
  type: 'task' | 'bonus',
  description: string,
  referenceId?: string
) {
  kid.points += amount;
  kid.xp += amount;
  await updateLevelAndBadges(kid);
  await kid.save();

  await PointTransaction.create({
    kidId: kid._id,
    familyId: kid.familyId,
    amount,
    type,
    description,
    referenceId,
  });
}

export async function deductPoints(kid: IUser, amount: number, description: string, referenceId?: string) {
  kid.points -= amount;
  await kid.save();

  await PointTransaction.create({
    kidId: kid._id,
    familyId: kid.familyId,
    amount: -amount,
    type: 'redemption',
    description,
    referenceId,
  });
}

async function updateLevelAndBadges(kid: IUser) {
  const { level } = calculateLevel(kid.xp);
  kid.level = level;

  const approvedCount = await TaskCompletion.countDocuments({
    kidId: kid._id,
    status: 'approved',
  });

  const newBadges: string[] = [];

  if (approvedCount >= 1 && !kid.badges.includes('first_task')) newBadges.push('first_task');
  if (approvedCount >= 50 && !kid.badges.includes('task_master')) newBadges.push('task_master');
  if (kid.streak >= 3 && !kid.badges.includes('streak_3')) newBadges.push('streak_3');
  if (kid.streak >= 7 && !kid.badges.includes('streak_7')) newBadges.push('streak_7');
  if (kid.streak >= 30 && !kid.badges.includes('streak_30')) newBadges.push('streak_30');
  if (level >= 5 && !kid.badges.includes('level_5')) newBadges.push('level_5');
  if (level >= 10 && !kid.badges.includes('level_10')) newBadges.push('level_10');

  kid.badges = [...new Set([...kid.badges, ...newBadges])];
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
    uiTheme: kid.uiTheme || 'minecraft',
    createdAt: kid.createdAt.toISOString(),
  };
}
