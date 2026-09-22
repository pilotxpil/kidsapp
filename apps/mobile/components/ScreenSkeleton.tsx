import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';

interface ScreenSkeletonProps {
  cards?: number;
}

/** Themed placeholder while a tab waits for its first server response. */
export function ScreenSkeleton({ cards = 4 }: ScreenSkeletonProps) {
  const { colors, borderRadius, cardBorder } = useTheme();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [pulse]);

  const anim = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View style={anim} accessibilityRole="progressbar">
      <View style={styles.stats}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.stat,
              { backgroundColor: colors.bgCard, borderRadius: borderRadius.lg },
              cardBorder(2),
            ]}
          >
            <View style={[styles.statNum, { backgroundColor: colors.border, borderRadius: borderRadius.sm }]} />
            <View style={[styles.statLabel, { backgroundColor: colors.border, borderRadius: borderRadius.sm }]} />
          </View>
        ))}
      </View>
      {Array.from({ length: cards }, (_, i) => (
        <View
          key={i}
          style={[
            styles.card,
            { backgroundColor: colors.bgCard, borderRadius: borderRadius.lg },
            cardBorder(2),
          ]}
        >
          <View style={[styles.lineWide, { backgroundColor: colors.border, borderRadius: borderRadius.sm }]} />
          <View style={[styles.lineShort, { backgroundColor: colors.border, borderRadius: borderRadius.sm }]} />
        </View>
      ))}
    </Animated.View>
  );
}

/** Fade content in the first time it replaces the skeleton. Cached visits stay still. */
export function ScreenReveal({
  animate,
  children,
}: {
  animate: boolean;
  children: React.ReactNode;
}) {
  if (!animate) return <>{children}</>;
  return <Animated.View entering={FadeIn.duration(320)}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  stat: { flex: 1, minHeight: 84, padding: spacing.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  statNum: { width: '46%', height: 22 },
  statLabel: { width: '70%', height: 10 },
  card: { marginBottom: spacing.sm, padding: spacing.md, gap: spacing.sm },
  lineWide: { width: '78%', height: 14, alignSelf: 'flex-end' },
  lineShort: { width: '48%', height: 10, alignSelf: 'flex-end' },
});
