import { calculateLevel } from '@kidsapp/shared';
import { IUser, User } from '../models/User';
import { PointTransaction } from '../models/PointTransaction';
import { TaskCompletion } from '../models/TaskCompletion';
import { todayString } from '../utils/format';

const DAILY_BONUS = 10;
const STREAK_BONUSES: Record<number, number> = {
  3: 25,
  7: 50,
  30: 200,
};

export async function processDailyLogin(kid: IUser): Promise<{ dailyBonus: number; streakBonus: number }> {
  const today = todayString();
  let dailyBonus = 0;
  let streakBonus = 0;

  if (kid.lastActiveDate === today) {
    return { dailyBonus: 0, streakBonus: 0 };
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
  dailyBonus = DAILY_BONUS;
  kid.points += dailyBonus;
  kid.xp += dailyBonus;

  await PointTransaction.create({
    kidId: kid._id,
    familyId: kid.familyId,
    amount: dailyBonus,
    type: 'daily',
    description: 'בונוס יומי',
  });

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

  return { dailyBonus, streakBonus };
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
