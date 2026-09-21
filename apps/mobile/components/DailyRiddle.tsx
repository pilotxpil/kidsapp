import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type {
  BadgeUnlock,
  KidDailyRiddle,
  ParentDailyRiddleKid,
  RiddleVisual,
  UiThemeId,
} from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { useType } from '../lib/typography';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';
import { api } from '../lib/api';
import { playSfx } from '../lib/sfx';
import { BouncyPressable } from './animations/BouncyPressable';
import { KidAvatar } from './KidAvatar';
import { PuzzlePiece } from './icons/PuzzlePiece';
import { Button } from './Button';
import { GleamCard } from './animations/CardGleam';

type PuzzleLook = {
  gradient: readonly [string, string, string];
  border: string;
  glow: string;
  title: string;
  body: string;
  muted: string;
  choice: string;
  choiceLine: string;
  wrong: string;
  ok: string;
  pieceLight: string;
  pieceMid: string;
  pieceDark: string;
};

function puzzleLookFor(id: UiThemeId): PuzzleLook {
  if (id === 'ember') {
    return {
      gradient: ['#FFE4CC', '#FF8A3D', '#E24A00'],
      border: '#FFC090',
      glow: '#FF5A00',
      title: '#3A1208',
      body: '#5C220C',
      muted: '#8B3A14',
      choice: 'rgba(255,248,240,0.55)',
      choiceLine: 'rgba(58,18,8,0.22)',
      wrong: '#9B1C1C',
      ok: '#3D6B1F',
      pieceLight: '#FFD4A8',
      pieceMid: '#FF6A1A',
      pieceDark: '#B43200',
    };
  }
  if (id === 'minecraft') {
    return {
      gradient: ['#E8F5C8', '#8BC34A', '#4A7A28'],
      border: '#C5E1A5',
      glow: '#80FF20',
      title: '#1A2810',
      body: '#2E4A1C',
      muted: '#3D6B24',
      choice: 'rgba(255,255,240,0.5)',
      choiceLine: 'rgba(26,40,16,0.22)',
      wrong: '#9B1C1C',
      ok: '#1B5E20',
      pieceLight: '#C8E6A0',
      pieceMid: '#5D8C3B',
      pieceDark: '#2E5C1A',
    };
  }
  if (id === 'brawl') {
    return {
      gradient: ['#FFF6C4', '#FFC107', '#FF8F00'],
      border: '#FFE082',
      glow: '#00E5FF',
      title: '#1A0A40',
      body: '#2A1568',
      muted: '#5E35B1',
      choice: 'rgba(255,255,255,0.5)',
      choiceLine: 'rgba(18,8,46,0.22)',
      wrong: '#FF1744',
      ok: '#33691E',
      pieceLight: '#FFE566',
      pieceMid: '#FFC107',
      pieceDark: '#E65100',
    };
  }
  if (id === 'roblox') {
    return {
      gradient: ['#FFD4D0', '#FF5252', '#B71C1C'],
      border: '#FFAB91',
      glow: '#FF5252',
      title: '#2B0A0A',
      body: '#4A1010',
      muted: '#7F1D1D',
      choice: 'rgba(255,255,255,0.5)',
      choiceLine: 'rgba(43,10,10,0.22)',
      wrong: '#7F0000',
      ok: '#1B5E20',
      pieceLight: '#FF8A80',
      pieceMid: '#E2231A',
      pieceDark: '#8B1010',
    };
  }
  return {
    gradient: ['#FFD6F0', '#FF6EC7', '#9B59B6'],
    border: '#F8BBD0',
    glow: '#FF6EC7',
    title: '#2D1B3D',
    body: '#4A2560',
    muted: '#7B1FA2',
    choice: 'rgba(255,255,255,0.5)',
    choiceLine: 'rgba(45,27,61,0.22)',
    wrong: '#C2185B',
    ok: '#2E7D32',
    pieceLight: '#FFB3E6',
    pieceMid: '#FF6EC7',
    pieceDark: '#9B1FA2',
  };
}

function usePuzzleLook() {
  const { id } = useTheme();
  return useMemo(() => puzzleLookFor(id), [id]);
}

