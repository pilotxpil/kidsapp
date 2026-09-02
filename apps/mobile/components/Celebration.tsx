import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { spacing } from '../constants/theme';
import { getThemeArt } from '../constants/theme-art';
import { useTheme } from '../lib/theme-context';
import { playSfx, SfxName } from '../lib/sfx';
import { Confetti } from './animations/Confetti';
import { useModalEnter } from './animations/modalEnter';
import { ThemeGlyph } from './icons/ThemeGlyph';

interface CelebrationProps {
  visible: boolean;
  message?: string;
  icon?: string;
  kicker?: string;
  sfx?: SfxName | false;
  onDone?: () => void;
}

export function Celebration({
  visible,
  message = 'בוצע',
  icon,
  kicker,
  sfx,
  onDone,
}: CelebrationProps) {
  const {
    borderRadius,
    cardBorder,
    celebrationKicker,
    heroGradient,
    sfx: themeSfx,
    icon: themeIcon,
    chrome,
    id: themeId,
  } = useTheme();
  const playName = sfx === false ? null : (sfx ?? themeSfx);
  const displayIcon = icon ?? themeIcon;
  const displayKicker = kicker ?? celebrationKicker;
  const gemArt = getThemeArt(themeId)?.gem;
  const { overlayStyle, cardStyle: enterStyle } = useModalEnter(visible);

  useEffect(() => {
    if (!visible) return;
    if (playName) playSfx(playName);
    const timer = setTimeout(() => onDone?.(), 1600);
    return () => clearTimeout(timer);
  }, [visible, playName, onDone]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      <Confetti active={visible} count={48} />
      <Animated.View style={enterStyle}>
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
          {chrome === 'vector' && gemArt && !icon ? (
            <Image source={gemArt} style={styles.gem} resizeMode="contain" />
          ) : chrome === 'vector' && !icon ? (
            <ThemeGlyph name="gem" size={52} color="#fff" />
          ) : (
            <Text style={styles.bigIcon}>{displayIcon}</Text>
          )}
          <Text style={styles.kicker}>{displayKicker}</Text>
          <Text style={styles.message}>{message}</Text>
        </LinearGradient>
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  gem: { width: 72, height: 72, marginBottom: spacing.sm },
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
});
