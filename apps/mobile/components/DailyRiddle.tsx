import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { RIDDLE_TRACK_LABELS } from '@kidsapp/shared';
import type {
  BadgeUnlock,
  KidDailyRiddle,
  ParentDailyRiddleKid,
  RiddleTrack,
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

/** The language riddle borrows a contrasting world's puzzle colors so the two cards read apart. */
const LANGUAGE_LOOK: Record<UiThemeId, UiThemeId> = {
  ember: 'minecraft',
  minecraft: 'brawl',
  brawl: 'sparkle',
  roblox: 'brawl',
  sparkle: 'minecraft',
};

const SlotContext = React.createContext<RiddleTrack>('math');

function usePuzzleLook(slotOverride?: RiddleTrack) {
  const { id } = useTheme();
  const ctxSlot = React.useContext(SlotContext);
  const slot = slotOverride ?? ctxSlot;
  return useMemo(() => puzzleLookFor(slot === 'language' ? LANGUAGE_LOOK[id] ?? id : id), [id, slot]);
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

/** Lines without Hebrew letters (number sequences, emoji sums) read left to right. */
const HEBREW = /[\u0590-\u05FF]/;

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
      {extra ? (
        <Text style={[styles.extra, rtl.text, !HEBREW.test(extra) && styles.extraLtr]}>{extra}</Text>
      ) : null}
      {visual ? <RiddleVisualView visual={visual} /> : null}
    </View>
  );
}

function useRiddleStyles(slotOverride?: RiddleTrack) {
  const type = useType();
  const { id: themeId } = useTheme();
  const look = usePuzzleLook(slotOverride);
  return useMemo(
    () =>
      StyleSheet.create({
        header: { alignItems: 'center', gap: spacing.sm, width: '100%' },
        icon: { width: 62, height: 62 },
        textCol: { flex: 1, minWidth: 0 },
        kicker: {
          color: look.title,
          fontSize: 18,
          fontFamily: 'Fredoka_700Bold',
          letterSpacing: 0.3,
          ...type.display,
        },
        tapHint: {
          color: look.body,
          fontSize: 13,
          fontFamily: 'Fredoka_700Bold',
          marginTop: 2,
          ...type.ui,
        },
        prompt: {
          color: look.title,
          fontSize: 18,
          fontFamily: 'Fredoka_700Bold',
          marginTop: spacing.md,
          marginBottom: spacing.sm,
          ...type.heading,
        },
        extra: {
          color: look.body,
          fontSize: 16,
          fontFamily: 'Fredoka_700Bold',
          marginBottom: spacing.sm,
          ...type.ui,
        },
        extraLtr: {
          writingDirection: 'ltr',
          textAlign: 'center',
          fontSize: 20,
          letterSpacing: 0.5,
        },
        label: {
          color: look.muted,
          fontSize: 12,
          fontFamily: 'Fredoka_700Bold',
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
          fontFamily: 'Fredoka_700Bold',
          lineHeight: 22,
          ...type.ui,
        },
        wrong: {
          color: look.wrong,
          fontSize: 14,
          fontFamily: 'Fredoka_700Bold',
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
          fontFamily: 'Fredoka_700Bold',
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
        rebus: { color: look.title, fontFamily: 'Fredoka_700Bold', textAlign: 'center' },
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
        forestHidden: { color: look.muted, fontSize: 13, fontFamily: 'Fredoka_700Bold' },
        appealActions: {
          marginTop: spacing.md,
          gap: spacing.sm,
          alignItems: 'center',
        },
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
          fontFamily: 'Fredoka_700Bold',
          ...type.ui,
        },
        kidMeta: {
          color: look.body,
          fontSize: 13,
          marginTop: 2,
          ...type.ui,
        },
        kidMetaOk: {
          color: look.ok,
          fontSize: 13,
          fontFamily: 'Fredoka_700Bold',
          marginTop: 2,
          ...type.ui,
        },
        kidMetaWrong: {
          color: look.wrong,
          fontSize: 13,
          fontFamily: 'Fredoka_700Bold',
          marginTop: 2,
          ...type.ui,
        },
      }),
    [themeId, type.ui, type.body, type.display, type.heading, look]
  );
}

