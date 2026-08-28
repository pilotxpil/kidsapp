import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, borderRadius, spacing } from '../constants/theme';
import { rtl } from '../lib/rtl';
import { AnimatedCounter } from './animations/AnimatedCounter';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
}

export function Card({ children, style, glow }: CardProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (glow) {
      pulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 800 }), withTiming(0.4, { duration: 800 })),
        -1,
        true
      );
    } else {
      pulse.value = 0;
    }
  }, [glow, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow ? 0.2 + pulse.value * 0.4 : 0,
    borderColor: glow ? colors.primary : colors.border,
  }));

  return (
    <Animated.View style={[styles.card, glow && styles.glow, glowStyle, style]}>
      {children}
    </Animated.View>
  );
}

interface PointsBadgeProps {
  points: number;
  size?: 'sm' | 'lg';
}

export function PointsBadge({ points, size = 'sm' }: PointsBadgeProps) {
  const starSpin = useSharedValue(0);

  useEffect(() => {
    starSpin.value = withSequence(
      withSpring(360, { damping: 8, stiffness: 80 }),
      withTiming(0, { duration: 0 })
    );
  }, [points, starSpin]);

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starSpin.value}deg` }],
  }));

  return (
    <View style={[styles.pointsBadge, size === 'lg' && styles.pointsBadgeLg]}>
      <Animated.Text style={[styles.pointsIcon, size === 'lg' && styles.pointsIconLg, starStyle]}>
        ⭐
      </Animated.Text>
      <AnimatedCounter
        value={points}
        style={[styles.pointsText, size === 'lg' && styles.pointsTextLg]}
      />
    </View>
  );
}

interface LevelBarProps {
  level: number;
  progress: number;
  max: number;
}

export function LevelBar({ level, progress, max }: LevelBarProps) {
  const pct = max > 0 ? Math.min((progress / max) * 100, 100) : 0;
  const widthPct = useSharedValue(0);

  useEffect(() => {
    widthPct.value = withSpring(pct, { damping: 14, stiffness: 90 });
  }, [pct, widthPct]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthPct.value}%`,
  }));

  return (
    <View style={styles.levelContainer}>
      <View style={[styles.levelHeader, rtl.rowBetween]}>
        <Text style={[styles.levelText, rtl.text]}>רמה {level}</Text>
        <Text style={[styles.xpText, rtl.text]}>{progress}/{max} XP</Text>
      </View>
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, fillStyle]} />
      </View>
    </View>
  );
}

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const fireScale = useSharedValue(1);

  useEffect(() => {
    fireScale.value = withRepeat(
      withSequence(
        withSpring(1.15, { damping: 4 }),
        withSpring(1, { damping: 6 })
      ),
      -1,
      true
    );
  }, [fireScale]);

  const fireStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fireScale.value }],
  }));

  if (streak < 1) return null;
  return (
    <View style={styles.streakBadge}>
      <Animated.Text style={[styles.streakEmoji, fireStyle]}>🔥</Animated.Text>
      <Text style={styles.streakText}>{streak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'stretch',
    width: '100%',
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 6,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCardLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  pointsBadgeLg: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pointsIcon: {
    fontSize: 16,
  },
  pointsIconLg: {
    fontSize: 24,
  },
  pointsText: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 16,
  },
  pointsTextLg: {
    fontSize: 28,
  },
  levelContainer: {
    width: '100%',
  },
  levelHeader: {
    marginBottom: spacing.xs,
  },
  levelText: {
    color: colors.primaryLight,
    fontWeight: '700',
    fontSize: 14,
  },
  xpText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  barBg: {
    height: 10,
    backgroundColor: colors.bgCardLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#431407',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: 4,
    flexShrink: 0,
  },
  streakEmoji: {
    fontSize: 18,
  },
  streakText: {
    color: colors.streak,
    fontWeight: '800',
    fontSize: 16,
  },
});
