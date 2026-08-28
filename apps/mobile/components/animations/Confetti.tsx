import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CONFETTI_COLORS = [colors.primary, colors.gold, colors.accent, colors.secondary, '#ff6b9d', '#60a5fa'];
const CONFETTI_EMOJIS = ['🎉', '⭐', '✨', '🏆', '💫', '🎊'];

interface ConfettiProps {
  active: boolean;
  count?: number;
}

function ConfettiPiece({ x, delay, color, emoji, isEmoji }: {
  x: number;
  delay: number;
  color: string;
  emoji?: string;
  isEmoji: boolean;
}) {
  const y = useSharedValue(-40);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withTiming(SCREEN_H + 60, { duration: 2200 + Math.random() * 800, easing: Easing.linear })
    );
    rotate.value = withDelay(
      delay,
      withTiming(720 * (Math.random() > 0.5 ? 1 : -1), { duration: 2500, easing: Easing.linear })
    );
    opacity.value = withDelay(delay + 1800, withTiming(0, { duration: 600 }));
  }, [delay, opacity, rotate, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: y.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  if (isEmoji) {
    return (
      <Animated.Text style={[styles.emoji, { left: x }, style]}>
        {emoji}
      </Animated.Text>
    );
  }

  return (
    <Animated.View
      style={[
        styles.piece,
        { left: x, backgroundColor: color, width: 8 + Math.random() * 6, height: 12 + Math.random() * 6 },
        style,
      ]}
    />
  );
}

export function Confetti({ active, count = 40 }: ConfettiProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * SCREEN_W,
        delay: Math.random() * 400,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        isEmoji: i % 4 === 0,
        emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
      })),
    [count]
  );

  if (!active) return null;

  return (
    <Animated.View pointerEvents="none" style={styles.container}>
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} x={p.x} delay={p.delay} color={p.color} emoji={p.emoji} isEmoji={p.isEmoji} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  piece: {
    position: 'absolute',
    top: 0,
    borderRadius: 2,
  },
  emoji: {
    position: 'absolute',
    top: 0,
    fontSize: 22,
  },
});