export function DailyRiddle({
  kidId,
  slot = 'math',
  onWon,
}: {
  kidId: string;
  /** Which of today's two riddles (math / language) this card shows. */
  slot?: RiddleTrack;
  onWon?: (result: { points: number; level: number; xp: number; newBadges?: BadgeUnlock[] }) => void;
}) {
  const styles = useRiddleStyles(slot);
  const look = usePuzzleLook(slot);
  const [riddle, setRiddle] = useState<KidDailyRiddle | null>(null);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const statusRef = React.useRef<string | null>(null);
  const onWonRef = React.useRef(onWon);
  onWonRef.current = onWon;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const tick = async () => {
        try {
          const res = await api.getDailyRiddle(kidId, slot);
          if (!cancelled) setRiddle(res.dailyRiddle);
        } catch {
          /* ignore while logged out / navigating */
        }
      };
      tick();
      // Poll only while a parent still has to answer an appeal.
      const id = setInterval(() => {
        if (statusRef.current === 'appealed') void tick();
      }, 8000);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }, [kidId, slot])
  );

  useEffect(() => {
    setOpen(false);
    setPicked(null);
    statusRef.current = null;
  }, [kidId, slot, riddle?.date, riddle?.id]);

  useEffect(() => {
    const prev = statusRef.current;
    statusRef.current = riddle?.status ?? null;
    if (prev !== 'appealed' || riddle?.status !== 'won') return;
    void api.getKidProfile(kidId).then((res) => {
      playSfx('cheer');
      onWonRef.current?.({
        points: res.profile.points,
        level: res.profile.level,
        xp: res.profile.xp,
      });
    }).catch(() => {});
  }, [kidId, riddle?.status]);

  const handleAppeal = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.appealDailyRiddle(kidId, slot);
      setRiddle(res.dailyRiddle);
      setOpen(true);
      playSfx('tap');
    } catch {
      playSfx('error');
    } finally {
      setBusy(false);
    }
  };

  if (!riddle) return null;
  const canAppeal = riddle.status === 'missed' && !!riddle.guess && riddle.appeal !== 'rejected';
  const appealPending = riddle.status === 'appealed';
  const locked = riddle.status !== 'open';
  if (locked && !open && !canAppeal && !appealPending) return null;
  const revealed = open;

  const handleGuess = async (guess: string) => {
    if (busy || locked) return;
    setPicked(guess);
    setBusy(true);
    try {
      const res = await api.guessDailyRiddle(kidId, guess, slot);
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
    <SlotContext.Provider value={slot}>
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
            <Text style={[styles.kicker, rtl.text]}>{RIDDLE_TRACK_LABELS[slot]}</Text>
            {!revealed ? (
              <Text style={[styles.tapHint, rtl.text]}>
                {t('dailyRiddleTapToOpen').replace('{n}', String(riddle.points))}
              </Text>
            ) : null}
            {riddle.status === 'won' ? (
              <Text style={[styles.tapHint, rtl.text]}>
                {t('dailyRiddleWon').replace('{n}', String(riddle.points))}
              </Text>
            ) : appealPending ? (
              <Text style={[styles.tapHint, rtl.text]}>{t('dailyRiddleAppealSent')}</Text>
            ) : riddle.status === 'missed' && riddle.appeal === 'rejected' ? (
              <Text style={[styles.tapHint, rtl.text]}>{t('dailyRiddleAppealRejected')}</Text>
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
          {(riddle.status === 'missed' || riddle.status === 'appealed') &&
          riddle.guess &&
          riddle.guess !== riddle.answer ? (
            <>
              <Text style={[styles.label, rtl.text]}>{t('dailyRiddleYourAnswer')}</Text>
              <View style={[styles.choice, styles.choiceWrong]}>
                <Text style={[styles.choiceText, rtl.text]}>{riddle.guess}</Text>
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
          {canAppeal ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Text style={[styles.why, rtl.text]}>{t('dailyRiddleAppealHint')}</Text>
              <Button
                title={t('dailyRiddleAppealSend')}
                onPress={() => void handleAppeal()}
                loading={busy}
                disabled={busy}
                variant="secondary"
              />
            </View>
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
    </SlotContext.Provider>
  );
}

export function ParentDailyRiddleList({
  items,
  onReviewAppeal,
}: {
  items: ParentDailyRiddleKid[];
  onReviewAppeal?: (kidId: string, action: 'approve' | 'reject', slot?: RiddleTrack) => void | Promise<void>;
}) {
  const styles = useRiddleStyles();
  const look = usePuzzleLook();
  const [open, setOpen] = useState(false);
  const [busyKid, setBusyKid] = useState<string | null>(null);
  const pending = items.filter((item) => item.status === 'open');
  const appeals = items.filter((item) => item.appeal === 'pending');
  const settled = items.filter((item) => item.status === 'won' || item.status === 'missed');

  if (!items.length) return null;

  const keyOf = (item: ParentDailyRiddleKid) => `${item.kidId}-${item.slot ?? 'math'}`;
  const slotLabel = (item: ParentDailyRiddleKid) => RIDDLE_TRACK_LABELS[item.slot ?? 'math'];
  const review = (item: ParentDailyRiddleKid, action: 'approve' | 'reject') => {
    if (!onReviewAppeal || busyKid) return;
    setBusyKid(keyOf(item));
    Promise.resolve(onReviewAppeal(item.kidId, action, item.slot)).finally(() => setBusyKid(null));
  };

  const hint =
    !open && appeals.length
      ? t('dailyRiddleParentAppeal')
      : open
        ? t('dailyRiddleTapToClose')
        : t('dailyRiddleTapToOpenParent');

  const header = (
    <View style={[styles.header, rtl.row]}>
      <PuzzlePiece
        size={62}
        light={look.pieceLight}
        mid={look.pieceMid}
        dark={look.pieceDark}
      />
      <View style={styles.textCol}>
        <Text style={[styles.kicker, rtl.text]}>{t('dailyRiddlesTitle')}</Text>
        <Text style={[styles.tapHint, rtl.text]}>{hint}</Text>
      </View>
    </View>
  );

  return (
    <PuzzleShell style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
      <BouncyPressable onPress={() => setOpen((v) => !v)} scaleDown={0.98}>
        {header}
      </BouncyPressable>
      {open ? appeals.map((item) => (
        <View key={`appeal-${keyOf(item)}`} style={styles.kidBlock}>
          <View style={[styles.kidHead, rtl.row]}>
            <KidAvatar avatar={item.kid?.avatar ?? '🎮'} size={40} />
            <View style={styles.textCol}>
              <Text style={[styles.kidName, rtl.text]}>{item.kid?.displayName ?? t('dailyRiddle')}</Text>
              <Text style={[styles.kidMeta, rtl.text]}>{`${slotLabel(item)} · ${t('dailyRiddleParentAppealHint')}`}</Text>
            </View>
          </View>
          <RiddlePrompt prompt={item.prompt} extra={item.extra} visual={item.visual} />
          {item.guess ? (
            <>
              <Text style={[styles.label, rtl.text]}>{t('dailyRiddleKidAnswer')}</Text>
              <Text style={[styles.why, rtl.text]}>{item.guess}</Text>
            </>
          ) : null}
          {item.answer ? (
            <>
              <Text style={[styles.label, rtl.text]}>{t('dailyRiddleOfficialAnswer')}</Text>
              <Text style={[styles.kidMeta, rtl.text]}>{item.answer}</Text>
            </>
          ) : null}
          <View style={[styles.appealActions, rtl.row]}>
            <Button
              title={t('dailyRiddleAppealYes')}
              onPress={() => review(item, 'approve')}
              variant="success"
              loading={busyKid === keyOf(item)}
              disabled={!!busyKid}
            />
            <Button
              title={t('dailyRiddleAppealNo')}
              onPress={() => review(item, 'reject')}
              variant="outline"
              disabled={!!busyKid}
            />
          </View>
        </View>
      )) : null}
      {open ? settled.map((item) => {
        const correct = item.status === 'won';
        return (
          <View key={`settled-${keyOf(item)}`} style={styles.kidBlock}>
            <View style={[styles.kidHead, rtl.row]}>
              <KidAvatar avatar={item.kid?.avatar ?? '🎮'} size={40} />
              <View style={styles.textCol}>
                <Text style={[styles.kidName, rtl.text]}>
                  {item.kid?.displayName ?? t('dailyRiddle')}
                </Text>
                <Text style={[correct ? styles.kidMetaOk : styles.kidMetaWrong, rtl.text]}>
                  {`${slotLabel(item)} · ${correct ? t('dailyRiddleParentWon') : t('dailyRiddleParentMissed')}`}
                </Text>
              </View>
            </View>
            <RiddlePrompt prompt={item.prompt} extra={item.extra} visual={item.visual} />
            {item.guess ? (
              <>
                <Text style={[styles.label, rtl.text]}>{t('dailyRiddleKidAnswer')}</Text>
                <View style={[styles.choice, correct ? styles.choiceOk : styles.choiceWrong]}>
                  <Text style={[styles.choiceText, rtl.text]}>{item.guess}</Text>
                </View>
              </>
            ) : null}
            {item.answer ? (
              <>
                <Text style={[styles.label, rtl.text]}>{t('dailyRiddleOfficialAnswer')}</Text>
                <View style={[styles.choice, styles.choiceOk]}>
                  <Text style={[styles.choiceText, rtl.text]}>{item.answer}</Text>
                </View>
              </>
            ) : null}
            {item.why ? (
              <>
                <Text style={[styles.label, rtl.text]}>{t('dailyRiddleWhy')}</Text>
                <Text style={[styles.why, rtl.text]}>{item.why}</Text>
              </>
            ) : null}
          </View>
        );
      }) : null}
      {open
        ? pending.map((item) => (
            <View key={`open-${keyOf(item)}`} style={styles.kidBlock}>
              <View style={[styles.kidHead, rtl.row]}>
                <KidAvatar avatar={item.kid?.avatar ?? '🎮'} size={40} />
                <View style={styles.textCol}>
                  <Text style={[styles.kidName, rtl.text]}>
                    {item.kid?.displayName ?? t('dailyRiddle')}
                  </Text>
                  <Text style={[styles.kidMeta, rtl.text]}>{`${slotLabel(item)} · ${t('dailyRiddleParentOpen')}`}</Text>
                </View>
              </View>
              <RiddlePrompt prompt={item.prompt} extra={item.extra} visual={item.visual} />
            </View>
          ))
        : null}
    </PuzzleShell>
  );
}
