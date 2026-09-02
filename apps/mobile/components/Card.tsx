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
              shadowColor: colors.glow,
              shadowOpacity: glow ? 0.55 : 0.28,
              shadowRadius: glow ? 22 : 18,
              shadowOffset: { width: 0, height: 10 },
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
        },
        body: { zIndex: 2, width: '100%', maxWidth: '100%', alignSelf: 'stretch' },
        glow: {
          borderTopColor: colors.accent,
          borderLeftColor: colors.accent,
          shadowColor: colors.glow,
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
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
          pointerEvents="none"
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
          shadowColor: colors.glow,
          shadowOpacity: 0.4,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
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
          textShadowColor: 'rgba(0,0,0,0.4)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
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
          {chrome === 'vector' || themeId === 'ember' ? (
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
  const ember = themeId === 'ember';
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
        barBg: ember
          ? {
              height: 12,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: borderRadius.full,
              overflow: 'hidden',
              width: '100%',
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.28)',
            }
          : {
              height: 14,
              backgroundColor: 'rgba(0,0,0,0.35)',
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
    [themeId, colors, borderRadius, cardBorder, ember, type.heading, type.body]
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
  const { colors, borderRadius, cardBorder, id: themeId, chrome } = useTheme();
  const type = useType();
  const ember = themeId === 'ember';
  const styles = useMemo(
    () =>
      StyleSheet.create({
        streakBadge: ember
          ? {
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(12,8,6,0.78)',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: 999,
              gap: 8,
              flexShrink: 0,
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.4)',
              shadowColor: colors.streak,
              shadowOpacity: 0.45,
              shadowRadius: 10,
              elevation: 6,
            }
          : {
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.bgCardLight,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.sm,
              gap: 8,
              flexShrink: 0,
              ...cardBorder(2),
              shadowColor: colors.streak,
              shadowOpacity: 0.35,
              shadowRadius: 6,
              elevation: 4,
            },
        streakEmoji: { fontSize: 16 },
        streakLabel: {
          color: colors.streak,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1,
          ...type.ui,
        },
        streakText: { color: colors.text, fontWeight: '800', fontSize: 16, ...type.title },
      }),
    [themeId, colors, borderRadius, cardBorder, ember, type.ui, type.title]
  );

  if (streak < 1) return null;
  return (
    <View style={styles.streakBadge}>
      {chrome === 'vector' ? (
        <ThemeGlyph name="streak" size={16} color={colors.streak} />
      ) : (
        <Text style={styles.streakEmoji}>🔥</Text>
      )}
      <Text style={styles.streakLabel}>{t('streak')}</Text>
      <Text style={styles.streakText}>{streak}</Text>
    </View>
  );
}
