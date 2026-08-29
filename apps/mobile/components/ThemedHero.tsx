import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { rtl } from '../lib/rtl';

interface AvatarFrameProps {
  avatar: string;
  size?: 'md' | 'lg';
}

export function AvatarFrame({ avatar, size = 'md' }: AvatarFrameProps) {
  const { colors, borderRadius, cardBorder, heroGradient, id: themeId } = useTheme();
  const dim = size === 'lg' ? 88 : 64;
  const fontSize = size === 'lg' ? 48 : 36;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          width: dim + 12,
          height: dim + 12,
          borderRadius: borderRadius.lg,
          padding: 4,
          ...cardBorder(2),
        },
        inner: {
          flex: 1,
          borderRadius: borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        emoji: { fontSize },
        ring: {
          position: 'absolute',
          top: -4,
          right: -4,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.bgCard,
        },
        ringText: { fontSize: 10 },
      }),
    [themeId, colors, borderRadius, cardBorder, dim, fontSize]
  );

  return (
    <View style={styles.outer}>
      <LinearGradient colors={[...heroGradient]} style={styles.inner}>
        <Text style={styles.emoji}>{avatar}</Text>
      </LinearGradient>
      <View style={styles.ring}>
        <Text style={styles.ringText}>✦</Text>
      </View>
    </View>
  );
}

interface ThemedHeroProps {
  displayName: string;
  avatar: string;
  streak: number;
  level?: number;
}

export function ThemedHero({ displayName, avatar, streak, level }: ThemedHeroProps) {
  const { borderRadius, cardBorder, heroGradient, heroEmoji, heroTagline, id: themeId } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          marginBottom: spacing.lg,
          ...cardBorder(3),
        },
        gradient: { padding: spacing.lg, minHeight: 140 },
        decor: {
          position: 'absolute',
          top: 8,
          left: 12,
          fontSize: 36,
          opacity: 0.25,
        },
        decor2: {
          position: 'absolute',
          bottom: 8,
          right: 12,
          fontSize: 28,
          opacity: 0.2,
        },
        row: { alignItems: 'center', gap: spacing.md },
        textBlock: { flex: 1 },
        tagline: {
          color: 'rgba(255,255,255,0.75)',
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 2,
        },
        name: {
          color: '#fff',
          fontSize: 26,
          fontWeight: '800',
          textShadowColor: 'rgba(0,0,0,0.5)',
          textShadowOffset: { width: 1, height: 2 },
          textShadowRadius: 4,
        },
        meta: {
          flexDirection: 'row',
          marginTop: spacing.sm,
          gap: spacing.sm,
          flexWrap: 'wrap',
        },
        pill: {
          backgroundColor: 'rgba(0,0,0,0.35)',
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: borderRadius.full,
        },
        pillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
      }),
    [themeId, borderRadius, cardBorder]
  );

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={[...heroGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <Text style={styles.decor}>{heroEmoji}</Text>
        <Text style={styles.decor2}>{heroEmoji}</Text>
        <View style={[styles.row, rtl.row]}>
          <AvatarFrame avatar={avatar} size="lg" />
          <View style={styles.textBlock}>
            <Text style={[styles.tagline, rtl.text]}>{heroTagline}</Text>
            <Text style={[styles.name, rtl.text]}>{displayName}</Text>
            <View style={[styles.meta, rtl.row]}>
              {level != null && level > 0 && (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>⚔️ רמה {level}</Text>
                </View>
              )}
              {streak > 0 && (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>🔥 {streak} ימים</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  icon?: string;
}

export function SectionHeader({ title, icon }: SectionHeaderProps) {
  const { colors, borderRadius, id: themeId } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginBottom: spacing.md, width: '100%' },
        row: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
        icon: { fontSize: 22 },
        title: {
          color: colors.text,
          fontSize: 18,
          fontWeight: '800',
          flex: 1,
        },
        line: {
          height: 3,
          borderRadius: borderRadius.full,
          width: '100%',
        },
      }),
    [themeId, colors, borderRadius]
  );

  return (
    <View style={styles.wrap}>
      <View style={[styles.row, rtl.row]}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={[styles.title, rtl.text]}>{title}</Text>
      </View>
      <LinearGradient
        colors={[colors.primary, colors.accent, 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={styles.line}
      />
    </View>
  );
}
