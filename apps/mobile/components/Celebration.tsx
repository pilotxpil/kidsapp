import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { ZoomIn, FadeIn } from 'react-native-reanimated';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { playSfx, SfxName } from '../lib/sfx';
import { Confetti } from './animations/Confetti';

interface CelebrationProps {
  visible: boolean;
  message?: string;
  sfx?: SfxName;
  onDone?: () => void;
}

export function Celebration({ visible, message = 'בוצע', sfx, onDone }: CelebrationProps) {
  const { colors, borderRadius, cardBorder, celebrationKicker, heroGradient, sfx: themeSfx, icon } = useTheme();
  const playName = sfx ?? themeSfx;

  useEffect(() => {
    if (!visible) return;
    playSfx(playName);
    const timer = setTimeout(() => onDone?.(), 2000);
    return () => clearTimeout(timer);
  }, [visible, playName, onDone]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Confetti active={visible} count={48} />
      <Animated.View entering={ZoomIn.duration(400).springify().damping(12)}>
        <LinearGradient
          colors={[...heroGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            {
              borderRadius: borderRadius.lg,
              paddingVertical: spacing.xl,
              paddingHorizontal: spacing.xl * 1.5,
              alignItems: 'center',
              minWidth: 260,
              ...cardBorder(3),
            },
          ]}
        >
          <Animated.Text entering={FadeIn.delay(100)} style={styles.bigIcon}>
            {icon}
          </Animated.Text>
          <Text style={styles.kicker}>{celebrationKicker}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={[styles.sparkRow]}>
            {['✨', '⭐', '✨'].map((s, i) => (
              <Text key={i} style={styles.spark}>{s}</Text>
            ))}
          </View>
        </LinearGradient>
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  bigIcon: { fontSize: 52, marginBottom: spacing.sm },
  kicker: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  message: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  sparkRow: { flexDirection: 'row', gap: 12, marginTop: spacing.md },
  spark: { fontSize: 18, opacity: 0.9 },
});
