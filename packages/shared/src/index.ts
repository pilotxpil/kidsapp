export type UserRole = 'parent' | 'kid';

export type TaskCategory = 'home' | 'school' | 'social' | 'hobby' | 'sport';

export type TaskRecurrence = 'once' | 'daily' | 'weekly';

export type TaskCompletionStatus = 'available' | 'pending' | 'completed';

export type CompletionStatus = 'pending' | 'approved' | 'rejected';

export type RedemptionStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled';

export type PointTransactionType = 'task' | 'redemption' | 'bonus' | 'streak' | 'daily';

export type RewardCategory = 'gaming' | 'food' | 'screen' | 'privilege' | 'other';

export type UiThemeId = 'minecraft' | 'brawl' | 'roblox' | 'sparkle';

export const UI_THEME_IDS: UiThemeId[] = ['minecraft', 'brawl', 'roblox', 'sparkle'];

export const DEFAULT_KID_THEME_ID: UiThemeId = 'brawl';
export const DEFAULT_PARENT_THEME_ID: UiThemeId = 'roblox';

export function defaultUiThemeForRole(role: UserRole): UiThemeId {
  return role === 'kid' ? DEFAULT_KID_THEME_ID : DEFAULT_PARENT_THEME_ID;
}

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
  parentIds: string[];
  inviteCode?: string;
  settings: FamilySettings;
  createdAt: string;
}

export interface FamilyInviteInfo {
  inviteCode: string;
  parentCount: number;
  maxParents: number;
  parents: { displayName: string }[];
  canInvite: boolean;
}

/** Payload encoded in parent→kid login QR codes. */
export interface KidLoginQrPayload {
  v: 1;
  familyCode: string;
  username: string;
  displayName?: string;
}

export function buildKidLoginQrPayload(
  familyCode: string,
  username: string,
  displayName?: string
): string {
  const payload: KidLoginQrPayload = {
    v: 1,
    familyCode: familyCode.trim(),
    username: username.trim(),
    ...(displayName ? { displayName } : {}),
  };
  return JSON.stringify(payload);
}

export function parseKidLoginQr(raw: string): KidLoginQrPayload | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith('kidsquest://')) {
      const query = trimmed.includes('?') ? trimmed.split('?')[1] : '';
      const params = new URLSearchParams(query);
      const familyCode = params.get('code') ?? params.get('familyCode') ?? '';
      const username = params.get('user') ?? params.get('username') ?? '';
      if (familyCode && username) {
        return { v: 1, familyCode, username, displayName: params.get('name') ?? undefined };
      }
    }

    const data = JSON.parse(trimmed) as Partial<KidLoginQrPayload>;
    if (data.v === 1 && data.familyCode && data.username) {
      return {
        v: 1,
        familyCode: String(data.familyCode).trim(),
        username: String(data.username).trim(),
        displayName: data.displayName ? String(data.displayName) : undefined,
      };
    }
  } catch {
    return null;
  }

  return null;
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
  completionStatus?: TaskCompletionStatus;
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

export const TASK_RECURRENCE: Record<TaskRecurrence, { label: string; icon: string }> = {
  daily: { label: 'יומי', icon: '🔁' },
  once: { label: 'חד פעמי', icon: '1️⃣' },
  weekly: { label: 'שבועי', icon: '📅' },
};

export function taskCategoryIcon(category: TaskCategory): string {
  return TASK_CATEGORIES[category]?.icon ?? '🧱';
}

export interface TaskTemplate {
  title: string;
  description: string;
  category: TaskCategory;
  points: number;
}

/** Ready-made tasks for quick parent setup (matches demo seed). */
export const TASK_TEMPLATES: TaskTemplate[] = [
  { title: 'לסדר את החדר', description: 'לסדר את המיטה, לארגן צעצועים ולנקות את הרצפה', category: 'home', points: 20 },
  { title: 'לעשות שיעורי בית', description: 'להשלים את כל המטלות שניתנו בבית הספר', category: 'school', points: 30 },
  { title: 'לתרגל כדורגל', description: 'תרגול כדורגל או משחק בחוץ', category: 'sport', points: 25 },
  { title: 'לעזור בארוחת ערב', description: 'לעזור בהכנה, הגשה או ניקוי אחרי הארוחה', category: 'home', points: 15 },
  { title: 'לקרוא 20 דקות', description: 'קריאה שקטה של ספר או סיפור', category: 'school', points: 20 },
  { title: 'לצאת עם חבר', description: 'בילוי חברתי מחוץ לבית', category: 'social', points: 15 },
  { title: 'חוג רובוטיקה', description: 'השתתפות בחוג רובוטיקה או פרויקט', category: 'hobby', points: 35 },
];

export const REWARD_CATEGORIES: Record<RewardCategory, { label: string; icon: string }> = {
  gaming: { label: 'גיימינג', icon: '⛏️' },
  food: { label: 'אוכל', icon: '🍖' },
  screen: { label: 'מסך', icon: '🖥️' },
  privilege: { label: 'הרשאות', icon: '✨' },
  other: { label: 'אחר', icon: '📦' },
};

export interface RewardTemplate {
  title: string;
  description: string;
  icon: string;
  cost: number;
  category: RewardCategory;
}

/** Ready-made rewards for quick parent setup. */
export const REWARD_TEMPLATES: RewardTemplate[] = [
  { title: '80 Robux', description: 'רובוקס לרובלוקס', icon: '🎮', cost: 500, category: 'gaming' },
  { title: 'Brawl Stars Gems', description: '100 ג׳מס לבראול סטארס', icon: '💎', cost: 400, category: 'gaming' },
  { title: 'Minecraft Coins', description: 'מטבעות למיינקראפט', icon: '⛏️', cost: 350, category: 'gaming' },
  { title: 'הזמנת פיצה', description: 'פיצה מהמסעדה האהובה', icon: '🍕', cost: 800, category: 'food' },
  { title: '30 דק מסך', description: 'זמן מסך בונוס', icon: '📱', cost: 150, category: 'screen' },
];

export const AVATARS = ['🐷', '🐮', '🐑', '🐔', '🐺', '🐱', '🧟', '🕷️', '🐉', '🦇', '🐝', '🐢'];

export const PARENT_AVATARS = ['👨‍👩‍👧‍👦', '👨', '👩', '🧔', '👩‍🦱', '🧑', '👴', '👵', '🦁', '🐻'];

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
