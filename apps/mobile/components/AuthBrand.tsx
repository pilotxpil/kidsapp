import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { FadeInUp } from './animations/FadeInUp';
import { AuthLogo3D, type AuthLogoVariant } from './AuthLogo3D';
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
  const logoVariant: AuthLogoVariant =
    variant === 'kid' || variant === 'welcome' ? 'gem' : variant === 'register' ? 'shield' : 'coin';
  const logoSize = variant === 'welcome' && !compact ? 130 : compact ? 96 : 130;
  const titlePulse = useSharedValue(1);

  useEffect(() => {
    titlePulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [titlePulse]);

  const titleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titlePulse.value }],
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { alignItems: 'center', width: '100%' },
        gemStage: {
          width: logoSize,
          height: logoSize,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: compact ? spacing.xs : spacing.sm,
        },
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
    [compact, theme, logoSize]
  );

  const nameParts = t('appName').split('Quest');

  return (
    <View style={styles.wrap}>
      <FadeInUp index={0}>
        <View style={styles.gemStage}>
          <AuthLogo3D variant={logoVariant} size={logoSize} />
        </View>
      </FadeInUp>

      <FadeInUp index={1}>
        <Animated.View style={titleAnimStyle}>
          <Text style={styles.appName}>
            {nameParts[0]}
            <Text style={styles.appNameAccent}>Quest</Text>
          </Text>
        </Animated.View>
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
