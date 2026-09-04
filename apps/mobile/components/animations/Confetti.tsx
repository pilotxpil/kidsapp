import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../lib/theme-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface ConfettiProps {
  active: boolean;
  count?: number;
}

function ConfettiPiece({ x, delay, color }: { x: number; delay: number; color: string }) {
  const y = useSharedValue(-40);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withTiming(SCREEN_H + 60, { duration: 1800 + Math.random() * 600, easing: Easing.linear })
    );
    rotate.value = withDelay(
      delay,
      withTiming(360 * (Math.random() > 0.5 ? 1 : -1), { duration: 2000, easing: Easing.linear })
    );
    opacity.value = withDelay(delay + 1400, withTiming(0, { duration: 400 }));
  }, [delay, opacity, rotate, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        { left: x, backgroundColor: color },
        style,
      ]}
    />
  );
}

export function Confetti({ active, count = 28 }: ConfettiProps) {
  const { colors } = useTheme();
  const confettiColors = colors.confetti;

  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * SCREEN_W,
        delay: Math.random() * 280,
        color: confettiColors[i % confettiColors.length],
      })),
    [count, confettiColors]
  );

  if (!active) return null;

  return (
    <Animated.View pointerEvents="none" style={styles.container}>
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} x={p.x} delay={p.delay} color={p.color} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
  },
  piece: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 8,
    borderRadius: 0,
  },
});
