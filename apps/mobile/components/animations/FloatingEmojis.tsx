import React, { useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface FloatingEmojisProps {
  emojis?: string[];
  count?: number;
  opacity?: number;
}

function FloatingParticle({ emoji, x, y, size, duration, delay }: {
  emoji: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}) {
  const drift = useSharedValue(0);
  const rotate = useSharedValue(0);
  const pulse = useSharedValue(0.6);

  React.useEffect(() => {
    drift.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    rotate.value = withDelay(
      delay,
      withRepeat(withTiming(360, { duration: duration * 2, easing: Easing.linear }), -1, false)
    );
    pulse.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration * 0.8 }),
          withTiming(0.5, { duration: duration * 0.8 })
        ),
        -1,
        true
      )
    );
  }, [delay, drift, duration, pulse, rotate]);

  const style = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [
      { translateY: drift.value * 18 - 9 },
      { translateX: Math.sin(drift.value * Math.PI) * 6 },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.Text
      pointerEvents="none"
      style={[styles.particle, { left: x, top: y, fontSize: size }, style]}
    >
      {emoji}
    </Animated.Text>
  );
}

export function FloatingEmojis({
  emojis = ['⭐', '✨', '🎮', '🏆', '💎', '🔥', '🎯', '🌟'],
  count = 12,
  opacity = 0.35,
}: FloatingEmojisProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        emoji: emojis[i % emojis.length],
        x: Math.random() * (SCREEN_W - 40),
        y: Math.random() * (SCREEN_H * 0.85),
        size: 16 + Math.random() * 18,
        duration: 2500 + Math.random() * 2000,
        delay: Math.random() * 1500,
      })),
    [count, emojis]
  );

  return (
    <View pointerEvents="none" style={[styles.container, { opacity }]}>
      {particles.map((p) => (
        <FloatingParticle key={p.id} {...p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
  },
});
