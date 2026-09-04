import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { FadeInUp } from './animations/FadeInUp';
import { getTheme } from '../constants/themes';
import { spacing } from '../constants/theme';
import type { UiThemeId } from '@kidsapp/shared';

type AuthThemeId = Extract<UiThemeId, 'ember' | 'brawl' | 'roblox'>;

interface AuthFormCardProps {
  themeId: AuthThemeId;
  children: React.ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}

export function AuthFormCard({ themeId, children, index = 3, style }: AuthFormCardProps) {
  const theme = getTheme(themeId);
  const pulse = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    shimmer.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [pulse, shimmer]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.25, 0.65]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.02]) }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-280, 280]) },
      { rotate: '-14deg' },
    ],
    opacity: interpolate(shimmer.value, [0, 0.35, 0.65, 1], [0, 0.35, 0.35, 0]),
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width: '100%',
          position: 'relative',
        },
        glow: {
          ...StyleSheet.absoluteFill,
          borderRadius: theme.borderRadius.lg + 3,
          borderWidth: 1.5,
          borderColor: `${theme.colors.primary}55`,
          shadowColor: theme.colors.glow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.75,
          shadowRadius: 16,
          elevation: 12,
        },
        card: {
          borderRadius: theme.borderRadius.lg,
          overflow: 'hidden',
          ...theme.cardBorder(2),
        },
        gradient: {
          padding: spacing.lg,
          overflow: 'hidden',
        },
        topAccent: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          opacity: 0.9,
        },
        shimmer: {
          position: 'absolute',
          top: -30,
          bottom: -30,
          width: 70,
          zIndex: 2,
        },
        shimmerGrad: { flex: 1, width: 70 },
        inner: { zIndex: 1 },
      }),
    [theme, themeId]
  );

  const gradientColors =
    themeId === 'ember'
      ? ([
          'rgba(10,6,4,0.94)',
          'rgba(26,14,10,0.9)',
          'rgba(5,4,4,0.96)',
        ] as const)
      : themeId === 'brawl'
      ? ([
          'rgba(20,8,46,0.92)',
          'rgba(42,21,104,0.88)',
          'rgba(15,5,40,0.94)',
        ] as const)
      : ([
          'rgba(30,32,34,0.94)',
          'rgba(57,59,61,0.9)',
          'rgba(18,19,20,0.96)',
        ] as const);

  const accentColors = [
    theme.colors.primary,
    theme.colors.accent,
    theme.colors.primaryLight,
  ] as const;

  return (
    <FadeInUp index={index}>
      <View style={[styles.wrap, style]}>
        <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
        <View style={styles.card}>
          <LinearGradient colors={[...gradientColors]} style={styles.gradient}>
            <LinearGradient
              colors={[...accentColors]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.topAccent}
            />
            <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none">
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.22)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGrad}
              />
            </Animated.View>
            <View style={styles.inner}>{children}</View>
          </LinearGradient>
        </View>
      </View>
    </FadeInUp>
  );
}
