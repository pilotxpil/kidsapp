/** Shared layout spacing — theme-independent */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export { getTheme, DEFAULT_THEME_ID, THEMES, UI_THEME_OPTIONS } from './themes';
export type { AppTheme, ThemeColors } from './themes';

/** Static Minecraft defaults for auth/parent screens (no dynamic theme) */
import { getTheme } from './themes';
const _mc = getTheme('minecraft');
export const colors = _mc.colors;
export const borderRadius = _mc.borderRadius;
export const gradientBg = _mc.gradientBg;
export const blockBorder = _mc.cardBorder;