function PuzzleShell({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { borderRadius } = useTheme();
  const look = usePuzzleLook();
  return (
    <GleamCard
      colors={look.gradient}
      border={look.border}
      glow={look.glow}
      radius={borderRadius.lg}
      style={style}
    >
      {children}
    </GleamCard>
  );
}

function visualPartSize(size?: 's' | 'm' | 'l') {
  if (size === 'l') return 40;
  if (size === 's') return 16;
  return 24;
}

function RiddleVisualView({ visual }: { visual: RiddleVisual }) {
  const styles = useRiddleStyles();
  if (visual.kind === 'grid3') {
    return (
      <View style={styles.grid}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={styles.cell} />
        ))}
      </View>
    );
  }
  if (visual.kind === 'triangles') {
    return (
      <View style={styles.triWrap}>
        <Text style={styles.tri}>▲</Text>
        <View style={styles.triRow}>
          <Text style={styles.tri}>▲</Text>
          <Text style={styles.tri}>▲</Text>
        </View>
      </View>
    );
  }
  if (visual.kind === 'row') {
    return (
      <View style={[styles.rebusRow, rtl.rowInline]}>
        {visual.parts.map((part, i) => (
          <Text key={`${part.text}-${i}`} style={[styles.rebus, { fontSize: visualPartSize(part.size) }]}>
            {part.text}
          </Text>
        ))}
      </View>
    );
  }
  if (visual.kind === 'stack') {
    return (
      <View style={styles.rebusStack}>
        {visual.parts.map((part, i) => (
          <Text key={`${part.text}-${i}`} style={[styles.rebus, { fontSize: visualPartSize(part.size) }]}>
            {part.text}
          </Text>
        ))}
      </View>
    );
  }
  if (visual.kind === 'bag') {
    return (
      <View style={styles.bag}>
        <Text style={styles.bagEmoji}>{visual.emoji}</Text>
      </View>
    );
  }
  return (
    <View style={styles.forest}>
      <Text style={styles.forestLine}>🌲🌲🌲🌲🌲</Text>
      <Text style={styles.forestLine}>
        🌲🌲 <Text style={styles.forestHidden}>{visual.hidden}</Text> 🌲🌲
      </Text>
      <Text style={styles.forestLine}>🌲🌲🌲🌲🌲</Text>
    </View>
  );
}

function RiddlePrompt({
  prompt,
  extra,
  visual,
}: {
  prompt: string;
  extra?: string;
  visual?: RiddleVisual;
}) {
  const styles = useRiddleStyles();
  return (
    <View>
      <Text style={[styles.prompt, rtl.text]}>{prompt}</Text>
      {extra ? <Text style={[styles.extra, rtl.text]}>{extra}</Text> : null}
      {visual ? <RiddleVisualView visual={visual} /> : null}
    </View>
  );
}

