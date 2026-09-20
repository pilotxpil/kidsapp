import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { UiThemeId } from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { UI_THEME_OPTIONS } from '../constants/themes';
import { getThemeArt } from '../constants/theme-art';
import { useTheme } from '../lib/theme-context';
import { useType } from '../lib/typography';
import { playSfx } from '../lib/sfx';
import { BouncyPressable } from './animations/BouncyPressable';
import { rtl } from '../lib/rtl';

const CARD_HEIGHT = 148;
const GRID_PADDING = spacing.lg;
const ICON_SIZE = 88;

export function ThemePicker() {
  const { width: screenW } = useWindowDimensions();
  const { id: currentId, setUiTheme, borderRadius, colors } = useTheme();
  const type = useType();
  const [saving, setSaving] = useState<UiThemeId | null>(null);
  const gap = spacing.md;
  const cardWidth = Math.floor((screenW - GRID_PADDING * 2 - gap) / 2);

  const handleSelect = async (themeId: UiThemeId, sfx: (typeof UI_THEME_OPTIONS)[0]['sfx']) => {
    if (themeId === currentId || saving) return;
    setSaving(themeId);
    try {
      playSfx(sfx);
      await setUiTheme(themeId);
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={[styles.grid, rtl.tabs]}>
      {UI_THEME_OPTIONS.map((opt) => {
        const selected = opt.id === currentId;
        const loading = saving === opt.id;
        const icon = getThemeArt(opt.id)?.picker;
        return (
          <BouncyPressable
            key={opt.id}
            style={[
              styles.cardOuter,
              { width: cardWidth, height: CARD_HEIGHT, borderRadius: borderRadius.lg },
              {
                borderColor: selected ? opt.accent : colors.border,
                borderWidth: selected ? 3 : 1,
                shadowColor: selected ? opt.accent : '#000',
                shadowOpacity: selected ? 0.5 : 0.2,
                shadowRadius: selected ? 12 : 4,
                elevation: selected ? 10 : 3,
              },
            ]}
            onPress={() => handleSelect(opt.id, opt.sfx)}
          >
            <LinearGradient
              colors={[opt.heroGradient[0], opt.heroGradient[1], colors.bgCard]}
              style={[styles.card, { borderRadius: borderRadius.lg - 2 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  {icon ? (
                    <Image source={icon} style={styles.icon} resizeMode="contain" />
                  ) : null}
                  <Text style={[styles.name, type.title]} numberOfLines={1}>
                    {opt.name}
                  </Text>
                  {selected && (
                    <View style={[styles.badge, { backgroundColor: opt.accent }]}>
                      <Text style={styles.badgeText}>✓ פעיל</Text>
                    </View>
                  )}
                </>
              )}
            </LinearGradient>
          </BouncyPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md, width: '100%' },
  cardOuter: { overflow: 'hidden' },
  card: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: { width: ICON_SIZE, height: ICON_SIZE, marginBottom: 2 },
  name: { fontSize: 14, fontWeight: '800', textAlign: 'center', color: '#fff', width: '100%' },
  badge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
