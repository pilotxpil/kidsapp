import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../lib/theme-context';
import { SafeScreen } from './SafeScreen';
import { TAB_BAR_SPACE } from './ui/Screen';

interface ThemedScreenProps {
  children: React.ReactNode;
  tabs?: boolean;
  style?: object;
}

/** Legacy screen wrapper — now the redesign's world paper. New screens use KidScreen / CalmScreen. */
export function ThemedScreen({ children, tabs, style }: ThemedScreenProps) {
  const { world } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: world.paper }, style]}>
      <SafeScreen tabs={tabs} style={[styles.content, tabs ? { paddingBottom: TAB_BAR_SPACE - 20 } : null]}>
        {children}
      </SafeScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, zIndex: 1 },
});
