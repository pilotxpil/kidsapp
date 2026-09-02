import type { TextStyle } from 'react-native';
import { useTheme } from './theme-context';

/** Loaded in app/_layout via @expo-google-fonts/heebo */
export const Heebo = {
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  semibold: 'Heebo_600SemiBold',
  bold: 'Heebo_700Bold',
  extrabold: 'Heebo_800ExtraBold',
  black: 'Heebo_900Black',
} as const;

function face(family: string): TextStyle {
  return { fontFamily: family, fontWeight: 'normal' };
}

export function useType() {
  const { id } = useTheme();
  const ember = id === 'ember';
  return {
    ember,
    display: ember ? face(Heebo.black) : {},
    title: ember ? face(Heebo.extrabold) : {},
    heading: ember ? face(Heebo.bold) : {},
    body: ember ? face(Heebo.medium) : {},
    ui: ember ? face(Heebo.semibold) : {},
  };
}
