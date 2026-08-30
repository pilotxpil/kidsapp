import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import type { TreasureChestOpenResult, TreasureChestStatus } from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { playSfx } from '../lib/sfx';
import { t } from '../lib/i18n';
import { Celebration } from './Celebration';
import { Button } from './Button';
import { api } from '../lib/api';
import { useFocusLoad } from '../hooks/useFocusLoad';

interface TreasureChestProps {
  kidId: string;
  refreshKey?: number;
  onOpened?: (result: TreasureChestOpenResult) => void;
}

export function TreasureChest({ kidId, refreshKey = 0, onOpened }: TreasureChestProps) {
  const { colors, borderRadius, cardBorder, heroGradient, id: themeId } = useTheme();
  const [status, setStatus] = useState<TreasureChestStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateMsg, setCelebrateMsg] = useState('');
  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;

  const pulse = useSharedValue(1);
  const shake = useSharedValue(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          width: '100%',
          marginBottom: spacing.lg,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          ...cardBorder(2),
        },
        inner: {
          padding: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        iconWrap: {
          width: 64,
          height: 64,
          alignItems: 'center',
          justifyContent: 'center',
        },
        icon: { fontSize: 44 },
        body: { flex: 1 },
        title: {
          color: '#fff',
          fontSize: 16,
          fontWeight: '800',
          textAlign: 'left',
        },
        sub: {
          color: 'rgba(255,255,255,0.85)',
          fontSize: 12,
          marginTop: 4,
          textAlign: 'left',
        },
        barBg: {
          marginTop: spacing.sm,
          height: 10,
          borderRadius: 5,
          backgroundColor: 'rgba(0,0,0,0.25)',
          overflow: 'hidden',
        },
        barFill: {
          height: '100%',
          borderRadius: 5,
          backgroundColor: '#FFD700',
        },
        readyTag: {
          color: '#FFD700',
          fontSize: 12,
          fontWeight: '800',
          marginTop: 6,
        },
        modalRoot: { flex: 1 },
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        },
        modalCard: {
          width: '100%',
          maxWidth: 340,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          ...cardBorder(3),
        },
        modalInner: {
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
        },
        modalTitle: {
          color: '#fff',
          fontSize: 22,
          fontWeight: '800',
          textAlign: 'center',
        },
        modalHint: {
          color: 'rgba(255,255,255,0.9)',
          fontSize: 14,
          marginTop: spacing.sm,
          marginBottom: spacing.lg,
          textAlign: 'center',
        },
        bigChest: { fontSize: 88, marginBottom: spacing.md },
        openBtn: { minWidth: 160 },
        closeLink: {
          marginTop: spacing.md,
          color: 'rgba(255,255,255,0.7)',
          fontSize: 13,
          fontWeight: '600',
        },
        mutedCard: {
          width: '100%',
          marginBottom: spacing.lg,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          backgroundColor: colors.bgCard,
          ...cardBorder(1),
        },
        mutedInner: {
          padding: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        mutedIcon: { fontSize: 36, opacity: 0.7 },
        mutedTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
        mutedSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
        mutedBarBg: {
          marginTop: spacing.sm,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.bg,
          overflow: 'hidden',
        },
        mutedBarFill: {
          height: '100%',
          borderRadius: 4,
          backgroundColor: colors.primary,
        },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    try {
      const res = await api.getTreasureChest(kidId);
      setStatus(res.status);
    } catch {
      setStatus(null);
    }
  }, [kidId]);

  useFocusLoad(load, !!kidId);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!status?.ready) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [status?.ready, pulse]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }, { rotate: `${shake.value}deg` }],
  }));

  const handleOpen = async () => {
    if (!status?.ready || opening) return;
    setOpening(true);
    playSfx('coin');
    shake.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withSpring(0)
    );
    try {
      const result = await api.openTreasureChest(kidId);
      playSfx('gem');
      setCelebrateMsg(`+${result.pointsAwarded} ${t('points')}!`);
      setCelebrate(true);
      onOpenedRef.current?.(result);
      await load();
    } catch (err: unknown) {
      playSfx('error');
      alert(err instanceof Error ? err.message : t('chestError'));
    } finally {
      setOpening(false);
    }
  };

  if (!status) return null;

  const ratio = Math.min(1, status.progress / status.needed);

  if (!status.ready) {
    return (
      <View style={styles.mutedCard}>
        <View style={styles.mutedInner}>
          <Text style={styles.mutedIcon}>📦</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.mutedTitle}>{t('treasureChest')}</Text>
            <Text style={styles.mutedSub}>
              {t('chestProgress')
                .replace('{progress}', String(status.progress))
                .replace('{needed}', String(status.needed))}
            </Text>
            <View style={styles.mutedBarBg}>
              <View style={[styles.mutedBarFill, { width: `${ratio * 100}%` }]} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setModalOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('treasureChest')}
      >
        <View style={styles.card}>
          <LinearGradient colors={[...heroGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.inner}>
            <Animated.View style={[styles.iconWrap, iconStyle]}>
              <Text style={styles.icon}>🎁</Text>
            </Animated.View>
            <View style={styles.body}>
              <Text style={styles.title}>{t('treasureChest')}</Text>
              <Text style={styles.sub}>{t('chestReadyHint')}</Text>
              <Text style={styles.readyTag}>{t('chestTapToOpen')}</Text>
            </View>
          </LinearGradient>
        </View>
      </Pressable>

      <Modal visible={modalOpen} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalRoot}>
          <View style={styles.overlay}>
            <Animated.View entering={ZoomIn.duration(260).springify().damping(14)} style={styles.modalCard}>
              <LinearGradient
                colors={[...heroGradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalInner}
              >
                <Text style={styles.modalTitle}>{t('treasureChest')}</Text>
                <Text style={styles.modalHint}>{t('chestOpenHint')}</Text>
                <Animated.Text style={[styles.bigChest, iconStyle]}>🎁</Animated.Text>
                <Button
                  title={opening ? t('chestOpening') : t('chestOpen')}
                  onPress={handleOpen}
                  loading={opening}
                  disabled={opening || celebrate}
                  style={styles.openBtn}
                  sound={false}
                />
                {status.unlimited ? (
                  <Text style={styles.closeLink}>{t('dailyStarDevMode')}</Text>
                ) : null}
                <Pressable onPress={() => setModalOpen(false)} disabled={opening}>
                  <Text style={styles.closeLink}>{t('dailyStarDevClose')}</Text>
                </Pressable>
              </LinearGradient>
            </Animated.View>
          </View>

          <Celebration
            visible={celebrate}
            sfx={false}
            message={celebrateMsg || t('chestOpened')}
            onDone={() => {
              setCelebrate(false);
              if (!status.unlimited) setModalOpen(false);
            }}
          />
        </View>
      </Modal>
    </>
  );
}
