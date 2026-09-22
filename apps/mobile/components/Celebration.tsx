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
import { toTextShadow } from '../lib/shadow';

interface CelebrationProps {
  visible: boolean;
  message?: string;
  icon?: string;
  /** Theme kicker by default. Pass `""` to hide the skin name. */
  kicker?: string;
  sfx?: SfxName | false;
  confettiCount?: number;
  huge?: boolean;
  onDone?: () => void;
}

export function Celebration({
  visible,
  message = 'בוצע',
  icon,
  kicker,
  sfx,
  confettiCount = 48,
  huge,
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
  const displayKicker = kicker === undefined ? celebrationKicker : kicker;
  const gemArt = getThemeArt(themeId)?.gem;
  const { overlayStyle, cardStyle: enterStyle } = useModalEnter(visible);

  useEffect(() => {
    if (!visible) return;
    if (playName) playSfx(playName);
    const timer = setTimeout(() => onDone?.(), huge ? 2200 : 1600);
    return () => clearTimeout(timer);
  }, [visible, playName, onDone, huge]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle, { pointerEvents: 'none' }]}>
      <Confetti active={visible} count={confettiCount} />
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
          {displayKicker ? <Text style={styles.kicker}>{displayKicker}</Text> : null}
          <Text style={[styles.message, huge && styles.huge]}>{message}</Text>
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
    ...toTextShadow('rgba(0,0,0,0.4)', { width: 1, height: 1 }, 2),
  },
  message: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    ...toTextShadow('rgba(0,0,0,0.3)', { width: 1, height: 1 }, 2),
  },
  huge: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
