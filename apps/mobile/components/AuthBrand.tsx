import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeInUp } from './animations/FadeInUp';
import { getTheme } from '../constants/themes';
import { spacing } from '../constants/theme';
import { t } from '../lib/i18n';

type AuthBrandVariant = 'welcome' | 'kid' | 'parent' | 'register';

interface AuthBrandProps {
  variant: AuthBrandVariant;
  compact?: boolean;
}

export function AuthBrand({ variant, compact }: AuthBrandProps) {
  const theme = variant === 'kid' ? getTheme('brawl') : getTheme('roblox');
  const markEmoji =
    variant === 'kid' ? '💎' : variant === 'register' ? '🛡️' : variant === 'parent' ? '🪙' : '🏆';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { alignItems: 'center', width: '100%' },
        mark: {
          width: compact ? 72 : 96,
          height: compact ? 72 : 96,
          borderRadius: theme.borderRadius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: compact ? spacing.sm : spacing.md,
          ...theme.cardBorder(3),
          shadowColor: theme.colors.glow,
          shadowOpacity: 0.55,
          shadowRadius: 18,
          elevation: 14,
        },
        markText: { fontSize: compact ? 36 : 48 },
        appName: {
          fontSize: compact ? 32 : 44,
          fontWeight: '900',
          color: theme.colors.text,
          letterSpacing: compact ? 2 : 4,
          textAlign: 'center',
          textShadowColor: 'rgba(0,0,0,0.55)',
          textShadowOffset: { width: 0, height: 3 },
          textShadowRadius: 8,
        },
        appNameAccent: { color: theme.colors.primary },
        subTag: {
          fontSize: 13,
          color: theme.colors.primaryLight,
          textAlign: 'center',
          marginTop: spacing.sm,
          marginBottom: compact ? spacing.lg : spacing.xl,
          fontWeight: '700',
        },
        heroTitle: {
          fontSize: 26,
          fontWeight: '800',
          color: theme.colors.text,
          textAlign: 'center',
          marginTop: spacing.xs,
        },
        heroSub: {
          fontSize: 14,
          color: theme.colors.textMuted,
          textAlign: 'center',
          marginTop: spacing.xs,
          marginBottom: compact ? spacing.lg : spacing.xl,
        },
      }),
    [compact, theme]
  );

  const nameParts = t('appName').split('Quest');

  return (
    <View style={styles.wrap}>
      <FadeInUp index={0}>
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mark}
        >
          <Text style={styles.markText}>{markEmoji}</Text>
        </LinearGradient>
      </FadeInUp>

      <FadeInUp index={1}>
        <Text style={styles.appName}>
          {nameParts[0]}
          <Text style={styles.appNameAccent}>Quest</Text>
        </Text>
      </FadeInUp>

      {variant === 'welcome' ? (
        <FadeInUp index={2}>
          <Text style={styles.subTag}>{t('appSubTag')}</Text>
        </FadeInUp>
      ) : (
        <FadeInUp index={2}>
          <Text style={styles.heroTitle}>
            {variant === 'kid'
              ? t('kidLoginHero')
              : variant === 'register'
                ? t('parentRegisterHero')
                : t('parentLoginHero')}
          </Text>
          <Text style={styles.heroSub}>
            {variant === 'kid'
              ? t('kidLoginSub')
              : variant === 'register'
                ? t('parentRegisterSub')
                : t('parentLoginSub')}
          </Text>
        </FadeInUp>
      )}
    </View>
  );
}
