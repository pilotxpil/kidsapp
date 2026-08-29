import React, { createContext, useContext, useMemo, useCallback, useState } from 'react';
import type { TaskCategory, UiThemeId } from '@kidsapp/shared';
import { useAuth } from './auth';
import { api } from './api';
import { AppTheme, DEFAULT_THEME_ID, getTheme } from '../constants/themes';

interface ThemeContextValue extends AppTheme {
  setUiTheme: (id: UiThemeId) => Promise<void>;
  categoryIcon: (category: TaskCategory) => string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [pendingThemeId, setPendingThemeId] = useState<UiThemeId | null>(null);

  const serverThemeId: UiThemeId = user?.uiTheme ?? DEFAULT_THEME_ID;
  const themeId = pendingThemeId ?? serverThemeId;
  const theme = useMemo(() => getTheme(themeId), [themeId]);

  const setUiTheme = useCallback(
    async (id: UiThemeId) => {
      if (!user) return;
      setPendingThemeId(id);
      try {
        await api.updateMe({ uiTheme: id });
        await refreshUser();
      } finally {
        setPendingThemeId(null);
      }
    },
    [user, refreshUser]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...theme,
      setUiTheme,
      categoryIcon: (category: TaskCategory) =>
        theme.taskCategoryIcons[category] ?? theme.allCategoryIcon,
    }),
    [theme, themeId, setUiTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    const fallback = getTheme(DEFAULT_THEME_ID);
    return {
      ...fallback,
      setUiTheme: async () => {},
      categoryIcon: (category: TaskCategory) =>
        fallback.taskCategoryIcons[category] ?? fallback.allCategoryIcon,
    };
  }
  return ctx;
}

/** Shorthand for themed StyleSheet factories — always depend on theme.id */
export function useThemedStyles<T>(factory: (theme: ThemeContextValue) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme.id]);
}
