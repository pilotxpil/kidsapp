import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, blockBorder } from '../constants/theme';
import { BouncyPressable } from './animations/BouncyPressable';
import { FadeInUp } from './animations/FadeInUp';
import { playSfx, SfxName } from '../lib/sfx';
import { rtl } from '../lib/rtl';

const WORLDS: { id: string; icon: string; title: string; subtitle: string; sfx: SfxName; accent: string }[] = [
  { id: 'minecraft', icon: '🟩', title: 'Minecraft', subtitle: 'בלוקים', sfx: 'complete', accent: colors.primary },
  { id: 'brawl', icon: '💎', title: 'Brawl Stars', subtitle: 'ג׳מס', sfx: 'gem', accent: colors.diamond },
  { id: 'roblox', icon: '🪙', title: 'Roblox', subtitle: 'Robux', sfx: 'coin', accent: colors.gold },
];

export function GameWorlds() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, rtl.text]}>⛏️ עולמות</Text>
      <View style={[styles.row, rtl.row]}>
        {WORLDS.map((world, i) => (
          <FadeInUp key={world.id} index={i} style={styles.cardWrap}>
            <BouncyPressable
              style={[styles.card, { borderTopColor: world.accent, borderLeftColor: world.accent }]}
              onPress={() => {
                playSfx(world.sfx);
                router.push('/(kid)/shop');
              }}
            >
              <Text style={styles.icon}>{world.icon}</Text>
              <Text style={styles.title}>{world.title}</Text>
              <Text style={styles.sub}>{world.subtitle}</Text>
            </BouncyPressable>
          </FadeInUp>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  heading: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  row: {
    gap: spacing.sm,
  },
  cardWrap: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    ...blockBorder(2),
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
});
