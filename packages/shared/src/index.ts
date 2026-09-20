export * from './learning';

export type UserRole = 'parent' | 'kid';

export type TaskCategory = 'home' | 'school' | 'social' | 'hobby' | 'sport';

export type TaskRecurrence = 'once' | 'daily' | 'weekly';

export type TaskCompletionStatus = 'available' | 'pending' | 'completed';

export type CompletionStatus = 'pending' | 'approved' | 'rejected';

export type RedemptionStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled';

export type PointTransactionType = 'task' | 'redemption' | 'bonus' | 'streak' | 'daily';

/** Max points a parent can award manually in one action. */
export const MAX_MANUAL_BONUS_POINTS = 500;

export type RewardCategory = 'gaming' | 'food' | 'screen' | 'privilege' | 'other';

export type UiThemeId = 'ember' | 'minecraft' | 'brawl' | 'roblox' | 'sparkle';

export const UI_THEME_IDS: UiThemeId[] = ['ember', 'minecraft', 'brawl', 'roblox', 'sparkle'];

export const DEFAULT_KID_THEME_ID: UiThemeId = 'ember';
export const DEFAULT_PARENT_THEME_ID: UiThemeId = 'roblox';

export function defaultUiThemeForRole(role: UserRole): UiThemeId {
  return role === 'kid' ? DEFAULT_KID_THEME_ID : DEFAULT_PARENT_THEME_ID;
}

/** Daily gift star — tap this many times to claim (Brawl Stars–style). */
export const DAILY_STAR_TAPS = 4;
/** Possible point amounts for the daily star (picked at claim time). */
export const DAILY_STAR_REWARDS = [5, 8, 10, 12, 15, 20] as const;

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

/** Public web origin for kid login links (production). */
export const KID_LOGIN_WEB_ORIGIN = 'https://kids.synaboard.com';

function kidLoginQuery(
  familyCode: string,
  username: string,
  displayName?: string
): string {
  const params = new URLSearchParams({
    code: familyCode.trim(),
    user: username.trim(),
  });
  if (displayName?.trim()) params.set('name', displayName.trim());
  return params.toString();
}

/** HTTPS link the kid can open (web or phone) — fills family code + username. */
export function buildKidLoginShareLink(
  familyCode: string,
  username: string,
  displayName?: string,
  origin: string = KID_LOGIN_WEB_ORIGIN
): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/kid-login?${kidLoginQuery(familyCode, username, displayName)}`;
}

/** App-scheme deep link for installed clients. */
export function buildKidLoginDeepLink(
  familyCode: string,
  username: string,
  displayName?: string
): string {
  return `kidsquest://kid-login?${kidLoginQuery(familyCode, username, displayName)}`;
}

/** QR / share payload — prefer HTTPS so camera scan opens the login page. */
export function buildKidLoginQrPayload(
  familyCode: string,
  username: string,
  displayName?: string,
  origin: string = KID_LOGIN_WEB_ORIGIN
): string {
  return buildKidLoginShareLink(familyCode, username, displayName, origin);
}

function payloadFromParams(params: URLSearchParams): KidLoginQrPayload | null {
  const familyCode = (params.get('code') ?? params.get('familyCode') ?? '').trim();
  const username = (params.get('user') ?? params.get('username') ?? '').trim();
  if (!familyCode || !username) return null;
  const name = params.get('name') ?? params.get('displayName');
  return {
    v: 1,
    familyCode,
    username,
    displayName: name?.trim() || undefined,
  };
}

export function parseKidLoginQr(raw: string): KidLoginQrPayload | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    if (
      trimmed.startsWith('kidsquest://') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.includes('/kid-login')
    ) {
      const query = trimmed.includes('?') ? trimmed.split('?')[1].split('#')[0] : '';
      const fromUrl = payloadFromParams(new URLSearchParams(query));
      if (fromUrl) return fromUrl;
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
  learningStreak: number;
  lastLearningDate?: string;
  badges: string[];
  uiTheme?: UiThemeId;
  ownedCosmetics: string[];
  equippedFrame?: string;
  equippedEffect?: string;
  goalRewardId?: string;
  /** Kid school grade 1–6 (כיתה א–ו). */
  grade?: number;
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
  /** When set, completing the linked learning pack auto-approves this homework task. */
  learningPackId?: string;
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
  /** Optional kid proof photo (data URL or path). */
  proofPhoto?: string;
  /** Parent note when rejecting. */
  rejectNote?: string;
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
  recurrence?: TaskRecurrence;
}

