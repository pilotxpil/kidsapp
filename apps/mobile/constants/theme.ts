import { ViewStyle } from 'react-native';

/** Minecraft-inspired palette: grass, dirt, stone, emerald XP, diamond accents */
export const colors = {
  bg: '#1a1a1a',
  bgDeep: '#0d1f0d',
  bgCard: '#3a3a3a',
  bgCardLight: '#4a4a4a',
  primary: '#5D8C3B',
  primaryLight: '#7CB342',
  primaryDark: '#3B6B22',
  secondary: '#8B6914',
  accent: '#80FF20',
  danger: '#C62828',
  success: '#5D8C3B',
  text: '#FFFFFF',
  textMuted: '#A0A0A0',
  textDark: '#1a1a1a',
  gradientStart: '#5D8C3B',
  gradientEnd: '#3B6B22',
  gold: '#FFD700',
  emerald: '#50C878',
  diamond: '#4FC3F7',
  streak: '#FF6D00',
  border: '#555555',
  borderLight: '#8B8B8B',
  borderDark: '#2D2D2D',
  buttonShadow: '#2D5016',
  dirt: '#8B6914',
  stone: '#7D7D7D',
  sky: '#78A7FF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

/** Blocky corners — Minecraft GUI uses sharp/slightly rounded edges */
export const borderRadius = {
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
  full: 999,
};

export const gradientBg = [colors.bg, colors.bgDeep] as const;

/** 3D block border effect for cards and buttons */
export function blockBorder(width = 3): ViewStyle {
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
