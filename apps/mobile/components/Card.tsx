import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, borderRadius, spacing } from '../constants/theme';
import { rtl } from '../lib/rtl';

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
      <Text style={[styles.pointsIcon, size === 'lg' && styles.pointsIconLg]}>⭐</Text>
      <Text style={[styles.pointsText, size === 'lg' && styles.pointsTextLg]}>
        {points.toLocaleString()}
      </Text>
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
  return (
    <View style={styles.levelContainer}>
      <View style={[styles.levelHeader, rtl.rowBetween]}>
        <Text style={[styles.levelText, rtl.text]}>רמה {level}</Text>
        <Text style={[styles.xpText, rtl.text]}>{progress}/{max} XP</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
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
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
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