function useRiddleStyles() {
  const type = useType();
  const { id: themeId } = useTheme();
  const look = usePuzzleLook();
  return useMemo(
    () =>
      StyleSheet.create({
        header: { alignItems: 'center', gap: spacing.sm, width: '100%' },
        icon: { width: 62, height: 62 },
        textCol: { flex: 1, minWidth: 0 },
        kicker: {
          color: look.title,
          fontSize: 18,
          fontWeight: '800',
          letterSpacing: 0.3,
          ...type.display,
        },
        tapHint: {
          color: look.body,
          fontSize: 13,
          fontWeight: '700',
          marginTop: 2,
          ...type.ui,
        },
        prompt: {
          color: look.title,
          fontSize: 18,
          fontWeight: '800',
          marginTop: spacing.md,
          marginBottom: spacing.sm,
          ...type.heading,
        },
        extra: {
          color: look.body,
          fontSize: 16,
          fontWeight: '700',
          marginBottom: spacing.sm,
          ...type.ui,
        },
        label: {
          color: look.muted,
          fontSize: 12,
          fontWeight: '800',
          marginTop: spacing.sm,
          marginBottom: 4,
          ...type.ui,
        },
        hint: {
          color: look.body,
          fontSize: 15,
          lineHeight: 22,
          ...type.body,
        },
        why: {
          color: look.ok,
          fontSize: 15,
          fontWeight: '700',
          lineHeight: 22,
          ...type.ui,
        },
        wrong: {
          color: look.wrong,
          fontSize: 14,
          fontWeight: '800',
          marginTop: spacing.sm,
          marginBottom: spacing.xs,
          ...type.ui,
        },
        choice: {
          backgroundColor: look.choice,
          borderWidth: 1.5,
          borderColor: look.choiceLine,
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 12,
          marginTop: spacing.sm,
          width: '100%',
        },
        choicePicked: {
          borderColor: look.title,
          backgroundColor: 'rgba(255,255,255,0.8)',
        },
        choiceWrong: {
          borderColor: look.wrong,
          backgroundColor: 'rgba(190,24,93,0.12)',
        },
        choiceOk: {
          borderColor: look.ok,
          backgroundColor: 'rgba(4,120,87,0.14)',
        },
        choiceText: {
          color: look.title,
          fontSize: 15,
          fontWeight: '800',
          ...type.ui,
        },
        grid: {
          width: 102,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignSelf: 'center',
          marginVertical: spacing.sm,
        },
        cell: {
          width: 32,
          height: 32,
          borderWidth: 1.5,
          borderColor: look.title,
          backgroundColor: 'rgba(255,255,255,0.35)',
        },
        triWrap: { alignItems: 'center', marginVertical: spacing.sm },
        triRow: { flexDirection: 'row', gap: 4 },
        tri: { color: look.title, fontSize: 28, lineHeight: 32 },
        rebusRow: {
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginVertical: spacing.sm,
          width: '100%',
        },
        rebusStack: { alignItems: 'center', gap: 4, marginVertical: spacing.sm },
        rebus: { color: look.title, fontWeight: '800', textAlign: 'center' },
        bag: {
          alignSelf: 'center',
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: look.title,
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 22,
          marginVertical: spacing.sm,
          backgroundColor: 'rgba(255,255,255,0.35)',
        },
        bagEmoji: { fontSize: 36 },
        forest: { alignItems: 'center', marginVertical: spacing.sm },
        forestLine: { fontSize: 20, lineHeight: 26, textAlign: 'center' },
        forestHidden: { color: look.muted, fontSize: 13, fontWeight: '800' },
        kidBlock: {
          width: '100%',
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: `${look.title}22`,
        },
        kidHead: { alignItems: 'center', gap: spacing.sm, width: '100%', marginBottom: spacing.sm },
        kidName: {
          color: look.title,
          fontSize: 16,
          fontWeight: '800',
          ...type.ui,
        },
        kidMeta: {
          color: look.body,
          fontSize: 13,
          marginTop: 2,
          ...type.ui,
        },
      }),
    [themeId, type.ui, type.body, type.display, type.heading, look]
  );
}

