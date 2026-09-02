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

const CARD_HEIGHT = 112;
const GRID_PADDING = spacing.lg;

export function ThemePicker() {
  const { width: screenW } = useWindowDimensions();
  const { id: currentId, setUiTheme, borderRadius, colors } = useTheme();
  const type = useType();
  const [saving, setSaving] = useState<UiThemeId | null>(null);
  const gap = spacing.sm;
  const cardWidth = Math.floor((screenW - GRID_PADDING * 2 - gap) / 2);

  const handleSelect = async (themeId: UiThemeId, sfx: typeof UI_THEME_OPTIONS[0]['sfx']) => {
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
                  {getThemeArt(opt.id)?.gem ? (
                    <Image source={getThemeArt(opt.id)!.gem} style={styles.gemArt} resizeMode="contain" />
                  ) : (
                    <>
                      <Text style={styles.bgDecor}>{opt.decorEmojis.slice(0, 3).join(' ')}</Text>
                      <Text style={styles.icon}>{opt.icon}</Text>
                    </>
                  )}
                  <Text style={[styles.name, type.title]} numberOfLines={1}>
                    {opt.name}
                  </Text>
                  <Text style={[styles.sub, type.body]} numberOfLines={1}>
                    {opt.subtitle}
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
  grid: { gap: spacing.sm, width: '100%' },
  cardOuter: { overflow: 'hidden' },
  card: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgDecor: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    opacity: 0.35,
    letterSpacing: 1,
  },
  icon: { fontSize: 28, marginBottom: 4 },
  gemArt: { width: 40, height: 40, marginBottom: 4 },
  name: { fontSize: 10, fontWeight: '800', textAlign: 'center', color: '#fff', width: '100%' },
  sub: {
    fontSize: 9,
    marginTop: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.8)',
    width: '100%',
  },
  badge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
