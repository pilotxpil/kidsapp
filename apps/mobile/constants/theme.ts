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

/** Static Roblox defaults for parent auth screens (no dynamic theme yet). */
import { getTheme } from './themes';
const _parent = getTheme('roblox');
export const colors = _parent.colors;
export const borderRadius = _parent.borderRadius;
export const gradientBg = _parent.gradientBg;
export const blockBorder = _parent.cardBorder;

export const kidAuthTheme = getTheme('brawl');
