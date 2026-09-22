import React, { useEffect } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { toBoxShadow } from '../../lib/shadow';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** Thin moving gleam — a flash, not a parked bar on top of the card. */
export function CardGleam() {
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 2600 })
      ),
      -1,
      false
    );
  }, [sweep]);

  const gleamStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sweep.value, [0, 0.18, 0.55, 1], [0, 0.85, 0.7, 0]),
    transform: [
      { translateX: interpolate(sweep.value, [0, 1], [-180, 260]) },
      { rotate: '-24deg' },
    ],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0)']}
        style={styles.bevel}
      />
      <Animated.View style={[styles.slash, gleamStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.7)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.slashFill}
        />
      </Animated.View>
    </View>
  );
}

export function GleamCard({
  colors,
  border,
  glow,
  radius,
  children,
  style,
}: {
  colors: readonly [string, string, string];
  border: string;
  glow: string;
  radius: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ width: '100%' }, style]}>
      <View
        style={{
          borderRadius: radius,
          overflow: 'hidden',
          borderWidth: 1.5,
          borderColor: border,
          boxShadow: toBoxShadow({
            color: glow,
            offset: { width: 0, height: 4 },
            opacity: 0.55,
            radius: 14,
          }),
          elevation: 8,
        }}
      >
        <LinearGradient colors={[...colors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.body}>
          {children}
        </LinearGradient>
        <CardGleam />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16 },
  bevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
  },
  slash: {
    position: 'absolute',
    top: -30,
    bottom: -30,
    width: 28,
  },
  slashFill: { flex: 1 },
});