/** Parent-saved chore for the family's quick-task list. */
export interface FamilyTaskTemplate {
  _id: string;
  familyId: string;
  title: string;
  description: string;
  category: TaskCategory;
  points: number;
  recurrence: TaskRecurrence;
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

/** Push notification event types (payload `data.type`). */
export type PushNotificationType =
  | 'task_assigned'
  | 'task_submitted'
  | 'task_approved'
  | 'task_rejected'
  | 'reward_redeemed'
  | 'reward_approved'
  | 'reward_rejected'
  | 'learning_assigned'
  | 'bonus_awarded'
  | 'tasks_incomplete_evening'
  | 'family_challenge_complete'
  | 'avatar_shop_gift';

export type PushPlatform = 'ios' | 'android' | 'web' | 'unknown';

export interface RegisterPushTokenRequest {
  token: string;
  platform?: PushPlatform;
}

export interface PushNotificationData {
  type: PushNotificationType;
  [key: string]: string;
}

export type CosmeticType = 'avatar' | 'frame' | 'effect';

export interface CosmeticItem {
  id: string;
  type: CosmeticType;
  cost: number;
  icon: string;
  label: string;
  /** Optional theme affinity for shop grouping. */
  themes?: UiThemeId[];
}

/** Cosmetics kids can buy with points (avatars / frames / effects). Sorted cheap → expensive. */
export const COSMETIC_ITEMS: CosmeticItem[] = [
  { id: 'classic-noob', type: 'avatar', cost: 0, icon: 'classic-noob', label: 'נוב קלאסי' },
  { id: 'fedora-flex', type: 'avatar', cost: 0, icon: 'fedora-flex', label: 'פדורה פלקס' },
  { id: 'stud-builder', type: 'avatar', cost: 0, icon: 'stud-builder', label: 'בנאי סטאד' },
  { id: 'tp-ninja', type: 'avatar', cost: 0, icon: 'tp-ninja', label: 'נינג׳ת נייר' },
  { id: 'sigma-jersey', type: 'avatar', cost: 0, icon: 'sigma-jersey', label: 'סיגמה 67' },
  { id: 'gym-hamster', type: 'avatar', cost: 0, icon: 'gym-hamster', label: 'אוגר חדר כושר' },
  { id: 'peel-ninja', type: 'avatar', cost: 0, icon: 'peel-ninja', label: 'נינג׳ת קליפה' },
  { id: 'guest-blank', type: 'avatar', cost: 20, icon: 'guest-blank', label: '404 לא נמצא' },
  { id: 'poop-rocket', type: 'avatar', cost: 20, icon: 'poop-rocket', label: 'קקי דחוף' },
  { id: 'fried-brain', type: 'avatar', cost: 20, icon: 'fried-brain', label: 'מוח מטוגן' },
  { id: 'ban-hammer', type: 'avatar', cost: 30, icon: 'ban-hammer', label: 'האמר באן' },
  { id: 'cam-flush', type: 'avatar', cost: 40, icon: 'cam-flush', label: 'מצלמת הדחה' },
  { id: 'obby-ninja', type: 'avatar', cost: 50, icon: 'obby-ninja', label: 'גרין נינג׳ה' },
  { id: 'visor-666', type: 'avatar', cost: 50, icon: 'visor-666', label: 'דארק בוי' },
  { id: 'ice-stare', type: 'avatar', cost: 50, icon: 'ice-stare', label: 'אייס מן' },
  { id: 'robux-tank', type: 'avatar', cost: 100, icon: 'robux-tank', label: 'גולד דיגר' },
  { id: 'glitch-hoodie', type: 'avatar', cost: 100, icon: 'glitch-hoodie', label: 'סייבר גיק' },
  { id: 'bowl-head', type: 'avatar', cost: 100, icon: 'bowl-head', label: 'ראש-אסלה' },
  { id: 'drip-poop', type: 'avatar', cost: 100, icon: 'drip-poop', label: 'קקי מזוקקי' },
  { id: 'stink-king', type: 'avatar', cost: 100, icon: 'stink-king', label: 'מלך הפוקים' },
  { id: 'skibidi-sigma', type: 'avatar', cost: 100, icon: 'skibidi-sigma', label: 'סקיבידי סיגמה' },
  { id: 'pizza-face', type: 'avatar', cost: 100, icon: 'pizza-face', label: 'פיצה פייס' },
  { id: 'chicken-jock', type: 'avatar', cost: 100, icon: 'chicken-jock', label: 'צ׳יקן ג׳וקי' },
];

export const SHOP_AVATAR_IDS = COSMETIC_ITEMS.filter((c) => c.type === 'avatar').map((c) => c.id);

export const FREE_AVATAR_ID = 'classic-noob';
export const DEFAULT_SHOP_AVATAR_ID = FREE_AVATAR_ID;
export const FREE_AVATAR_IDS = COSMETIC_ITEMS.filter((c) => c.type === 'avatar' && c.cost === 0).map((c) => c.id);

export function isFreeAvatar(id: string): boolean {
  return FREE_AVATAR_IDS.includes(id);
}

/** One-time gift + shop announcement (push once per kid). */
export const AVATAR_GIFT_CAMPAIGN = 'starter-noob-v1';
/** Sample paid avatars shown as a teaser in the kid picker. */
export const SHOP_TEASER_AVATAR_IDS = ['skibidi-sigma', 'pizza-face', 'ban-hammer', 'bowl-head'];

export function paidCosmeticItems(): CosmeticItem[] {
  return COSMETIC_ITEMS.filter((c) => c.cost > 0);
}

export function isAllowedKidAvatar(avatar: string): boolean {
  return AVATARS.includes(avatar) || SHOP_AVATAR_IDS.includes(avatar);
}

export function isAllowedParentAvatar(avatar: string): boolean {
  return PARENT_AVATARS.includes(avatar) || SHOP_AVATAR_IDS.includes(avatar);
}

export const DEFAULT_FAMILY_CHALLENGE_TARGET = 20;
export const DEFAULT_FAMILY_CHALLENGE_REWARD_POINTS = 50;

export interface FamilyChallenge {
  _id: string;
  familyId: string;
  weekKey: string;
  title: string;
  targetCount: number;
  progress: number;
  rewardTitle: string;
  rewardPoints: number;
  completed: boolean;
  claimedAt?: string;
}

export interface PersonalGoal {
  rewardId: string;
  rewardTitle: string;
  rewardCost: number;
  rewardIcon: string;
  currentPoints: number;
  progress: number;
}

export interface FamilyAchievementEntry {
  id: string;
  label: string;
  icon: string;
  description: string;
  kidId?: string;
  kidName?: string;
  kidAvatar?: string;
  earnedAt?: string;
}

export interface LearningMistakeEntry {
  packId: string;
  packTitle: string;
  activityId: string;
  questionPreview: string;
  mistakeCount: number;
}

/** Max base64 proof photo length stored on a completion (~300KB). */
export const MAX_PROOF_PHOTO_CHARS = 400_000;
