export type UserRole = 'parent' | 'kid';

export type TaskCategory = 'home' | 'school' | 'social' | 'hobby' | 'sport';

export type TaskRecurrence = 'once' | 'daily' | 'weekly';

export type CompletionStatus = 'pending' | 'approved' | 'rejected';

export type RedemptionStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled';

export type PointTransactionType = 'task' | 'redemption' | 'bonus' | 'streak' | 'daily';

export type RewardCategory = 'gaming' | 'food' | 'screen' | 'privilege' | 'other';

export type UiThemeId = 'minecraft' | 'brawl' | 'roblox' | 'sparkle';

export const UI_THEME_IDS: UiThemeId[] = ['minecraft', 'brawl', 'roblox', 'sparkle'];

/** Daily gift star — tap this many times to claim (Brawl Stars–style). */
export const DAILY_STAR_TAPS = 4;
export const DAILY_STAR_BONUS = 10;

/** Approved tasks needed to unlock one treasure chest. @deprecated chest is now a random daily surprise */
export const TREASURE_CHEST_TASKS = 5;

/** ~22% of days offer a surprise chest (deterministic per kid + date). */
export const SURPRISE_CHEST_DAILY_CHANCE = 0.22;

export type DailyGiftType = 'star' | 'wheel';

export interface BadgeUnlock {
  id: string;
  xpAwarded: number;
}

export interface DailyStarStatus {
  available: boolean;
  tapsRequired: number;
  dailyBonus: number;
  streakBonus: number;
  totalPoints: number;
  streak: number;
}

export interface DailyStarClaimResult {
  dailyBonus: number;
  streakBonus: number;
  totalPoints: number;
  streak: number;
  points: number;
  level: number;
  xp: number;
  newBadges?: BadgeUnlock[];
}

export interface FortuneWheelSegment {
  id: string;
  label: string;
  points: number;
  color: string;
  /** Relative weight for RNG (higher = more common). */
  weight: number;
}

export const FORTUNE_WHEEL_SEGMENTS: FortuneWheelSegment[] = [
  { id: 'p5', label: '+5', points: 5, color: '#42A5F5', weight: 22 },
  { id: 'p10', label: '+10', points: 10, color: '#66BB6A', weight: 20 },
  { id: 'p8', label: '+8', points: 8, color: '#26C6DA', weight: 18 },
  { id: 'p15', label: '+15', points: 15, color: '#FFA726', weight: 14 },
  { id: 'p3', label: '+3', points: 3, color: '#90A4AE', weight: 12 },
  { id: 'p25', label: '+25', points: 25, color: '#AB47BC', weight: 8 },
  { id: 'p12', label: '+12', points: 12, color: '#EF5350', weight: 10 },
  { id: 'p50', label: '+50!', points: 50, color: '#FFD54F', weight: 3 },
];

export interface FortuneWheelStatus {
  available: boolean;
  segments: FortuneWheelSegment[];
}

export interface FortuneWheelSpinResult {
  segmentIndex: number;
  segment: FortuneWheelSegment;
  pointsAwarded: number;
  streakBonus?: number;
  streak: number;
  points: number;
  level: number;
  xp: number;
  newBadges?: BadgeUnlock[];
}

export interface TreasureChestStatus {
  ready: boolean;
}

export interface TreasureChestOpenResult {
  pointsAwarded: number;
  points: number;
  level: number;
  xp: number;
  newBadges?: BadgeUnlock[];
}

export interface FamilySettings {
  language: string;
  theme: string;
}

export interface Family {
  _id: string;
  name: string;
  parentId: string;
  settings: FamilySettings;
  createdAt: string;
}

export interface User {
  _id: string;
  role: UserRole;
  familyId: string;
  displayName: string;
  avatar: string;
  email?: string;
  username?: string;
  points: number;
  level: number;
  xp: number;
  streak: number;
  lastActiveDate?: string;
  badges: string[];
  uiTheme?: UiThemeId;
  createdAt: string;
}

