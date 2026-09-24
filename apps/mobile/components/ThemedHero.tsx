import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '../constants/theme';
import { getThemeArt } from '../constants/theme-art';
import { useTheme } from '../lib/theme-context';
import { useType } from '../lib/typography';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';
import { ThemeGlyph } from './icons/ThemeGlyph';
import { KidAvatar } from './KidAvatar';
import { avatarFallbackGlyph, shopAvatarImage } from '../lib/avatar-images';
import { toBoxShadow, toTextShadow } from '../lib/shadow';
import { BouncyPressable } from './animations/BouncyPressable';

interface AvatarFrameProps {
  avatar: string;
  size?: 'md' | 'lg';
}

export function AvatarFrame({ avatar, size = 'md' }: AvatarFrameProps) {
  const { colors, borderRadius, cardBorder, heroGradient, id: themeId } = useTheme();
  const art = getThemeArt(themeId);
  const helm = art?.icons?.profile;
  const ember = themeId === 'ember';
  const dim = size === 'lg' ? 104 : 64;
  const fontSize = size === 'lg' ? 56 : 36;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: ember
          ? {
              width: dim + 10,
              height: dim + 10,
              borderRadius: 22,
              padding: 3,
              borderWidth: 1.5,
              borderColor: colors.primaryLight,
              boxShadow: toBoxShadow({ color: colors.glow, opacity: 0.8, radius: 14 }),
              elevation: 10,
            }
          : {
              width: dim + 12,
              height: dim + 12,
              borderRadius: borderRadius.lg,
              padding: 4,
              ...cardBorder(2),
            },
        inner: {
          flex: 1,
          borderRadius: ember ? 18 : borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: 'transparent',
        },
        art: { width: '100%', height: '100%' },
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
    [themeId, colors, borderRadius, cardBorder, dim, fontSize, ember]
  );

  return (
    <View style={styles.outer}>
      <LinearGradient colors={[...heroGradient]} style={styles.inner}>
        {shopAvatarImage(avatar) ? (
          <KidAvatar avatar={avatar} size={dim} style={styles.art} />
        ) : ember && helm ? (
          <Image source={helm} style={styles.art} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{avatarFallbackGlyph(avatar)}</Text>
        )}
      </LinearGradient>
      {ember ? null : (
        <View style={styles.ring}>
          <Text style={styles.ringText}>✦</Text>
        </View>
      )}
    </View>
  );
}

interface HomeAvatarSlotProps {
  avatar: string;
  onPress?: () => void;
  hidden?: boolean;
  anchorRef?: React.Ref<View>;
  onAnchorLayout?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function HomeAvatarSlot({
  avatar,
  onPress,
  hidden,
  anchorRef,
  onAnchorLayout,
  style,
}: HomeAvatarSlotProps) {
  const frame = <AvatarFrame avatar={avatar} size="lg" />;
  return (
    <View
      ref={anchorRef}
      collapsable={false}
      onLayout={onAnchorLayout}
      style={[{ opacity: hidden ? 0 : 1 }, style]}
    >
      {onPress ? (
        <BouncyPressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t('changeAvatar')}
        >
          {frame}
        </BouncyPressable>
      ) : (
        frame
      )}
    </View>
  );
}

interface ThemedHeroProps {
  displayName: string;
  avatar: string;
  streak: number;
  level?: number;
  tagline?: string;
  onAvatarPress?: () => void;
  avatarHidden?: boolean;
  avatarAnchorRef?: React.Ref<View>;
  onAvatarLayout?: () => void;
}

