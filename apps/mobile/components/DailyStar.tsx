import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { DailyStarClaimResult, DailyStarStatus } from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { GOLD, INK } from '../constants/themes';
import { toTextShadow } from '../lib/shadow';
import { useTheme } from '../lib/theme-context';
import { playSfx, playStarTapSfx } from '../lib/sfx';
import { t } from '../lib/i18n';
import { Celebration } from './Celebration';
import { useModalEnter } from './animations/modalEnter';
import { Star3D, type Star3DHandle } from './Star3D';
import { api } from '../lib/api';
import {
  dismissKidGift,
  isKidGiftDismissed,
  subscribeKidGiftDismiss,
} from '../lib/kid-gift-dismiss';

interface DailyStarProps {
  kidId: string;
  onClaimed?: (result: DailyStarClaimResult) => void;
  onOpenChange?: (open: boolean) => void;
}

const STAGE = 250;

const PIP = 'M12 2.6l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 16.9l-5.6 2.9 1.1-6.2L2.9 9.2l6.3-.9Z';

/** Progress pip: an empty star outline that fills gold with each tap. */
function StarPip({ filled }: { filled: boolean }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Path d={PIP} fill={filled ? GOLD : 'rgba(255,255,255,0.18)'} stroke={filled ? INK : 'rgba(255,255,255,0.8)'} strokeWidth={1.8} strokeLinejoin="round" />
      {filled ? <Path d="M8.6 9.6q1.2-2.2 3-2.6" stroke="#FFF7DA" strokeWidth={1.4} strokeLinecap="round" fill="none" /> : null}
    </Svg>
  );
}

