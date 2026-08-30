import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { spacing } from '../constants/theme';
import { UI_THEME_OPTIONS } from '../constants/themes';
import { useTheme } from '../lib/theme-context';
import { BouncyPressable } from './animations/BouncyPressable';
import { FadeInUp } from './animations/FadeInUp';
import { SectionHeader } from './ThemedHero';
import { playSfx } from '../lib/sfx';
import { rtl } from '../lib/rtl';

const CARD_HEIGHT = 118;
const GRID_PADDING = spacing.lg;

export function GameWorlds() {
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const { id: currentId, borderRadius, cardBorder } = useTheme();
  const gap = spacing.sm;
  const cardWidth = Math.floor((screenW - GRID_PADDING * 2 - gap) / 2);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { width: '100%', marginBottom: spacing.lg },
        grid: { gap: spacing.sm, width: '100%' },
        card: {
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          height: CARD_HEIGHT,
          ...cardBorder(2),
        },
        cardInner: {
          flex: 1,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.sm,
          alignItems: 'center',
          justifyContent: 'center',
        },
        decor: {
          position: 'absolute',
          top: 4,
          right: 6,
          fontSize: 20,
          opacity: 0.35,
        },
        icon: { fontSize: 32, marginBottom: 6 },
        title: { color: '#fff', fontSize: 11, fontWeight: '800', textAlign: 'center' },
        sub: { color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 2 },
        activeTag: {
          marginTop: 6,
          fontSize: 9,
          fontWeight: '800',
          color: '#fff',
          backgroundColor: 'rgba(0,0,0,0.35)',
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: borderRadius.full,
          overflow: 'hidden',
        },
        inactiveOverlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.45)',
        },
      }),
    [currentId, borderRadius, cardBorder]
  );

  return (
    <View style={styles.wrap}>
      <SectionHeader title="עולמות" icon="🎮" />
      <View style={[styles.grid, rtl.tabs]}>
        {UI_THEME_OPTIONS.map((world, i) => {
          const active = world.id === currentId;
          return (
            <FadeInUp key={world.id} index={i} style={{ width: cardWidth }}>
              <BouncyPressable
                style={[styles.card, active && { borderColor: world.accent, borderWidth: 3 }]}
                onPress={() => {
                  playSfx(world.sfx);
                  router.push('/(kid)/shop');
                }}
              >
                <LinearGradient
                  colors={[world.heroGradient[0], world.heroGradient[1]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardInner}
                >
                  {!active && <View style={styles.inactiveOverlay} />}
                  <Text style={styles.decor}>{world.decorEmojis[0]}</Text>
                  <Text style={styles.icon}>{world.icon}</Text>
                  <Text style={styles.title}>{world.name}</Text>
                  <Text style={styles.sub}>{world.subtitle}</Text>
                  {active && <Text style={styles.activeTag}>● פעיל</Text>}
                </LinearGradient>
              </BouncyPressable>
            </FadeInUp>
          );
        })}
      </View>
    </View>
  );
}
