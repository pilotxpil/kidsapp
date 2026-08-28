export type UserRole = 'parent' | 'kid';

export type TaskCategory = 'home' | 'school' | 'social' | 'hobby' | 'sport';

export type TaskRecurrence = 'once' | 'daily' | 'weekly';

export type CompletionStatus = 'pending' | 'approved' | 'rejected';

export type RedemptionStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled';

export type PointTransactionType = 'task' | 'redemption' | 'bonus' | 'streak' | 'daily';

export type RewardCategory = 'gaming' | 'food' | 'screen' | 'privilege' | 'other';

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
