import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius } from '../constants/theme';
import { BouncyPressable } from './animations/BouncyPressable';
import { FadeInUp } from './animations/FadeInUp';
import { playSfx, SfxName } from '../lib/sfx';
import { rtl } from '../lib/rtl';

const WORLDS: { id: string; title: string; subtitle: string; sfx: SfxName }[] = [
  { id: 'minecraft', title: 'Minecraft', subtitle: 'בלוקים', sfx: 'complete' },
  { id: 'brawl', title: 'Brawl Stars', subtitle: 'ג׳מס', sfx: 'gem' },
  { id: 'roblox', title: 'Roblox', subtitle: 'Robux', sfx: 'coin' },
];

export function GameWorlds() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, rtl.text]}>עולמות</Text>
      <View style={[styles.row, rtl.row]}>
        {WORLDS.map((world, i) => (
          <FadeInUp key={world.id} index={i} style={styles.cardWrap}>
            <BouncyPressable
              style={styles.card}
              onPress={() => {
                playSfx(world.sfx);
                router.push('/(kid)/shop');
              }}
            >
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
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
