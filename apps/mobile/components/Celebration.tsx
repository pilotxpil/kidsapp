import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, borderRadius, spacing } from '../constants/theme';

interface CelebrationProps {
  visible: boolean;
  message?: string;
  onDone?: () => void;
}

const EMOJIS = ['🎉', '⭐', '🏆', '💎', '🔥', '✨', '🎮', '👑'];

export function Celebration({ visible, message = 'כל הכבוד!', onDone }: CelebrationProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(
          () => onDone?.()
        );
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      scale.setValue(0);
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const { width } = Dimensions.get('window');

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      {EMOJIS.map((emoji, i) => (
        <Text
          key={i}
          style={[
            styles.floatingEmoji,
            {
              left: (width / EMOJIS.length) * i + 10,
              top: 100 + (i % 3) * 80,
            },
          ]}
        >
          {emoji}
        </Text>
      ))}
      <Animated.View style={[styles.messageBox, { transform: [{ scale }] }]}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.message}>{message}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  floatingEmoji: {
    position: 'absolute',
    fontSize: 36,
  },
  messageBox: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
    minWidth: 250,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  message: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
});
