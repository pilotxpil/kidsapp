import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, View, StyleProp, ViewStyle, Image } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { KidDailyWord, ParentDailyWordKid } from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { useType } from '../lib/typography';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';
import { api } from '../lib/api';
import { BouncyPressable } from './animations/BouncyPressable';
import { KidAvatar } from './KidAvatar';
import { Button } from './Button';
import { GleamCard } from './animations/CardGleam';

const INGOT = require('../assets/daily-word-ingot.png');

/** Gold-bar look — same on every skin. */
export const GOLD_INGOT = {
  gradient: ['#FFF6C4', '#E8C547', '#B8860B'] as const,
  border: '#FFE08A',
  glow: '#FFD24A',
  title: '#3A2808',
  body: '#4A3510',
  muted: '#6B4E14',
};

interface DailyWordProps {
  kidId: string;
}

export function ShineShell({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { borderRadius } = useTheme();
  return (
    <GleamCard
      colors={GOLD_INGOT.gradient}
      border={GOLD_INGOT.border}
      glow={GOLD_INGOT.glow}
      radius={borderRadius.lg}
      style={style}
    >
      {children}
    </GleamCard>
  );
}

function useDailyWordStyles() {
  const type = useType();
  const { id: themeId } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        header: { alignItems: 'center', gap: spacing.sm, width: '100%' },
        ingot: { width: 72, height: 56 },
        textCol: { flex: 1, minWidth: 0 },
        kicker: {
          color: GOLD_INGOT.title,
          fontSize: 18,
          fontWeight: '800',
          letterSpacing: 0.3,
          ...type.display,
        },
        tapHint: {
          color: GOLD_INGOT.body,
          fontSize: 13,
          fontWeight: '700',
          marginTop: 2,
          ...type.ui,
        },
        word: {
          color: GOLD_INGOT.title,
          fontSize: 32,
          fontWeight: '800',
          marginTop: spacing.sm,
          marginBottom: spacing.sm,
          ...type.display,
        },
        label: {
          color: GOLD_INGOT.muted,
          fontSize: 12,
          fontWeight: '800',
          marginBottom: 4,
          ...type.ui,
        },
        definition: {
          color: GOLD_INGOT.body,
          fontSize: 15,
          lineHeight: 22,
          marginBottom: spacing.md,
          ...type.body,
        },
        hint: {
          color: GOLD_INGOT.muted,
          fontSize: 15,
          lineHeight: 22,
          marginBottom: spacing.sm,
          ...type.body,
        },
        study: {
          color: GOLD_INGOT.body,
          fontSize: 13,
          fontWeight: '700',
          ...type.ui,
        },
        kidBlock: {
          width: '100%',
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: 'rgba(58,40,8,0.12)',
        },
        kidHead: { alignItems: 'center', gap: spacing.sm, width: '100%', marginBottom: spacing.sm },
        kidName: {
          color: GOLD_INGOT.title,
          fontSize: 16,
          fontWeight: '800',
          ...type.ui,
        },
        kidMeta: {
          color: GOLD_INGOT.body,
          fontSize: 13,
          marginTop: 2,
          ...type.ui,
        },
        parentWord: {
          color: GOLD_INGOT.title,
          fontSize: 26,
          fontWeight: '800',
          marginBottom: spacing.xs,
          ...type.display,
        },
      }),
    [themeId, type.ui, type.body, type.display]
  );
}

export function DailyWord({ kidId }: DailyWordProps) {
  const styles = useDailyWordStyles();
  const [word, setWord] = useState<KidDailyWord | null>(null);
  const [open, setOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const tick = async () => {
        try {
          const res = await api.getDailyWord(kidId);
          if (!cancelled) setWord(res.dailyWord);
        } catch {
          /* ignore while logged out / navigating */
        }
      };
      tick();
      const id = setInterval(tick, 4000);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }, [kidId])
  );

  useEffect(() => {
    setOpen(false);
  }, [kidId, word?.date]);

  if (!word || word.status === 'won') return null;

  const handleToggle = () => {
    setOpen((v) => !v);
  };

  const icon = <Image source={INGOT} style={styles.ingot} resizeMode="contain" />;
  const revealed = open || word.status === 'won';

  return (
    <ShineShell>
      <BouncyPressable onPress={handleToggle} scaleDown={0.98}>
        <View style={[styles.header, rtl.row]}>
          {icon}
          <View style={styles.textCol}>
            <Text style={[styles.kicker, rtl.text]}>{t('dailyWordSecretTitle')}</Text>
            {!revealed ? (
              <Text style={[styles.tapHint, rtl.text]}>
                {t('dailyWordTapToOpen').replace('{n}', String(word.points))}
              </Text>
            ) : null}
            {word.status === 'won' ? (
              <Text style={[styles.tapHint, rtl.text]}>
                {t('dailyWordWon').replace('{n}', String(word.points))}
              </Text>
            ) : null}
          </View>
        </View>
        {revealed ? (
          <View>
            <Text style={[styles.word, rtl.text]}>{word.word}</Text>
            <Text style={[styles.label, rtl.text]}>{t('dailyWordMeaning')}</Text>
            <Text style={[styles.definition, rtl.text]}>{word.definition}</Text>
            <Text style={[styles.label, rtl.text]}>{t('dailyWordExample')}</Text>
            <Text style={[styles.hint, rtl.text]}>{word.hint}</Text>
            {word.status === 'open' ? (
              <Text style={[styles.study, rtl.text]}>{t('dailyWordStudy')}</Text>
            ) : null}
          </View>
        ) : null}
      </BouncyPressable>
    </ShineShell>
  );
}

export function ParentDailyWordList({
  items,
  onApprove,
}: {
  items: ParentDailyWordKid[];
  onApprove: (kidId: string) => void;
}) {
  const styles = useDailyWordStyles();
  const [open, setOpen] = useState(false);

  const pending = items.filter((w) => w.status === 'open');
  if (!pending.length) return null;

  return (
    <ShineShell style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
      <BouncyPressable
        onPress={() => {
          setOpen((v) => !v);
        }}
        scaleDown={0.98}
      >
        <View style={[styles.header, rtl.row]}>
          <Image source={INGOT} style={styles.ingot} resizeMode="contain" />
          <View style={styles.textCol}>
            <Text style={[styles.kicker, rtl.text]}>{t('dailyWordSecretTitle')}</Text>
            <Text style={[styles.tapHint, rtl.text]}>
              {open ? t('dailyWordTapToClose') : t('dailyWordTapToOpenParent')}
            </Text>
          </View>
        </View>
      </BouncyPressable>
      {open
        ? pending.map((w) => (
            <View key={w.kidId} style={styles.kidBlock}>
              <View style={[styles.kidHead, rtl.row]}>
                <KidAvatar avatar={w.kid?.avatar ?? '🎮'} size={40} />
                <View style={styles.textCol}>
                  <Text style={[styles.kidName, rtl.text]}>{w.kid?.displayName ?? t('dailyWord')}</Text>
                  <Text style={[styles.kidMeta, rtl.text]}>{t('dailyWordAskHint')}</Text>
                </View>
              </View>
              <Text style={[styles.parentWord, rtl.text]}>{w.word}</Text>
              {w.definition ? <Text style={[styles.definition, rtl.text]}>{w.definition}</Text> : null}
              {w.hint ? <Text style={[styles.hint, rtl.text]}>{w.hint}</Text> : null}
              <Button title={t('dailyWordYes')} onPress={() => onApprove(w.kidId)} variant="success" />
            </View>
          ))
        : null}
    </ShineShell>
  );
}
