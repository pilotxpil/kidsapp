import type { TextStyle } from 'react-native';
import { F } from './fonts';

/**
 * Legacy font map. The redesign uses Fredoka everywhere, so the old Heebo names now point at
 * Fredoka faces (Fredoka tops out at 700, so the heavier weights share the bold face).
 */
export const Heebo = {
  regular: F.regular,
  medium: F.medium,
  semibold: F.semibold,
  bold: F.bold,
  extrabold: F.bold,
  black: F.bold,
} as const;

function face(family: string): TextStyle {
  return { fontFamily: family, fontWeight: 'normal' };
}

/** Legacy helper: every theme now uses the same Fredoka faces. */
export function useType() {
  return {
    ember: false,
    display: face(F.bold),
    title: face(F.bold),
    heading: face(F.semibold),
    body: face(F.medium),
    ui: face(F.semibold),
  };
}