export function DailyStar({ kidId, onClaimed, onOpenChange }: DailyStarProps) {
  const { borderRadius, cardBorder, heroGradient, id: themeId } = useTheme();
  const [status, setStatus] = useState<DailyStarStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const [taps, setTaps] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateMsg, setCelebrateMsg] = useState('');
  const claimingRef = useRef(false);
  const claimStartedRef = useRef(false);
  const onClaimedRef = useRef(onClaimed);
  onClaimedRef.current = onClaimed;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const starRef = useRef<Star3DHandle>(null);

  const flash = useSharedValue(0);
  const { overlayStyle, cardStyle: enterStyle } = useModalEnter(visible);

  useEffect(() => {
    onOpenChangeRef.current?.(visible);
  }, [visible]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.72)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        },
        modalRoot: {
          flex: 1,
        },
        card: {
          width: '100%',
          maxWidth: 360,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          ...cardBorder(3),
        },
        inner: {
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
        },
        title: {
          color: '#fff',
          fontSize: 22,
          fontFamily: 'Fredoka_700Bold',
          textAlign: 'center',
          ...toTextShadow('rgba(0,0,0,0.4)', { width: 1, height: 1 }, 3),
        },
        hint: {
          color: 'rgba(255,255,255,0.9)',
          fontSize: 14,
          marginTop: spacing.sm,
          textAlign: 'center',
        },
        stage: {
          marginTop: spacing.md,
          width: STAGE,
          height: STAGE,
          alignItems: 'center',
          justifyContent: 'center',
        },
        flash: {
          ...StyleSheet.absoluteFill,
          backgroundColor: '#fff',
        },
        dots: {
          flexDirection: 'row',
          gap: 8,
          marginTop: spacing.xs,
        },
        reward: {
          color: '#FFD700',
          fontSize: 16,
          fontFamily: 'Fredoka_700Bold',
          marginTop: spacing.md,
          textAlign: 'center',
        },
        closeBtn: {
          position: 'absolute',
          top: spacing.sm,
          left: spacing.sm,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(0,0,0,0.25)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        closeBtnText: {
          color: '#fff',
          fontSize: 18,
          fontFamily: 'Fredoka_700Bold',
          lineHeight: 20,
        },
        closeLink: {
          marginTop: spacing.md,
          color: 'rgba(255,255,255,0.7)',
          fontSize: 13,
          fontFamily: 'Fredoka_600SemiBold',
          textAlign: 'center',
        },
      }),
    [themeId, borderRadius, cardBorder]
  );

  const resetInteraction = useCallback(() => {
    setTaps(0);
    claimingRef.current = false;
    claimStartedRef.current = false;
    flash.value = 0;
    setCelebrate(false);
  }, [flash]);

  const load = useCallback(async () => {
    try {
      const res = await api.getDailyStar(kidId);
      setStatus(res.status);
      resetInteraction();
      setVisible(!!res.status.available && !isKidGiftDismissed('star'));
    } catch {
      setStatus(null);
      setVisible(false);
    }
  }, [kidId, resetInteraction]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => subscribeKidGiftDismiss(load), [load]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value,
  }));

  const finishClaim = useCallback(async () => {
    if (claimStartedRef.current) return;
    claimStartedRef.current = true;
    try {
      const result = await api.claimDailyStar(kidId);
      const parts = [`+${result.dailyBonus} ${t('points')}`];
      if (result.streakBonus) parts.push(`${t('streakBonus')}: +${result.streakBonus}`);
      setCelebrateMsg(parts.join(' · '));
      playSfx('coin', { volume: 0.8 });
      // let the sparkle-and-coin burst play before the celebration covers it
      setTimeout(() => {
        setCelebrate(true);
        onClaimedRef.current?.(result);
      }, 1000);
    } catch (err: unknown) {
      playSfx('error');
      claimingRef.current = false;
      claimStartedRef.current = false;
      setTaps(0);
      flash.value = 0;
      const message = err instanceof Error ? err.message : t('dailyStarError');
      alert(message);
    }
  }, [kidId, flash]);

  const handleCelebrateDone = () => {
    setCelebrate(false);
    setVisible(false);
    setStatus((prev) =>
      prev ? { ...prev, available: false, dailyBonus: 0, streakBonus: 0, totalPoints: 0 } : prev
    );
  };

  const handleDismiss = () => {
    if (claimingRef.current || celebrate) return;
    dismissKidGift('star');
    setVisible(false);
  };

  const handleTap = () => {
    if (!status?.available || claimingRef.current || celebrate) return;
    if (taps >= status.tapsRequired) return;

    const next = taps + 1;
    const needed = status.tapsRequired;

    playStarTapSfx(next);
    setTaps(next);
    starRef.current?.punch(next, next / needed);

    flash.value = withSequence(
      withTiming(next >= needed ? 0.35 : 0.18, { duration: 40 }),
      withTiming(0, { duration: next >= needed ? 150 : 120 })
    );

    if (next >= needed) {
      claimingRef.current = true;
      starRef.current?.burst();
      void finishClaim();
    }
  };

  if (!status?.available && !visible) return null;

  const remaining = status ? Math.max(status.tapsRequired - taps, 0) : 0;
  const rewardHint = t('dailyStarMystery');

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      {visible ? (
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.overlay, overlayStyle]}>
            <Animated.View style={[styles.card, enterStyle]}>
              <LinearGradient colors={[...heroGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.inner}>
                <Pressable
                  style={styles.closeBtn}
                  onPress={handleDismiss}
                  disabled={claimingRef.current || celebrate}
                  accessibilityRole="button"
                  accessibilityLabel={t('close')}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </Pressable>
                <Animated.View style={[styles.flash, flashStyle, { pointerEvents: 'none' }]} />
                <Animated.Text entering={FadeIn.delay(80)} style={styles.title}>
                  {t('dailyStar')}
                </Animated.Text>
                <Text style={styles.hint}>{remaining > 0 ? t('dailyStarHint').replace('{n}', String(remaining)) : t('dailyStarOpened')}</Text>

                <Pressable
                  onPress={handleTap}
                  disabled={claimingRef.current || taps >= (status?.tapsRequired ?? 4) || celebrate}
                  style={styles.stage}
                  accessibilityRole="button"
                  accessibilityLabel={t('dailyStar')}
                >
                  <Star3D ref={starRef} size={STAGE} />
                </Pressable>

                <View style={styles.dots}>
                  {Array.from({ length: status?.tapsRequired ?? 4 }).map((_, i) => (
                    <StarPip key={i} filled={i < taps} />
                  ))}
                </View>

                <Text style={styles.reward}>{rewardHint}</Text>

                <Pressable onPress={handleDismiss} disabled={claimingRef.current || celebrate}>
                  <Text style={styles.closeLink}>{t('close')}</Text>
                </Pressable>
              </LinearGradient>
            </Animated.View>
          </Animated.View>

          <Celebration
            visible={celebrate}
            sfx={false}
            message={celebrateMsg || t('dailyStarOpened')}
            onDone={handleCelebrateDone}
          />
        </View>
      ) : null}
    </Modal>
  );
}
