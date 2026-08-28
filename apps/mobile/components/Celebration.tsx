import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { colors, borderRadius, spacing, blockBorder } from '../constants/theme';
import { playSfx, SfxName } from '../lib/sfx';
import { Confetti } from './animations/Confetti';

interface CelebrationProps {
  visible: boolean;
  message?: string;
  sfx?: SfxName;
  onDone?: () => void;
}

export function Celebration({ visible, message = 'בוצע', sfx = 'complete', onDone }: CelebrationProps) {
  useEffect(() => {
    if (!visible) return;
    playSfx(sfx);
    const timer = setTimeout(() => onDone?.(), 1800);
    return () => clearTimeout(timer);
  }, [visible, sfx, onDone]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Confetti active={visible} count={36} />
      <Animated.View entering={ZoomIn.duration(380).springify().damping(14)} style={styles.messageBox}>
        <Text style={styles.kicker}>💚 XP</Text>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  messageBox: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    ...blockBorder(3),
    minWidth: 220,
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
