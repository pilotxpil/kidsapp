import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, borderRadius, spacing, blockBorder } from '../constants/theme';
import { rtl } from '../lib/rtl';
import { AnimatedCounter } from './animations/AnimatedCounter';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
}

export function Card({ children, style, glow }: CardProps) {
  return (
    <View style={[styles.card, glow && styles.glow, style]}>
      {children}
    </View>
  );
}

interface PointsBadgeProps {
  points: number;
  size?: 'sm' | 'lg';
}

export function PointsBadge({ points, size = 'sm' }: PointsBadgeProps) {
  return (
    <View style={[styles.pointsBadge, size === 'lg' && styles.pointsBadgeLg]}>
      <Text style={[styles.pointsIcon, size === 'lg' && styles.pointsIconLg]}>💎</Text>
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
  const widthPct = useSharedValue(pct);
  const first = React.useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      widthPct.value = pct;
      return;
    }
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
  if (streak < 1) return null;
  return (
    <View style={styles.streakBadge}>
      <Text style={styles.streakEmoji}>🔥</Text>
      <Text style={styles.streakLabel}>STREAK</Text>
      <Text style={styles.streakText}>{streak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...blockBorder(2),
    alignSelf: 'stretch',
    width: '100%',
  },
  glow: {
    borderTopColor: colors.accent,
    borderLeftColor: colors.accent,
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
    fontSize: 14,
  },
  pointsIconLg: {
    fontSize: 22,
  },
  pointsText: {
    color: colors.emerald,
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
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  xpText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  barBg: {
    height: 12,
    backgroundColor: colors.bgCardLight,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    width: '100%',
    ...blockBorder(1),
  },
  barFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCardLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: 8,
    flexShrink: 0,
    ...blockBorder(2),
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakLabel: {
    color: colors.streak,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  streakText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
});
