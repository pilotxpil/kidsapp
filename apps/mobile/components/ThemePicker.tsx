import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { UiThemeId } from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { UI_THEME_OPTIONS } from '../constants/themes';
import { useTheme } from '../lib/theme-context';
import { playSfx } from '../lib/sfx';
import { BouncyPressable } from './animations/BouncyPressable';
import { rtl } from '../lib/rtl';

export function ThemePicker() {
  const { id: currentId, setUiTheme, borderRadius, colors } = useTheme();
  const [saving, setSaving] = useState<UiThemeId | null>(null);

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
    <View style={styles.wrap}>
      <View style={[styles.row, rtl.row]}>
        {UI_THEME_OPTIONS.map((opt) => {
          const selected = opt.id === currentId;
          const loading = saving === opt.id;
          return (
            <BouncyPressable
              key={opt.id}
              style={[
                styles.cardOuter,
                {
                  borderRadius: borderRadius.lg,
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
                    <Text style={styles.bgDecor}>{opt.decorEmojis.join(' ')}</Text>
                    <Text style={styles.icon}>{opt.icon}</Text>
                    <Text style={styles.name}>{opt.name}</Text>
                    <Text style={styles.sub}>{opt.subtitle}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  row: { gap: spacing.sm },
  cardOuter: { flex: 1, overflow: 'hidden' },
  card: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    minHeight: 130,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgDecor: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    opacity: 0.35,
    letterSpacing: 2,
  },
  icon: { fontSize: 36, marginBottom: 6 },
  name: { fontSize: 11, fontWeight: '800', textAlign: 'center', color: '#fff' },
  sub: { fontSize: 10, marginTop: 2, textAlign: 'center', color: 'rgba(255,255,255,0.8)' },
  badge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
