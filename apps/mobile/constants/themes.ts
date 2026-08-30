import { ViewStyle } from 'react-native';
import type { TaskCategory, UiThemeId } from '@kidsapp/shared';

type SfxName = 'tap' | 'complete' | 'gem' | 'coin' | 'error';

export interface ThemeColors {
  bg: string;
  bgDeep: string;
  bgCard: string;
  bgCardLight: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  danger: string;
  success: string;
  text: string;
  textMuted: string;
  textDark: string;
  gradientStart: string;
  gradientEnd: string;
  gold: string;
  emerald: string;
  diamond: string;
  streak: string;
  border: string;
  borderLight: string;
  borderDark: string;
  buttonShadow: string;
  confetti: string[];
  glow: string;
  cardShine: string;
}

export interface AppTheme {
  id: UiThemeId;
  name: string;
  subtitle: string;
  icon: string;
  sfx: SfxName;
  colors: ThemeColors;
  gradientBg: readonly [string, string, string];
  heroGradient: readonly [string, string];
  decorEmojis: string[];
  heroEmoji: string;
  heroTagline: string;
  borderRadius: { sm: number; md: number; lg: number; xl: number; full: number };
  cardBorder: (width?: number) => ViewStyle;
  tabIcons: { home: string; tasks: string; shop: string; profile: string };
  taskCategoryIcons: Record<TaskCategory, string>;
  pointsEmoji: string;
  celebrationKicker: string;
  allCategoryIcon: string;
  pattern: 'blocks' | 'stars' | 'studs' | 'hearts';
}

function blockBorder(colors: ThemeColors, width = 3): ViewStyle {
  return {
    borderTopWidth: width,
    borderLeftWidth: width,
    borderBottomWidth: width,
    borderRightWidth: width,
    borderTopColor: colors.borderLight,
    borderLeftColor: colors.borderLight,
    borderBottomColor: colors.borderDark,
    borderRightColor: colors.borderDark,
  };
}

function glowBorder(colors: ThemeColors, width = 2): ViewStyle {
  return {
    borderWidth: width,
    borderColor: colors.primary,
    shadowColor: colors.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 10,
  };
}

function flatBorder(colors: ThemeColors, width = 2): ViewStyle {
  return {
    borderWidth: width,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  };
}

const MC_COLORS: ThemeColors = {
  bg: '#141810',
  bgDeep: '#0a1208',
  bgCard: '#3d4a35',
  bgCardLight: '#4e6044',
  primary: '#5D8C3B',
  primaryLight: '#8BC34A',
  primaryDark: '#33691E',
  secondary: '#8B6914',
  accent: '#B8FF5C',
  danger: '#C62828',
  success: '#66BB6A',
  text: '#FFFFFF',
  textMuted: '#A8B89A',
  textDark: '#1a1a1a',
  gradientStart: '#6B9B3A',
  gradientEnd: '#2E5C1A',
  gold: '#FFD700',
  emerald: '#50C878',
  diamond: '#4FC3F7',
  streak: '#FF8F00',
  border: '#555555',
  borderLight: '#9EAE8E',
  borderDark: '#1E2A18',
  buttonShadow: '#1B3D0F',
  glow: '#80FF20',
  cardShine: '#7CB342',
  confetti: ['#5D8C3B', '#B8FF5C', '#50C878', '#FFD700', '#8B6914', '#4FC3F7'],
};

const BRAWL_COLORS: ThemeColors = {
  bg: '#12082E',
  bgDeep: '#060318',
  bgCard: '#2A1568',
  bgCardLight: '#3A2088',
  primary: '#FFC107',
  primaryLight: '#FFE566',
  primaryDark: '#FF8F00',
  secondary: '#AB47BC',
  accent: '#00E5FF',
  danger: '#FF1744',
  success: '#76FF03',
  text: '#FFFFFF',
  textMuted: '#CE93D8',
  textDark: '#12082E',
  gradientStart: '#FFD54F',
  gradientEnd: '#1565C0',
  gold: '#FFC107',
  emerald: '#76FF03',
  diamond: '#00E5FF',
  streak: '#FF6D00',
  border: '#7E57C2',
  borderLight: '#B39DDB',
  borderDark: '#4A148C',
  buttonShadow: '#E65100',
  glow: '#00E5FF',
  cardShine: '#FFC107',
  confetti: ['#FFC107', '#00E5FF', '#FF1744', '#76FF03', '#AB47BC', '#FFFFFF'],
};