export interface Task {
  _id: string;
  familyId: string;
  title: string;
  description: string;
  category: TaskCategory;
  points: number;
  recurrence: TaskRecurrence;
  assignedTo: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
}

export interface TaskCompletion {
  _id: string;
  taskId: string;
  kidId: string;
  familyId: string;
  status: CompletionStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  task?: Task;
  kid?: User;
}

export interface Reward {
  _id: string;
  familyId: string;
  title: string;
  description: string;
  cost: number;
  category: RewardCategory;
  icon: string;
  imageUrl?: string;
  requiresApproval: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Redemption {
  _id: string;
  rewardId: string;
  kidId: string;
  familyId: string;
  status: RedemptionStatus;
  cost: number;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reward?: Reward;
  kid?: User;
}

export interface PointTransaction {
  _id: string;
  kidId: string;
  familyId: string;
  amount: number;
  type: PointTransactionType;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface KidProfile extends User {
  xpToNextLevel: number;
  xpProgress: number;
  recentTransactions: PointTransaction[];
  pendingCompletions: number;
}

export interface ParentDashboard {
  pendingCompletions: TaskCompletion[];
  pendingRedemptions: Redemption[];
  kids: User[];
  stats: {
    totalTasks: number;
    totalRewards: number;
    pendingApprovals: number;
  };
}

export const TASK_CATEGORIES: Record<TaskCategory, { label: string; icon: string }> = {
  home: { label: 'בית', icon: '🟩' },
  school: { label: 'לימודים', icon: '📖' },
  social: { label: 'חברתי', icon: '👨‍🌾' },
  hobby: { label: 'חוג', icon: '🎣' },
  sport: { label: 'ספורט', icon: '🏹' },
};

export function taskCategoryIcon(category: TaskCategory): string {
  return TASK_CATEGORIES[category]?.icon ?? '🧱';
}

export const REWARD_CATEGORIES: Record<RewardCategory, { label: string; icon: string }> = {
  gaming: { label: 'גיימינג', icon: '⛏️' },
  food: { label: 'אוכל', icon: '🍖' },
  screen: { label: 'מסך', icon: '🖥️' },
  privilege: { label: 'הרשאות', icon: '✨' },
  other: { label: 'אחר', icon: '📦' },
};

export const AVATARS = ['🐷', '🐮', '🐑', '🐔', '🐺', '🐱', '🧟', '🕷️', '🐉', '🦇', '🐝', '🐢'];

export const BADGES: Record<string, { label: string; icon: string; description: string }> = {
  first_task: { label: 'משימה ראשונה', icon: '💚', description: 'השלמת את המשימה הראשונה!' },
  streak_3: { label: 'רצף 3 ימים', icon: '🔥', description: '3 ימים ברצף!' },
  streak_7: { label: 'שבוע מושלם', icon: '💎', description: '7 ימים ברצף!' },
  streak_30: { label: 'חודש אגדי', icon: '👑', description: '30 ימים ברצף!' },
  level_5: { label: 'רמה 5', icon: '⚔️', description: 'הגעת לרמה 5!' },
  level_10: { label: 'אגדה', icon: '🗡️', description: 'הגעת לרמה 10!' },
  task_master: { label: 'מלך המטלות', icon: '⛏️', description: '50 משימות הושלמו!' },
  sport_star: { label: 'אלוף הספורט', icon: '🏹', description: '10 משימות ספורט!' },
  scholar: { label: 'תלמיד מצטיין', icon: '📖', description: '10 משימות לימודים!' },
};

/** One-time XP bonus when a badge is first earned. */
export const BADGE_REWARDS: Record<string, number> = {
  first_task: 10,
  streak_3: 15,
  streak_7: 30,
  streak_30: 100,
  level_5: 25,
  level_10: 50,
  task_master: 75,
  sport_star: 20,
  scholar: 20,
};

export function xpForLevel(level: number): number {
  return level * 100;
}

export function calculateLevel(xp: number): { level: number; xpInLevel: number; xpToNext: number } {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, xpInLevel: remaining, xpToNext: xpForLevel(level) };
}
