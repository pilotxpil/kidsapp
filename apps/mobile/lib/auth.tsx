import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@kidsapp/shared';
import { api } from './api';
import { registerPushNotifications, unregisterPushNotifications } from './push';

type UserProgressPatch = Partial<Pick<User, 'points' | 'level' | 'xp' | 'streak' | 'badges'>>;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  patchUser: (partial: UserProgressPatch) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  patchUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await api.getToken();
        if (token) {
          const { user } = await api.getMe();
          setUser(user);
          void registerPushNotifications();
        }
      } catch {
        await api.clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (token: string, userData: User) => {
    await api.saveToken(token);
    setUser(userData);
    void registerPushNotifications();
  }, []);

  const logout = useCallback(async () => {
    await unregisterPushNotifications();
    await api.clearToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { user: userData } = await api.getMe();
    setUser((prev) => {
      if (
        prev &&
        prev._id === userData._id &&
        prev.points === userData.points &&
        prev.level === userData.level &&
        prev.xp === userData.xp &&
        prev.streak === userData.streak &&
        prev.displayName === userData.displayName &&
        prev.uiTheme === userData.uiTheme &&
        prev.avatar === userData.avatar &&
        prev.badges.length === userData.badges.length &&
        prev.badges.every((b) => userData.badges.includes(b))
      ) {
        return prev;
      }
      return userData;
    });
  }, []);

  const patchUser = useCallback((partial: UserProgressPatch) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, patchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