const ROBLOX_COLORS: ThemeColors = {
  bg: '#1E2022',
  bgDeep: '#121314',
  bgCard: '#393B3D',
  bgCardLight: '#4A4D50',
  primary: '#E2231A',
  primaryLight: '#FF5252',
  primaryDark: '#B71C1C',
  secondary: '#53565a',
  accent: '#FFFFFF',
  danger: '#E2231A',
  success: '#00C853',
  text: '#FFFFFF',
  textMuted: '#B0B3B8',
  textDark: '#232527',
  gradientStart: '#FF3D35',
  gradientEnd: '#9B1410',
  gold: '#FFD700',
  emerald: '#00C853',
  diamond: '#00A2FF',
  streak: '#FF6D00',
  border: '#53565a',
  borderLight: '#72767A',
  borderDark: '#2B2D2F',
  buttonShadow: '#7F0000',
  glow: '#FF5252',
  cardShine: '#E2231A',
  confetti: ['#E2231A', '#FFFFFF', '#393B3D', '#FFD700', '#00C853', '#00A2FF'],
};

const SPARKLE_COLORS: ThemeColors = {
  bg: '#2D1B3D',
  bgDeep: '#1A0F24',
  bgCard: '#5C3D6E',
  bgCardLight: '#7B5294',
  primary: '#FF6EC7',
  primaryLight: '#FFB3E6',
  primaryDark: '#D63384',
  secondary: '#B388FF',
  accent: '#FFD6F0',
  danger: '#FF4081',
  success: '#69F0AE',
  text: '#FFFFFF',
  textMuted: '#D4A5E8',
  textDark: '#2D1B3D',
  gradientStart: '#FF6EC7',
  gradientEnd: '#7B1FA2',
  gold: '#FFD700',
  emerald: '#69F0AE',
  diamond: '#E1BEE7',
  streak: '#FF80AB',
  border: '#9C27B0',
  borderLight: '#CE93D8',
  borderDark: '#4A148C',
  buttonShadow: '#880E4F',
  glow: '#FF6EC7',
  cardShine: '#FFB3E6',
  confetti: ['#FF6EC7', '#B388FF', '#FFD700', '#FF80AB', '#E1BEE7', '#FFFFFF'],
};

