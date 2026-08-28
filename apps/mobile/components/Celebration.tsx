import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { colors, borderRadius, spacing } from '../constants/theme';
import { Confetti } from './animations/Confetti';

interface CelebrationProps {
  visible: boolean;
  message?: string;
  onDone?: () => void;
}

export function Celebration({ visible, message = 'כל הכבוד!', onDone }: CelebrationProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const emojiScale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 0;
      opacity.value = 0;
      scale.value = withSpring(1, { damping: 8, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 250 });
      emojiScale.value = withRepeat(
        withSequence(
          withSpring(1.2, { damping: 4 }),
          withSpring(1, { damping: 6 })
        ),
        -1,
        true
      );
      glow.value = withRepeat(
        withSequence(withTiming(1, { duration: 600 }), withTiming(0.3, { duration: 600 })),
        -1,
        true
      );

      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 400 }, (finished) => {
          if (finished && onDone) {
            runOnJS(onDone)();
          }
        });
      }, 2800);

      return () => clearTimeout(timer);
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [visible, scale, opacity, emojiScale, glow, onDone]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <Confetti active={visible} />
      <Animated.View style={[styles.glowRing, glowStyle]} />
      <Animated.View style={[styles.messageBox, boxStyle]}>
        <Animated.Text style={[styles.emoji, emojiStyle]}>🎉</Animated.Text>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.sub}>מדהים! 🚀</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  glowRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  messageBox: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
    minWidth: 260,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  emoji: {
    fontSize: 72,
    marginBottom: spacing.md,
  },
  message: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  sub: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
