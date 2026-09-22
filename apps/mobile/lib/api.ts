import { API_URL } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AuthResponse,
  User,
  Task,
  Reward,
  KidProfile,
  ParentDashboard,
  UiThemeId,
  FamilyInviteInfo,
  DailyStarStatus,
  DailyStarClaimResult,
  FortuneWheelStatus,
  FortuneWheelSpinResult,
  TreasureChestStatus,
  TreasureChestOpenResult,
  FamilyTaskTemplate,
  LearningPackSummary,
  LearningPackDetail,
  LearningCheckResult,
  PointTransaction,
  LearningCatalogItem,
  LearningCategory,
  PushPlatform,
  KidDailyWord,
  KidDailyRiddle,
  ShopFreebies,
  BadgeUnlock,
} from '@kidsapp/shared';

const TOKEN_KEY = 'kidsapp_token';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const text = await res.text();
    let data: Record<string, unknown> = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('תגובה לא תקינה מהשרת');
      }
    }

    if (!res.ok) {
      throw new Error((data.error as string) || 'שגיאה בשרת');
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('השרת לא מגיב. בדקו את החיבור לאינטרנט ונסו שוב.');
      }
      if (err.message === 'Network request failed' || err.message.includes('Network')) {
        throw new Error('לא ניתן להתחבר לשרת. בדקו את החיבור לאינטרנט ונסו שוב.');
      }
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  async saveToken(token: string) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async clearToken() {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },

  async getToken() {
    return getToken();
  },

  parentRegister(
    email: string,
    password: string,
    displayName: string,
    familyName?: string,
    inviteCode?: string
  ) {
    return request<AuthResponse>('/auth/parent/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, familyName, inviteCode }),
    });
  },

  parentLogin(email: string, password: string) {
    return request<AuthResponse>('/auth/parent/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  kidLogin(username: string, pin: string, familyCode: string) {
    return request<
      AuthResponse & {
        dailyGiftAvailable?: boolean;
        dailyStarAvailable?: boolean;
        avatarGiftJustUnlocked?: boolean;
      }
    >('/auth/kid/login', {
      method: 'POST',
      body: JSON.stringify({ username, pin, familyCode }),
    });
  },

  getMe() {
    return request<{ user: User; avatarGiftJustUnlocked?: boolean }>('/auth/me');
  },

  updateMe(data: { uiTheme?: UiThemeId; displayName?: string; avatar?: string; heroLine?: string }) {
    return request<{ user: User }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getTasks(kidId?: string) {
    const query = kidId ? `?kidId=${kidId}` : '';
    return request<{ tasks: Task[] }>(`/tasks${query}`);
  },

  createTask(
    data: Omit<Partial<Task>, 'assignedTo'> & {
      assignedTo: string | string[];
      saveAsTemplate?: boolean;
    }
  ) {
    return request<{ task: Task; tasks: Task[] }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getTaskTemplates() {
    return request<{ templates: FamilyTaskTemplate[] }>('/tasks/templates');
  },

  deleteTaskTemplate(id: string) {
    return request(`/tasks/templates/${id}`, { method: 'DELETE' });
  },

  updateTask(id: string, data: Partial<Task>) {
    return request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteTask(id: string) {
    return request(`/tasks/${id}`, { method: 'DELETE' });
  },

  completeTask(id: string, proofPhoto?: string) {
    return request(`/tasks/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(proofPhoto ? { proofPhoto } : {}),
    });
  },

  getPendingCompletions() {
    return request<{ completions: any[] }>('/tasks/completions/pending');
  },

  approveCompletion(id: string, action: 'approve' | 'reject', rejectNote?: string) {
    return request(`/tasks/completions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action, rejectNote }),
    });
  },

  getRewards() {
    return request<{ rewards: Reward[] }>('/rewards');
  },

  createReward(data: Partial<Reward>) {
    return request<{ reward: Reward }>('/rewards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateReward(id: string, data: Partial<Reward>) {
    return request(`/rewards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteReward(id: string) {
    return request(`/rewards/${id}`, { method: 'DELETE' });
  },

  redeemReward(id: string) {
    return request(`/rewards/${id}/redeem`, { method: 'POST' });
  },

  getPendingRedemptions() {
    return request<{ redemptions: any[] }>('/rewards/redemptions/pending');
  },

  approveRedemption(id: string, action: 'approve' | 'reject') {
    return request(`/rewards/redemptions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  getKids() {
    return request<{ kids: User[] }>('/kids');
  },

  createKid(data: {
    displayName: string;
    username: string;
    pin: string;
    avatar: string;
    grade?: number;
  }) {
    return request<{ kid: User }>('/kids', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  awardKidBonus(id: string, amount: number, reason?: string) {
    return request<{ kid: User; amount: number; reason: string }>(`/kids/${id}/bonus`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
  },

  updateKid(
    id: string,
    data: {
      uiTheme?: UiThemeId;
      avatar?: string;
      displayName?: string;
      username?: string;
      pin?: string;
      grade?: number | null;
    }
  ) {
    return request<{ kid: User }>(`/kids/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getKidProfile(id: string) {
    return request<{ profile: KidProfile }>(`/kids/${id}/profile`);
  },

  getDailyStar(id: string) {
    return request<{ status: DailyStarStatus }>(`/kids/${id}/daily-star`);
  },

  claimDailyStar(id: string) {
    return request<DailyStarClaimResult>(`/kids/${id}/daily-star/claim`, { method: 'POST' });
  },

  getFortuneWheel(id: string) {
    return request<{ status: FortuneWheelStatus }>(`/kids/${id}/fortune-wheel`);
  },

  spinFortuneWheel(id: string) {
    return request<FortuneWheelSpinResult>(`/kids/${id}/fortune-wheel/spin`, { method: 'POST' });
  },

  getTreasureChest(id: string) {
    return request<{ status: TreasureChestStatus }>(`/kids/${id}/treasure-chest`);
  },

  openTreasureChest(id: string) {
    return request<TreasureChestOpenResult>(`/kids/${id}/treasure-chest/open`, { method: 'POST' });
  },

  getDailyWord(id: string) {
    return request<{ dailyWord: KidDailyWord }>(`/kids/${id}/daily-word`);
  },

  getDailyRiddle(id: string) {
    return request<{ dailyRiddle: KidDailyRiddle }>(`/kids/${id}/daily-riddle`);
  },

  appealDailyRiddle(id: string) {
    return request<{ dailyRiddle: KidDailyRiddle }>(`/kids/${id}/daily-riddle/appeal`, {
      method: 'POST',
    });
  },

  reviewDailyRiddleAppeal(id: string, action: 'approve' | 'reject') {
    return request<{ ok: true; points?: number }>(`/kids/${id}/daily-riddle/appeal/review`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  guessDailyRiddle(id: string, guess: string) {
    return request<{
      dailyRiddle: KidDailyRiddle;
      correct: boolean;
      pointsAwarded?: number;
      points?: number;
      level?: number;
      xp?: number;
      newBadges?: BadgeUnlock[];
    }>(`/kids/${id}/daily-riddle/guess`, {
      method: 'POST',
      body: JSON.stringify({ guess }),
    });
  },

  getShopFreebies(id: string) {
    return request<{ freebies: ShopFreebies; kid: User }>(`/kids/${id}/shop-freebies`);
  },

  claimShopPoints(id: string) {
    return request<{ freebies: ShopFreebies; points: number; kid: User }>(
      `/kids/${id}/shop-freebies/points`,
      { method: 'POST' }
    );
  },

  claimShopRental(id: string) {
    return request<{
      freebies: ShopFreebies;
      rental: { id: string; label: string };
      kid: User;
    }>(`/kids/${id}/shop-freebies/rental`, { method: 'POST' });
  },

  reviewDailyWord(id: string, action: 'approve' | 'reject') {
    return request<{ ok: true; points?: number }>(`/kids/${id}/daily-word/review`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  getTransactions(id: string) {
    return request<{ transactions: PointTransaction[] }>(`/kids/${id}/transactions`);
  },

  getLeaderboard() {
    return request<{ leaderboard: any[] }>('/kids/leaderboard');
  },

  getDashboard() {
    return request<{ dashboard: ParentDashboard }>('/kids/dashboard');
  },

  getFamilyInvite() {
    return request<FamilyInviteInfo>('/family/invite');
  },

  getLearningPacks() {
    return request<{ packs: LearningPackSummary[]; assignedOnly?: boolean }>('/learning/packs');
  },

  getLearningCatalog(params?: {
    search?: string;
    category?: LearningCategory;
    grade?: number;
    grades?: number[];
  }) {
    const q = new URLSearchParams();
    if (params?.search?.trim()) q.set('search', params.search.trim());
    if (params?.category) q.set('category', params.category);
    if (params?.grades?.length) q.set('grades', params.grades.join(','));
    else if (params?.grade != null) q.set('grade', String(params.grade));
    const query = q.toString();
    return request<{ items: LearningCatalogItem[] }>(
      `/learning/catalog${query ? `?${query}` : ''}`
    );
  },

  assignLearningPack(
    packId: string,
    kidIds: string[],
    options?: { pointsPerActivity?: number; difficulty?: import('@kidsapp/shared').LearningDifficulty }
  ) {
    return request<{
      packId: string;
      assignedKidIds: string[];
      pointsPerActivity: number;
      difficulty: import('@kidsapp/shared').LearningDifficulty;
    }>('/learning/assign', {
      method: 'POST',
      body: JSON.stringify({
        packId,
        kidIds,
        pointsPerActivity: options?.pointsPerActivity,
        difficulty: options?.difficulty,
      }),
    });
  },

  createCustomLearningPack(pack: import('@kidsapp/shared').LearningPackInput) {
    return request<{ pack: import('@kidsapp/shared').LearningPack }>('/learning/custom-packs', {
      method: 'POST',
      body: JSON.stringify(pack),
    });
  },

  updateCustomLearningPack(packId: string, pack: import('@kidsapp/shared').LearningPackInput) {
    return request<{ pack: import('@kidsapp/shared').LearningPack }>(
      `/learning/custom-packs/${encodeURIComponent(packId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(pack),
      }
    );
  },

  deleteCustomLearningPack(packId: string) {
    return request<{ success: boolean; packId: string }>(
      `/learning/custom-packs/${encodeURIComponent(packId)}`,
      { method: 'DELETE' }
    );
  },

  importLearningPacks(payload: unknown) {
    return request<{
      packs: import('@kidsapp/shared').LearningPack[];
      errors?: string[];
    }>('/learning/custom-packs/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  exportLearningPack(packId: string) {
    return request<{ pack: import('@kidsapp/shared').LearningPack }>(
      `/learning/custom-packs/${encodeURIComponent(packId)}/export`
    );
  },

  getLearningPack(packId: string) {
    return request<LearningPackDetail>(`/learning/packs/${encodeURIComponent(packId)}`);
  },

  checkLearningAnswer(packId: string, activityId: string, answer: string | string[]) {
    return request<LearningCheckResult>(
      `/learning/packs/${encodeURIComponent(packId)}/check`,
      {
        method: 'POST',
        body: JSON.stringify({ activityId, answer }),
      }
    );
  },

  registerPushToken(token: string, platform?: PushPlatform) {
    return request<{ success: boolean }>('/push/register', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  },

  unregisterPushToken(token: string) {
    return request<{ success: boolean }>('/push/unregister', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  getFamilyChallenge() {
    return request<{ challenge: import('@kidsapp/shared').FamilyChallenge }>('/family/challenge');
  },

  updateFamilyChallenge(data: {
    title?: string;
    targetCount?: number;
    rewardTitle?: string;
    rewardPoints?: number;
  }) {
    return request<{ challenge: import('@kidsapp/shared').FamilyChallenge }>('/family/challenge', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getFamilyAchievements() {
    return request<{
      achievements: import('@kidsapp/shared').FamilyAchievementEntry[];
      weekKingCount: number;
    }>('/family/achievements');
  },

  getPersonalGoal(kidId?: string) {
    const query = kidId ? `?kidId=${kidId}` : '';
    return request<{ goal: import('@kidsapp/shared').PersonalGoal | null }>(`/kids/goal${query}`);
  },

  setPersonalGoal(rewardId: string | null, kidId?: string) {
    return request<{ goal: import('@kidsapp/shared').PersonalGoal | null }>('/kids/goal', {
      method: 'PUT',
      body: JSON.stringify({ rewardId, kidId }),
    });
  },

  getCosmetics(kidId?: string) {
    const query = kidId ? `?kidId=${kidId}` : '';
    return request<{
      items: import('@kidsapp/shared').CosmeticItem[];
      owned: string[];
      equippedFrame?: string;
      equippedEffect?: string;
      avatar: string;
      points: number;
      rentalAvatar?: string;
    }>(`/kids/cosmetics${query}`);
  },

  buyCosmetic(itemId: string, kidId?: string) {
    return request<{ kid: User; item: import('@kidsapp/shared').CosmeticItem }>(
      `/kids/cosmetics/${itemId}/buy`,
      {
        method: 'POST',
        body: JSON.stringify(kidId ? { kidId } : {}),
      }
    );
  },

  equipCosmetic(itemId: string, kidId?: string) {
    return request<{ kid: User }>(`/kids/cosmetics/${itemId}/equip`, {
      method: 'POST',
      body: JSON.stringify(kidId ? { kidId } : {}),
    });
  },

  getLearningMistakes(kidId: string) {
    return request<{ mistakes: import('@kidsapp/shared').LearningMistakeEntry[] }>(
      `/learning/mistakes?kidId=${kidId}`
    );
  },

  getLearningResults(kidId: string) {
    return request<{ results: import('@kidsapp/shared').LearningAnswerReview[] }>(
      `/learning/results?kidId=${kidId}`
    );
  },
};