export function ThemedHero({
  displayName,
  avatar,
  streak,
  level,
  tagline,
  onAvatarPress,
  avatarHidden,
  avatarAnchorRef,
  onAvatarLayout,
}: ThemedHeroProps) {
  const { borderRadius, cardBorder, heroGradient, heroEmoji, heroTagline, id: themeId, chrome, colors } =
    useTheme();
  const type = useType();
  const art = getThemeArt(themeId);
  const vector = chrome === 'vector';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          marginBottom: spacing.lg,
          ...cardBorder(3),
        },
        gradient: { padding: spacing.lg, minHeight: 148 },
        heroImg: {
          ...StyleSheet.absoluteFill,
          width: '100%',
          height: '100%',
        },
        scrim: {
          ...StyleSheet.absoluteFill,
        },
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
        textBlock: { flex: 1, minWidth: 0 },
        tagline: {
          color: 'rgba(255,255,255,0.88)',
          fontSize: 12,
          fontWeight: '700',
          marginBottom: 2,
          ...type.ui,
        },
        name: {
          color: '#fff',
          fontSize: 28,
          fontWeight: '800',
          ...toTextShadow('rgba(0,0,0,0.65)', { width: 1, height: 2 }, 6),
          ...type.display,
        },
        meta: {
          marginTop: spacing.sm,
          gap: spacing.sm,
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        },
        pill: {
          backgroundColor: `${colors.bgDeep}99`,
          paddingHorizontal: spacing.sm,
          paddingVertical: 6,
          borderRadius: borderRadius.md,
          gap: 6,
          alignSelf: 'flex-start',
          flexGrow: 0,
          borderWidth: 1,
          borderColor: colors.borderLight,
        },
        pillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
        streakPill: {
          backgroundColor: `${colors.bgDeep}99`,
          paddingHorizontal: spacing.sm,
          paddingVertical: 6,
          borderRadius: borderRadius.md,
          gap: 6,
          alignSelf: 'flex-start',
          flexGrow: 0,
          borderWidth: 1,
          borderColor: colors.streak,
        },
        streakPillText: { color: colors.streak, fontSize: 13, fontWeight: '800' },
      }),
    [themeId, borderRadius, cardBorder, vector, type.ui, type.display, colors]
  );

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={[...heroGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        {art?.hero ? (
          <>
            <Image source={art.hero} style={styles.heroImg} resizeMode="cover" />
            <LinearGradient
              colors={['rgba(8,2,28,0.25)', 'rgba(8,2,28,0.72)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.scrim}
            />
          </>
        ) : null}
        {!vector ? (
          <>
            <Text style={styles.decor}>{heroEmoji}</Text>
            <Text style={styles.decor2}>{heroEmoji}</Text>
          </>
        ) : null}
        <View style={[styles.row, rtl.row]}>
          <HomeAvatarSlot
            avatar={avatar}
            onPress={onAvatarPress}
            hidden={avatarHidden}
            anchorRef={avatarAnchorRef}
            onAnchorLayout={onAvatarLayout}
          />
          <View style={styles.textBlock}>
            <Text style={[styles.tagline, rtl.text]}>{tagline?.trim() || heroTagline}</Text>
            <Text style={[styles.name, rtl.text]}>{displayName}</Text>
            <View style={[styles.meta, rtl.chips]}>
              {level != null && level > 0 && (
                <View style={[styles.pill, rtl.rowInline]}>
                  <ThemeGlyph name="level" size={14} color={colors.primaryLight} />
                  <Text style={styles.pillText}>
                    {t('level')} {level}
                  </Text>
                </View>
              )}
              <View style={[styles.streakPill, rtl.rowInline]}>
                <ThemeGlyph name="streak" size={16} color={colors.streak} />
                <Text style={styles.streakPillText}>
                  {t('streak')} {streak}
                </Text>
              </View>
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
  const { colors, borderRadius, id: themeId, chrome } = useTheme();
  const type = useType();
  const showIcon = Boolean(icon) && chrome !== 'vector';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginBottom: spacing.md, width: '100%' },
        row: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
        icon: { fontSize: 22 },
        title: {
          color: colors.text,
          fontSize: 20,
          fontWeight: '800',
          flex: 1,
          letterSpacing: themeId === 'ember' ? 0.2 : 0,
          ...type.display,
        },
        line: {
          height: themeId === 'ember' ? 2 : 3,
          borderRadius: borderRadius.full,
          width: '100%',
        },
      }),
    [themeId, colors, borderRadius, type.display]
  );

  return (
    <View style={styles.wrap}>
      <View style={[styles.row, rtl.row]}>
        {showIcon ? <Text style={styles.icon}>{icon}</Text> : null}
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
