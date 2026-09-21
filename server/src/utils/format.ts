import { defaultUiThemeForRole, resolvedRewardIcon } from '@kidsapp/shared';
import type { RewardCategory } from '@kidsapp/shared';
import { IUser } from '../models/User';
import { ITask } from '../models/Task';
import { ITaskCompletion } from '../models/TaskCompletion';
import { IFamilyChallenge } from '../models/FamilyChallenge';

export function formatUser(user: IUser) {
  return {
    _id: user._id.toString(),
    role: user.role,
    familyId: user.familyId.toString(),
    displayName: user.displayName,
    avatar: user.avatar,
    email: user.email,
    username: user.username,
    points: user.points,
    level: user.level,
    xp: user.xp,
    streak: user.streak,
    lastActiveDate: user.lastActiveDate,
    learningStreak: user.learningStreak ?? 0,
    lastLearningDate: user.lastLearningDate,
    badges: user.badges,
    uiTheme: user.uiTheme || defaultUiThemeForRole(user.role),
    ownedCosmetics: user.ownedCosmetics ?? [],
    equippedFrame: user.equippedFrame,
    equippedEffect: user.equippedEffect,
    rentalAvatar:
      user.rentalAvatar && user.rentalUntilDate && user.rentalUntilDate >= todayString()
        ? user.rentalAvatar
        : undefined,
    goalRewardId: user.goalRewardId?.toString(),
    grade: user.role === 'kid' ? user.grade ?? undefined : undefined,
    heroLine: user.role === 'kid' && user.heroLine?.trim() ? user.heroLine.trim() : undefined,
    createdAt: user.createdAt.toISOString(),
  };
}

export function formatTask(task: ITask, completionStatus?: string) {
  return {
    _id: task._id.toString(),
    familyId: task.familyId.toString(),
    title: task.title,
    description: task.description,
    category: task.category,
    points: task.points,
    recurrence: task.recurrence,
    assignedTo: task.assignedTo.toString(),
    icon: task.icon,
    isActive: task.isActive,
    learningPackId: task.learningPackId,
    createdAt: task.createdAt.toISOString(),
    ...(completionStatus !== undefined ? { completionStatus } : {}),
  };
}

export function formatCompletion(c: ITaskCompletion) {
  const taskRef = c.taskId as unknown;
  const kidRef = c.kidId as unknown;
  const taskId =
    taskRef && typeof taskRef === 'object' && '_id' in (taskRef as object)
      ? String((taskRef as { _id: { toString(): string } })._id)
      : String(taskRef);
  const kidId =
    kidRef && typeof kidRef === 'object' && '_id' in (kidRef as object)
      ? String((kidRef as { _id: { toString(): string } })._id)
      : String(kidRef);

  return {
    _id: c._id.toString(),
    taskId,
    kidId,
    familyId: c.familyId.toString(),
    status: c.status,
    submittedAt: c.submittedAt.toISOString(),
    reviewedAt: c.reviewedAt?.toISOString(),
    reviewedBy: c.reviewedBy?.toString(),
    proofPhoto: c.proofPhoto,
    rejectNote: c.rejectNote,
  };
}

export function formatFamilyChallenge(doc: IFamilyChallenge) {
  return {
    _id: doc._id.toString(),
    familyId: doc.familyId.toString(),
    weekKey: doc.weekKey,
    title: doc.title,
    targetCount: doc.targetCount,
    progress: doc.progress,
    rewardTitle: doc.rewardTitle,
    rewardPoints: doc.rewardPoints,
    completed: doc.completed,
    claimedAt: doc.claimedAt?.toISOString(),
  };
}

export function formatReward(r: {
  _id: { toString(): string };
  familyId: { toString(): string };
  title: string;
  description?: string;
  cost: number;
  category: string;
  icon?: string;
  imageUrl?: string;
  requiresApproval?: boolean;
  isActive?: boolean;
  createdAt: Date;
}) {
  return {
    _id: r._id.toString(),
    familyId: r.familyId.toString(),
    title: r.title,
    description: r.description,
    cost: r.cost,
    category: r.category,
    icon: resolvedRewardIcon(r.title, r.icon, r.category as RewardCategory),
    imageUrl: r.imageUrl,
    requiresApproval: r.requiresApproval,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
  };
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

/** ISO week key e.g. 2026-W12 (Monday-based, Asia/Jerusalem calendar day). */
export function currentWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function startOfIsoWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}
