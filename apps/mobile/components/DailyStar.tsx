import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
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

const STAGE = 220;

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
          fontWeight: '800',
          textAlign: 'center',
          textShadowColor: 'rgba(0,0,0,0.4)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 3,
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
          gap: 10,
          marginTop: spacing.sm,
        },
        dot: {
          width: 14,
          height: 14,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.75)',
          backgroundColor: 'transparent',
        },
        dotFilled: {
          backgroundColor: '#FFD700',
          borderColor: '#FFF3A0',
        },
        reward: {
          color: '#FFD700',
          fontSize: 16,
          fontWeight: '800',
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
          fontWeight: '700',
          lineHeight: 20,
        },
        closeLink: {
          marginTop: spacing.md,
          color: 'rgba(255,255,255,0.7)',
          fontSize: 13,
          fontWeight: '600',
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
      const parts = [`+${result.totalPoints} ${t('points')}`];
      if (result.streakBonus) parts.push(`${t('streakBonus')}: +${result.streakBonus}`);
      setCelebrateMsg(parts.join(' · '));
      setCelebrate(true);
      onClaimedRef.current?.(result);
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
    starRef.current?.punch(next);

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
  const rewardHint = status
    ? status.streakBonus > 0
      ? `+${status.totalPoints} (${t('dailyBonus')} + ${t('streakBonus')})`
      : `+${status.totalPoints} ${t('points')}`
    : '';

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
                <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" />
                <Animated.Text entering={FadeIn.delay(80)} style={styles.title}>
                  {t('dailyStar')}
                </Animated.Text>
                <Text style={styles.hint}>{t('dailyStarHint').replace('{n}', String(remaining))}</Text>

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
                    <View key={i} style={[styles.dot, i < taps && styles.dotFilled]} />
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
