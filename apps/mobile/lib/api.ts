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
  DailyStarStatus,
  DailyStarClaimResult,
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
        throw new Error('השרת לא מגיב — ודא שהשרת רץ והטלפון על אותה רשת WiFi');
      }
      if (err.message === 'Network request failed' || err.message.includes('Network')) {
        throw new Error('לא ניתן להתחבר לשרת — ודא שהטלפון והמחשב על אותה רשת WiFi');
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

  parentRegister(email: string, password: string, displayName: string, familyName: string) {
    return request<AuthResponse>('/auth/parent/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, familyName }),
    });
  },

  parentLogin(email: string, password: string) {
    return request<AuthResponse>('/auth/parent/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  kidLogin(username: string, pin: string) {
    return request<AuthResponse & { dailyStarAvailable?: boolean }>('/auth/kid/login', {
      method: 'POST',
      body: JSON.stringify({ username, pin }),
    });
  },

  getMe() {
    return request<{ user: User }>('/auth/me');
  },

  updateMe(data: { uiTheme?: UiThemeId }) {
    return request<{ user: User }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getTasks(kidId?: string) {
    const query = kidId ? `?kidId=${kidId}` : '';
    return request<{ tasks: Task[] }>(`/tasks${query}`);
  },

  createTask(data: Omit<Partial<Task>, 'assignedTo'> & { assignedTo: string | string[] }) {
    return request<{ task: Task; tasks: Task[] }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

  completeTask(id: string) {
    return request(`/tasks/${id}/complete`, { method: 'POST' });
  },

  getPendingCompletions() {
    return request<{ completions: any[] }>('/tasks/completions/pending');
  },

  approveCompletion(id: string, action: 'approve' | 'reject') {
    return request(`/tasks/completions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action }),
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

  createKid(data: { displayName: string; username: string; pin: string; avatar: string }) {
    return request<{ kid: User }>('/kids', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateKid(id: string, data: { uiTheme?: UiThemeId; avatar?: string; displayName?: string }) {
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

  getTransactions(id: string) {
    return request<{ transactions: any[] }>(`/kids/${id}/transactions`);
  },

  getLeaderboard() {
    return request<{ leaderboard: any[] }>('/kids/leaderboard');
  },

  getDashboard() {
    return request<{ dashboard: ParentDashboard }>('/kids/dashboard');
  },
};
