import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
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
import { BouncyPressable } from './animations/BouncyPressable';
import { getTheme } from '../constants/themes';
import type { UiThemeId } from '@kidsapp/shared';

type PortalVariant = 'hero' | 'parent';

interface PortalButtonProps {
  variant: PortalVariant;
  emoji: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const themeMap: Record<PortalVariant, UiThemeId> = {
  hero: 'brawl',
  parent: 'roblox',
};

export function PortalButton({ variant, emoji, title, subtitle, onPress, style }: PortalButtonProps) {
  const theme = getTheme(themeMap[variant]);
  const pulse = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [pulse, shimmer]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0.85]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.06]) }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-220, 220]) },
      { rotate: '-18deg' },
    ],
    opacity: interpolate(shimmer.value, [0, 0.3, 0.7, 1], [0, 0.55, 0.55, 0]),
  }));

  const isHero = variant === 'hero';
  const glowColor = isHero ? theme.colors.glow : theme.colors.primary;
  const borderColors = isHero
    ? ([theme.colors.primary, theme.colors.accent, theme.colors.primaryLight] as const)
    : ([theme.colors.primary, '#ffffff55', theme.colors.primaryDark] as const);

  return (
    <View style={[styles.wrap, style]}>
      <Animated.View
        style={[
          styles.glowRing,
          {
            borderRadius: theme.borderRadius.lg + 4,
            shadowColor: glowColor,
            borderColor: isHero ? `${theme.colors.accent}55` : `${theme.colors.primary}66`,
          },
          glowStyle,
        ]}
      />

      <BouncyPressable onPress={onPress} scaleDown={0.96} style={styles.pressable}>
        <View
          style={[
            styles.outer,
            {
              borderRadius: theme.borderRadius.lg,
              ...theme.cardBorder(isHero ? 3 : 2),
            },
          ]}
        >
          <LinearGradient
            colors={
              isHero
                ? [theme.colors.gradientStart, theme.colors.primaryDark, theme.colors.gradientEnd]
                : [theme.colors.bgCard, theme.colors.bgCardLight, theme.colors.bgCard]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { borderRadius: theme.borderRadius.lg }]}
          >
            <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none">
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGrad}
              />
            </Animated.View>

            <LinearGradient
              colors={[...borderColors]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.topAccent, { borderRadius: theme.borderRadius.lg }]}
            />

            <View style={styles.content}>
              <View
                style={[
                  styles.emojiBubble,
                  {
                    backgroundColor: isHero ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                    borderColor: isHero ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
                  },
                ]}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
                {subtitle ? (
                  <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>
                ) : null}
              </View>
            </View>
          </LinearGradient>
        </View>
      </BouncyPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    position: 'relative',
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 16,
  },
  pressable: {
    width: '100%',
  },
  outer: {
    overflow: 'hidden',
    width: '100%',
  },
  gradient: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    overflow: 'hidden',
    minHeight: 88,
    justifyContent: 'center',
  },
  shimmer: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 80,
    zIndex: 2,
  },
  shimmerGrad: {
    flex: 1,
    width: 80,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.85,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 1,
    direction: 'rtl',
  },
  emojiBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emoji: {
    fontSize: 28,
  },
  textCol: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