export const THEMES: Record<UiThemeId, AppTheme> = {
  minecraft: {
    id: 'minecraft',
    name: 'Minecraft',
    subtitle: 'בלוקים ודשא',
    icon: '🟩',
    sfx: 'complete',
    colors: MC_COLORS,
    gradientBg: ['#1a2818', '#0f1a0c', '#060d04'],
    heroGradient: ['#4a7a32', '#2d5016'],
    decorEmojis: ['🟩', '🧱', '⛏️', '💎', '🌲', '✨', '🟫', '💚'],
    heroEmoji: '⛏️',
    heroTagline: 'כרה, בנה, הרווח!',
    borderRadius: { sm: 2, md: 4, lg: 6, xl: 8, full: 999 },
    cardBorder: (w) => blockBorder(MC_COLORS, w),
    tabIcons: { home: '🟩', tasks: '📜', shop: '💎', profile: '🛡️' },
    taskCategoryIcons: { home: '🟩', school: '📖', social: '👨‍🌾', hobby: '🎣', sport: '🏹' },
    pointsEmoji: '💎',
    celebrationKicker: '💚 XP',
    allCategoryIcon: '🧱',
    pattern: 'blocks',
  },
  brawl: {
    id: 'brawl',
    name: 'Brawl Stars',
    subtitle: 'ג׳מס וכוכבים',
    icon: '💎',
    sfx: 'gem',
    colors: BRAWL_COLORS,
    gradientBg: ['#1a0a40', '#0f0528', '#060218'],
    heroGradient: ['#FFB300', '#1565C0'],
    decorEmojis: ['⭐', '💎', '✨', '🏆', '👊', '💥', '🌟', '💜'],
    heroEmoji: '💎',
    heroTagline: 'תכרה ג׳מס, תהיה אגדה!',
    borderRadius: { sm: 10, md: 16, lg: 22, xl: 30, full: 999 },
    cardBorder: (w) => glowBorder(BRAWL_COLORS, w),
    tabIcons: { home: '⭐', tasks: '🎯', shop: '💎', profile: '👊' },
    taskCategoryIcons: { home: '⭐', school: '📖', social: '🤝', hobby: '🎮', sport: '🏆' },
    pointsEmoji: '💎',
    celebrationKicker: '💎 GEM!',
    allCategoryIcon: '⭐',
    pattern: 'stars',
  },
  roblox: {
    id: 'roblox',
    name: 'Roblox',
    subtitle: 'Robux ועולמות',
    icon: '🪙',
    sfx: 'coin',
    colors: ROBLOX_COLORS,
    gradientBg: ['#282a2c', '#1a1b1e', '#0e0f10'],
    heroGradient: ['#FF3D35', '#8B1010'],
    decorEmojis: ['🪙', '🧱', '🌐', '🎮', '⭐', '🔴', '⬜', '💰'],
    heroEmoji: '🪙',
    heroTagline: 'צבור Robux, שלוט בעולם!',
    borderRadius: { sm: 6, md: 10, lg: 14, xl: 18, full: 999 },
    cardBorder: (w) => flatBorder(ROBLOX_COLORS, w),
    tabIcons: { home: '🏠', tasks: '📋', shop: '🪙', profile: '👤' },
    taskCategoryIcons: { home: '🧱', school: '📖', social: '👥', hobby: '🎮', sport: '⚡' },
    pointsEmoji: '🪙',
    celebrationKicker: '🪙 Robux!',
    allCategoryIcon: '🌐',
    pattern: 'studs',
  },
  sparkle: {
    id: 'sparkle',
    name: 'Sparkle',
    subtitle: 'נסיכות וקסמים',
    icon: '🦄',
    sfx: 'gem',
    colors: SPARKLE_COLORS,
    gradientBg: ['#3D2554', '#251535', '#120A1A'],
    heroGradient: ['#FF6EC7', '#9B59B6'],
    decorEmojis: ['✨', '🦄', '💖', '🌸', '👑', '💫', '🦋', '💜'],
    heroEmoji: '✨',
    heroTagline: 'זוהר, צבור, תאיר!',
    borderRadius: { sm: 12, md: 18, lg: 24, xl: 32, full: 999 },
    cardBorder: (w) => glowBorder(SPARKLE_COLORS, w),
    tabIcons: { home: '✨', tasks: '📋', shop: '👑', profile: '💖' },
    taskCategoryIcons: { home: '🏰', school: '📖', social: '💕', hobby: '🎀', sport: '⭐' },
    pointsEmoji: '💖',
    celebrationKicker: '✨ Sparkle!',
    allCategoryIcon: '✨',
    pattern: 'hearts',
  },
};

export const DEFAULT_THEME_ID: UiThemeId = 'minecraft';

export function getTheme(id?: UiThemeId | null): AppTheme {
  if (id && THEMES[id]) return THEMES[id];
  return THEMES.minecraft;
}

export const UI_THEME_OPTIONS = (Object.values(THEMES) as AppTheme[]).map((t) => ({
  id: t.id,
  name: t.name,
  subtitle: t.subtitle,
  icon: t.icon,
  sfx: t.sfx,
  accent: t.colors.primary,
  heroGradient: t.heroGradient,
  decorEmojis: t.decorEmojis.slice(0, 4),
}));
