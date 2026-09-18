import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme-context';
import { spacing } from '../constants/theme';

export function ProgressBar({ progress, height = 10 }: { progress: number; height?: number }) {
  const { colors, borderRadius } = useTheme();
  const pct = Math.max(0, Math.min(1, progress));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        track: {
          height,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.bg,
          overflow: 'hidden',
          width: '100%',
        },
        fill: {
          height: '100%',
          width: `${Math.round(pct * 100)}%`,
          backgroundColor: colors.primary,
          borderRadius: borderRadius.sm,
        },
      }),
    [colors, borderRadius, height, pct]
  );

  return (
    <View style={styles.track}>
      <View style={styles.fill} />
    </View>
  );
}

export function ProgressCardSpacer() {
  return <View style={{ height: spacing.sm }} />;
}
