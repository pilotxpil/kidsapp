import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/theme-context';
import { SafeScreen } from './SafeScreen';
import { ThemeBackground } from './ThemeBackground';

interface ThemedScreenProps {
  children: React.ReactNode;
  tabs?: boolean;
  style?: object;
}

export function ThemedScreen({ children, tabs, style }: ThemedScreenProps) {
  const { colors, id: themeId } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }, style]}>
      <ThemeBackground key={themeId} />
      <SafeScreen tabs={tabs} style={styles.content}>
        {children}
      </SafeScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, zIndex: 1 },
});