export function DailyRiddle({
  kidId,
  onWon,
}: {
  kidId: string;
  onWon?: (result: { points: number; level: number; xp: number; newBadges?: BadgeUnlock[] }) => void;
}) {
  const styles = useRiddleStyles();
  const look = usePuzzleLook();
  const [riddle, setRiddle] = useState<KidDailyRiddle | null>(null);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const tick = async () => {
        try {
          const res = await api.getDailyRiddle(kidId);
          if (!cancelled) setRiddle(res.dailyRiddle);
        } catch {
          /* ignore while logged out / navigating */
        }
      };
      tick();
      const id = setInterval(tick, 8000);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }, [kidId])
  );

  useEffect(() => {
    setOpen(false);
    setPicked(null);
  }, [kidId, riddle?.date, riddle?.id]);

  if (!riddle) return null;
  const locked = riddle.status !== 'open';
  if (locked && !open) return null;
  const revealed = open || locked;

  const handleGuess = async (guess: string) => {
    if (busy || locked) return;
    setPicked(guess);
    setBusy(true);
    try {
      const res = await api.guessDailyRiddle(kidId, guess);
      setRiddle(res.dailyRiddle);
      setOpen(true);
      if (res.correct) {
        playSfx('cheer');
        if (res.points != null && res.level != null && res.xp != null) {
          onWon?.({
            points: res.points,
            level: res.level,
            xp: res.xp,
            newBadges: res.newBadges,
          });
        }
      } else {
        playSfx('error');
      }
    } catch {
      playSfx('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PuzzleShell>
      <BouncyPressable onPress={() => setOpen((v) => !v)} scaleDown={0.98}>
        <View style={[styles.header, rtl.row]}>
          <PuzzlePiece
            size={62}
            light={look.pieceLight}
            mid={look.pieceMid}
            dark={look.pieceDark}
          />
          <View style={styles.textCol}>
            <Text style={[styles.kicker, rtl.text]}>{t('dailyRiddleTitle')}</Text>
            {!revealed ? (
              <Text style={[styles.tapHint, rtl.text]}>
                {t('dailyRiddleTapToOpen').replace('{n}', String(riddle.points))}
              </Text>
            ) : null}
            {riddle.status === 'won' ? (
              <Text style={[styles.tapHint, rtl.text]}>
                {t('dailyRiddleWon').replace('{n}', String(riddle.points))}
              </Text>
            ) : riddle.status === 'missed' ? (
              <Text style={[styles.tapHint, rtl.text]}>{t('dailyRiddleMissed')}</Text>
            ) : revealed ? (
              <Text style={[styles.tapHint, rtl.text]}>{t('dailyRiddleTapToClose')}</Text>
            ) : null}
          </View>
        </View>
      </BouncyPressable>
      {revealed ? (
        <View>
          <RiddlePrompt prompt={riddle.prompt} extra={riddle.extra} visual={riddle.visual} />
          {riddle.status === 'open' ? (
            <>
              {riddle.choices.map((choice) => {
                const isPicked = picked === choice;
                return (
                  <BouncyPressable
                    key={choice}
                    onPress={() => {
                      if (busy || locked) return;
                      setPicked(choice);
                      playSfx('tap');
                    }}
                    disabled={busy}
                    scaleDown={0.98}
                    sound={false}
                  >
                    <View style={[styles.choice, isPicked && styles.choicePicked]}>
                      <Text style={[styles.choiceText, rtl.text]}>{choice}</Text>
                    </View>
                  </BouncyPressable>
                );
              })}
              <View style={{ marginTop: spacing.md }}>
                <Button
                  title={t('checkAnswer')}
                  onPress={() => {
                    if (!picked) {
                      playSfx('error');
                      return;
                    }
                    void handleGuess(picked);
                  }}
                  loading={busy}
                  disabled={busy}
                />
              </View>
            </>
          ) : null}
          {riddle.answer ? (
            <>
              <Text style={[styles.label, rtl.text]}>{t('dailyRiddleAnswer')}</Text>
              <View style={[styles.choice, styles.choiceOk]}>
                <Text style={[styles.choiceText, rtl.text]}>{riddle.answer}</Text>
              </View>
            </>
          ) : null}
          {riddle.why ? (
            <>
              <Text style={[styles.label, rtl.text]}>{t('dailyRiddleWhy')}</Text>
              <Text style={[styles.why, rtl.text]}>{riddle.why}</Text>
            </>
          ) : null}
        </View>
      ) : null}
    </PuzzleShell>
  );
}

export function ParentDailyRiddleList({ items }: { items: ParentDailyRiddleKid[] }) {
  const styles = useRiddleStyles();
  const look = usePuzzleLook();
  const [open, setOpen] = useState(false);
  const pending = items.filter((item) => item.status === 'open');

  if (!pending.length) return null;

  return (
    <PuzzleShell style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
      <BouncyPressable onPress={() => setOpen((v) => !v)} scaleDown={0.98}>
        <View style={[styles.header, rtl.row]}>
          <PuzzlePiece
            size={62}
            light={look.pieceLight}
            mid={look.pieceMid}
            dark={look.pieceDark}
          />
          <View style={styles.textCol}>
            <Text style={[styles.kicker, rtl.text]}>{t('dailyRiddleTitle')}</Text>
            <Text style={[styles.tapHint, rtl.text]}>
              {open ? t('dailyRiddleTapToClose') : t('dailyRiddleTapToOpenParent')}
            </Text>
          </View>
        </View>
      </BouncyPressable>
      {open
        ? pending.map((item) => (
            <View key={item.kidId} style={styles.kidBlock}>
              <View style={[styles.kidHead, rtl.row]}>
                <KidAvatar avatar={item.kid?.avatar ?? '🎮'} size={40} />
                <View style={styles.textCol}>
                  <Text style={[styles.kidName, rtl.text]}>
                    {item.kid?.displayName ?? t('dailyRiddle')}
                  </Text>
                  <Text style={[styles.kidMeta, rtl.text]}>{t('dailyRiddleParentOpen')}</Text>
                </View>
              </View>
              <RiddlePrompt prompt={item.prompt} extra={item.extra} visual={item.visual} />
            </View>
          ))
        : null}
    </PuzzleShell>
  );
}
