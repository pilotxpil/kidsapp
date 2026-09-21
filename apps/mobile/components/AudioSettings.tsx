import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { useType } from '../lib/typography';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';
import { isSfxMuted, setSfxMuted, playSfx, initSfx } from '../lib/sfx';
import { isBgmMuted, setBgmMuted, startBgm, initBgm } from '../lib/bgm';
import { SectionHeader } from './ThemedHero';

export function AudioSettings() {
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();
  const type = useType();
  const ember = themeId === 'ember';
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);

  useEffect(() => {
    void (async () => {
      await Promise.all([initSfx(), initBgm()]);
      setSoundOn(!isSfxMuted());
      setMusicOn(!isBgmMuted());
    })();
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: { marginBottom: spacing.lg, width: '100%' },
        row: ember
          ? {
              alignItems: 'stretch',
              backgroundColor: 'rgba(12,8,6,0.72)',
              borderRadius: 18,
              padding: spacing.md,
              width: '100%',
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.32)',
            }
          : {
              alignItems: 'stretch',
              backgroundColor: colors.bgCard,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              width: '100%',
              ...cardBorder(2),
            },
        top: { justifyContent: 'space-between', alignItems: 'center', width: '100%' },
        copy: { flex: 1, minWidth: 0, paddingEnd: spacing.md },
        label: { color: colors.text, fontWeight: '700', flex: 1, ...type.body },
        hint: { color: colors.textMuted, fontSize: 12, marginTop: 2, ...type.ui },
        sw: { flexShrink: 0 },
      }),
    [themeId, colors, borderRadius, cardBorder, ember, type.body, type.ui]
  );

  const toggleSound = async (next: boolean) => {
    setSoundOn(next);
    await setSfxMuted(!next);
    if (next) playSfx('tap');
  };

  const toggleMusic = async (next: boolean) => {
    setMusicOn(next);
    await setBgmMuted(!next);
    if (next) void startBgm(themeId);
    if (next || soundOn) playSfx('tap');
  };

  return (
    <View style={styles.section}>
      <SectionHeader title={t('kidSettings')} icon="⚙️" />
      <View style={styles.row}>
        <View style={[styles.top, rtl.headerSplit]}>
          <Pressable
            style={styles.copy}
            onPress={() => void toggleSound(!soundOn)}
            accessibilityRole="switch"
            accessibilityState={{ checked: soundOn }}
          >
            <Text style={[styles.label, rtl.textFull]}>{t('soundEffects')}</Text>
            <Text style={[styles.hint, rtl.textFull]}>{t('soundEffectsHint')}</Text>
          </Pressable>
          <Switch
            value={soundOn}
            onValueChange={(next) => void toggleSound(next)}
            trackColor={{ false: colors.bgDeep, true: colors.primary }}
            thumbColor={soundOn ? colors.primaryLight : colors.textMuted}
            style={styles.sw}
          />
        </View>
      </View>
      <View style={[styles.row, { marginTop: spacing.sm }]}>
        <View style={[styles.top, rtl.headerSplit]}>
          <Pressable
            style={styles.copy}
            onPress={() => void toggleMusic(!musicOn)}
            accessibilityRole="switch"
            accessibilityState={{ checked: musicOn }}
          >
            <Text style={[styles.label, rtl.textFull]}>{t('backgroundMusic')}</Text>
            <Text style={[styles.hint, rtl.textFull]}>{t('backgroundMusicHint')}</Text>
          </Pressable>
          <Switch
            value={musicOn}
            onValueChange={(next) => void toggleMusic(next)}
            trackColor={{ false: colors.bgDeep, true: colors.primary }}
            thumbColor={musicOn ? colors.primaryLight : colors.textMuted}
            style={styles.sw}
          />
        </View>
      </View>
    </View>
  );
}
