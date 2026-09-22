import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { useType } from '../lib/typography';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';
import { AnimatedCounter } from './animations/AnimatedCounter';
import { ThemeGlyph, PointsMark } from './icons/ThemeGlyph';
import { toBoxShadow, toTextShadow } from '../lib/shadow';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
}

export function Card({ children, style, glow }: CardProps) {
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();
  const ember = themeId === 'ember';
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: ember
          ? {
              backgroundColor: 'rgba(12, 8, 6, 0.78)',
              borderRadius: 22,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: glow ? 'rgba(255, 179, 0, 0.55)' : 'rgba(255, 138, 61, 0.38)',
              boxShadow: toBoxShadow({
                color: colors.glow,
                offset: { width: 0, height: 10 },
                opacity: glow ? 0.55 : 0.28,
                radius: glow ? 22 : 18,
              }),
              elevation: 8,
              alignSelf: 'stretch',
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
            }
          : {
              backgroundColor: colors.bgCard,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              paddingTop: spacing.md + 4,
              ...cardBorder(2),
              alignSelf: 'stretch',
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
            },
        shine: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          zIndex: 1,
          pointerEvents: 'none',
        },
        body: { zIndex: 2, width: '100%', maxWidth: '100%', alignSelf: 'stretch' },
        glow: {
          borderTopColor: colors.accent,
          borderLeftColor: colors.accent,
          boxShadow: toBoxShadow({ color: colors.glow, opacity: 0.35, radius: 12 }),
          elevation: 8,
        },
      }),
    [themeId, colors, borderRadius, cardBorder, ember, glow]
  );

  return (
    <View style={[styles.card, !ember && glow && styles.glow, style]}>
      {ember ? null : (
        <LinearGradient
          colors={[colors.cardShine, colors.primaryLight, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shine}
        />
      )}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

interface PointsBadgeProps {
  points: number;
  size?: 'sm' | 'lg';
}

export function PointsBadge({ points, size = 'sm' }: PointsBadgeProps) {
  const { colors, borderRadius, pointsEmoji, heroGradient, id: themeId, chrome } = useTheme();
  const type = useType();
  const gemSize = size === 'lg' ? 26 : 16;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          borderRadius: borderRadius.full,
          overflow: 'hidden',
          boxShadow: toBoxShadow({
            color: colors.glow,
            offset: { width: 0, height: 2 },
            opacity: 0.4,
            radius: 8,
          }),
          elevation: 6,
        },
        pointsBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.xs,
        },
        pointsBadgeLg: {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        pointsIcon: { fontSize: 14 },
        pointsIconLg: { fontSize: 22 },
        pointsText: {
          color: '#fff',
          fontWeight: '800',
          fontSize: 16,
          ...toTextShadow('rgba(0,0,0,0.4)', { width: 1, height: 1 }, 2),
          ...type.title,
        },
        pointsTextLg: { fontSize: 28 },
      }),
    [themeId, colors, borderRadius, type.title]
  );

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={[...heroGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <View style={[styles.pointsBadge, size === 'lg' && styles.pointsBadgeLg]}>
          {chrome === 'vector' || themeId === 'ember' || themeId === 'minecraft' ? (
            <PointsMark size={gemSize} />
          ) : (
            <Text style={[styles.pointsIcon, size === 'lg' && styles.pointsIconLg]}>{pointsEmoji}</Text>
          )}
          <AnimatedCounter
            value={points}
            style={[styles.pointsText, size === 'lg' && styles.pointsTextLg]}
          />
        </View>
      </LinearGradient>
    </View>
  );
}

interface LevelBarProps {
  level: number;
  progress: number;
  max: number;
}

export function LevelBar({ level, progress, max }: LevelBarProps) {
  const { colors, borderRadius, cardBorder, heroGradient, id: themeId } = useTheme();
  const type = useType();
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        levelContainer: { width: '100%' },
        levelHeader: { marginBottom: spacing.xs },
        levelText: { color: colors.accent, fontWeight: '700', fontSize: 14, ...type.heading },
        xpText: { color: colors.textMuted, fontSize: 12, ...type.body },
        barBg: {
              height: 14,
              backgroundColor: colors.bgDeep,
              borderRadius: borderRadius.full,
              overflow: 'hidden',
              width: '100%',
              ...cardBorder(1),
            },
        barFill: {
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          borderRadius: borderRadius.full,
          overflow: 'hidden',
        },
      }),
    [themeId, colors, borderRadius, cardBorder, type.heading, type.body]
  );

  return (
    <View style={styles.levelContainer}>
      <View style={[styles.levelHeader, rtl.rowBetween]}>
        <Text style={[styles.levelText, rtl.text]}>
          {t('level')} {level}
        </Text>
        <Text style={[styles.xpText, rtl.text]}>{progress}/{max} XP</Text>
      </View>
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, fillStyle]}>
          <LinearGradient
            colors={[...heroGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();
  const type = useType();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        streakBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.bgCardLight,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.md,
          gap: 8,
          flexShrink: 0,
          ...cardBorder(2),
          boxShadow: toBoxShadow({ color: colors.streak, opacity: 0.35, radius: 6 }),
          elevation: 4,
        },
        streakLabel: {
          color: colors.streak,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1,
          ...type.ui,
        },
        streakText: { color: colors.text, fontWeight: '800', fontSize: 16, ...type.title },
      }),
    [themeId, colors, borderRadius, cardBorder, type.ui, type.title]
  );

  if (streak < 1) return null;
  return (
    <View style={styles.streakBadge}>
      <ThemeGlyph name="streak" size={16} color={colors.streak} />
      <Text style={styles.streakLabel}>{t('streak')}</Text>
      <Text style={styles.streakText}>{streak}</Text>
    </View>
  );
}
