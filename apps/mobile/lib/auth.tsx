import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@kidsapp/shared';
import { api } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
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
  }, []);

  const logout = useCallback(async () => {
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
        prev.uiTheme === userData.uiTheme &&
        prev.badges.length === userData.badges.length &&
        prev.badges.every((b) => userData.badges.includes(b))
      ) {
        return prev;
      }
      return userData;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
