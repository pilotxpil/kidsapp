import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { UiThemeId } from '@kidsapp/shared';
import { THEMES, UI_THEME_OPTIONS, INK, WHITE } from '../constants/themes';
import { useTheme } from '../lib/theme-context';
import { usePremium, useErrorHandler } from '../lib/premium';
import { useAuth } from '../lib/auth';
import { haptic } from '../lib/haptics';
import { playSfx } from '../lib/sfx';
import { c } from '../lib/i18n';
import { ROW } from '../lib/dir';
import { Icon, Txt, toast } from './ui';

/** World (theme) picker: painted mini-skies. Premium worlds show a lock for free families. */
export function WorldPicker() {
  const { id: current, setUiTheme } = useTheme();
  const { isPremium, openPaywall } = usePremium();
  const { user } = useAuth();
  const onError = useErrorHandler();
  const [saving, setSaving] = useState<UiThemeId | null>(null);

  const choose = async (id: UiThemeId) => {
    if (id === current || saving) return;
    const theme = THEMES[id];
    if (theme.premium && !isPremium) {
      haptic.warn();
      if (user?.role === 'parent') openPaywall('themes');
      else toast('העולם הזה פתוח במשפחות פרימיום. בקשו מההורים!', 'info');
      return;
    }
    setSaving(id);
    haptic.select();
    playSfx(theme.sfx, { volume: 0.6 });
    try {
      await setUiTheme(id);
      // Welcome to the new world: its own cheer, once its sound set is active.
      setTimeout(() => {
        haptic.success();
        void playSfx('cheer', { volume: 0.8 });
      }, 180);
    } catch (e) {
      onError(e);
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={[styles.grid, { flexDirection: ROW }]}>
      {UI_THEME_OPTIONS.map((id) => {
        const t = THEMES[id];
        const on = id === current;
        const locked = t.premium && !isPremium;
        return (
          <Pressable
            key={id}
            onPress={() => choose(id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t.name}
            style={styles.cell}
          >
            <View style={[styles.tile, on && styles.tileOn]}>
              <LinearGradient colors={[t.world.sky[0], t.world.sky[1]]} style={StyleSheet.absoluteFill} />
              <Txt size={34} align="center" style={{ lineHeight: 42 }}>
                {t.icon}
              </Txt>
              {saving === id ? <ActivityIndicator color={WHITE} style={StyleSheet.absoluteFill} /> : null}
              {locked ? (
                <View style={styles.lock}>
                  <Icon name="lock" size={14} color={INK} stroke={2.6} />
                </View>
              ) : null}
              {on ? (
                <View style={styles.check}>
                  <Icon name="check" size={14} color={WHITE} stroke={3.2} />
                </View>
              ) : null}
            </View>
            <Txt v="caption" align="center" numberOfLines={1}>
              {t.name}
            </Txt>
            {locked ? (
              <Txt v="tiny" align="center" muted>
                {c.kid.premiumWorld}
              </Txt>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '33.33%', padding: 5, gap: 4 },
  tile: {
    height: 74,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: INK,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOn: { borderWidth: 3.5, boxShadow: `0px 0px 0px 3px #FFC233` },
  lock: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FFC233',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: INK,
    padding: 2,
  },
  check: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#1DBF7F',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: INK,
    padding: 2,
  },
});
