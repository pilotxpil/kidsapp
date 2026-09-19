import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COSMETIC_ITEMS } from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { BouncyPressable } from './animations/BouncyPressable';
import { KidAvatar } from './KidAvatar';
import { rtl } from '../lib/rtl';

interface ShopAvatarGridProps {
  selected?: string;
  onSelect: (id: string) => void;
  savingId?: string | null;
}

export function ShopAvatarGrid({ selected, onSelect, savingId }: ShopAvatarGridProps) {
  const { colors, borderRadius } = useTheme();
  const items = COSMETIC_ITEMS.filter((c) => c.type === 'avatar');

  return (
    <View style={[styles.grid, rtl.tabs]}>
      {items.map((item) => {
        const isSelected = item.id === selected;
        const loading = savingId === item.id;
        return (
          <View key={item.id} style={styles.cell}>
            <BouncyPressable
              style={[
                styles.btn,
                {
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.bgCardLight,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 3 : 2,
                },
              ]}
              onPress={() => onSelect(item.id)}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <KidAvatar avatar={item.id} size={56} />
              )}
            </BouncyPressable>
            <Text
              numberOfLines={2}
              style={[styles.label, { color: isSelected ? colors.primary : colors.textMuted }]}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    width: '100%',
  },
  cell: {
    width: 72,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  btn: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
});
