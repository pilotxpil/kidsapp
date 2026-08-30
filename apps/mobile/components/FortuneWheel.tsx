import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { G, Path, Text as SvgText, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import type {
  FortuneWheelSegment,
  FortuneWheelSpinResult,
  FortuneWheelStatus,
} from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { playSfx } from '../lib/sfx';
import { t } from '../lib/i18n';
import { Celebration } from './Celebration';
import { Button } from './Button';
import { api } from '../lib/api';

interface FortuneWheelProps {
  kidId: string;
  /** When true, don't auto-open (e.g. daily star is showing). */
  blocked?: boolean;
  onWon?: (result: FortuneWheelSpinResult) => void;
}

const SIZE = 280;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 126;

function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function slicePath(index: number, total: number) {
  const slice = (Math.PI * 2) / total;
  const start = -Math.PI / 2 + index * slice;
  const end = start + slice;
  const p1 = polar(CX, CY, R, start);
  const p2 = polar(CX, CY, R, end);
  return `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${R} ${R} 0 0 1 ${p2.x} ${p2.y} Z`;
}

function labelPos(index: number, total: number) {
  const slice = (Math.PI * 2) / total;
  const mid = -Math.PI / 2 + (index + 0.5) * slice;
  return polar(CX, CY, R * 0.62, mid);
}

export function FortuneWheel({ kidId, blocked = false, onWon }: FortuneWheelProps) {
  const insets = useSafeAreaInsets();
  const { colors, borderRadius, cardBorder, heroGradient, id: themeId } = useTheme();
  const [status, setStatus] = useState<FortuneWheelStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateMsg, setCelebrateMsg] = useState('');
  const pendingResult = useRef<FortuneWheelSpinResult | null>(null);
  const onWonRef = useRef(onWon);
  onWonRef.current = onWon;

  const rotation = useSharedValue(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalRoot: { flex: 1 },
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.72)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        },
        card: {
          width: '100%',
          maxWidth: 380,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          ...cardBorder(3),
        },
        inner: {
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
        },
        closeBtn: {
          position: 'absolute',
          top: spacing.md,
          left: spacing.md,
          zIndex: 2,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(0,0,0,0.35)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        closeText: { color: '#fff', fontSize: 18, fontWeight: '700' },
        title: {
          color: '#fff',
          fontSize: 22,
          fontWeight: '800',
          textAlign: 'center',
        },
        hint: {
          color: 'rgba(255,255,255,0.9)',
          fontSize: 14,
          marginTop: spacing.sm,
          marginBottom: spacing.md,
          textAlign: 'center',
        },
        wheelWrap: {
          width: SIZE,
          height: SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pointer: {
          position: 'absolute',
          top: 2,
          zIndex: 3,
          width: 0,
          height: 0,
          borderLeftWidth: 12,
          borderRightWidth: 12,
          borderTopWidth: 22,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: '#FFD700',
        },
        spinBtn: { marginTop: spacing.lg, minWidth: 160 },
        devBadge: {
          marginTop: spacing.sm,
          color: 'rgba(255,255,255,0.65)',
          fontSize: 11,
          fontWeight: '700',
        },
        reopenFab: {
          position: 'absolute',
          left: spacing.lg,
          zIndex: 50,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: borderRadius.full,
          backgroundColor: colors.bgCard,
          ...cardBorder(2),
        },
        reopenIcon: { fontSize: 18 },
        reopenLabel: { color: colors.text, fontSize: 12, fontWeight: '800' },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    try {
      const res = await api.getFortuneWheel(kidId);
      setStatus(res.status);
      if (res.status.available && !blocked) setVisible(true);
      if (!res.status.available) setVisible(false);
    } catch {
      setStatus(null);
      setVisible(false);
    }
  }, [kidId, blocked]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!status) return;
    if (blocked) {
      setVisible(false);
      return;
    }
    if (status.available) setVisible(true);
  }, [blocked, status]);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const finishSpin = useCallback(() => {
    setSpinning(false);
    const result = pendingResult.current;
    if (!result) return;
    playSfx('gem');
    setCelebrateMsg(`+${result.pointsAwarded} ${t('points')}!`);
    setCelebrate(true);
    onWonRef.current?.(result);
  }, []);

  const handleSpin = async () => {
    if (!status?.available || spinning) return;
    setSpinning(true);
    playSfx('coin');
    try {
      const result = await api.spinFortuneWheel(kidId);
      pendingResult.current = result;
      const n = status.segments.length;
      const slice = 360 / n;
      // Land so segment center sits under top pointer
      const target = -(result.segmentIndex + 0.5) * slice;
      const current = rotation.value % 360;
      const extra = 360 * 6;
      const next = rotation.value + extra + (target - current);
      rotation.value = withTiming(
        next,
        { duration: 4200, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(finishSpin)();
        }
      );
    } catch (err: unknown) {
      setSpinning(false);
      playSfx('error');
      alert(err instanceof Error ? err.message : t('wheelError'));
    }
  };

  const handleCelebrateDone = () => {
    setCelebrate(false);
    if (status?.unlimited) {
      setStatus((prev) => (prev ? { ...prev, available: true } : prev));
      return;
    }
    setVisible(false);
    setStatus((prev) => (prev ? { ...prev, available: false } : prev));
  };

  if (!status) return null;

  const segments = status.segments;

  return (
    <>
      {status.unlimited && !visible && !blocked ? (
        <Pressable
          onPress={() => {
            setStatus((prev) => (prev ? { ...prev, available: true } : prev));
            setVisible(true);
          }}
          style={[styles.reopenFab, { bottom: Math.max(insets.bottom, 12) + 64 }]}
          accessibilityRole="button"
          accessibilityLabel={t('wheelDevOpen')}
        >
          <Text style={styles.reopenIcon}>🎡</Text>
          <Text style={styles.reopenLabel}>{t('wheelDevOpen')}</Text>
        </Pressable>
      ) : null}

      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalRoot}>
          <View style={styles.overlay}>
            <Animated.View entering={ZoomIn.duration(260).springify().damping(14)} style={styles.card}>
              <LinearGradient colors={[...heroGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.inner}>
                {status.unlimited ? (
                  <Pressable onPress={() => setVisible(false)} style={styles.closeBtn} hitSlop={8}>
                    <Text style={styles.closeText}>✕</Text>
                  </Pressable>
                ) : null}

                <Text style={styles.title}>{t('fortuneWheel')}</Text>
                <Text style={styles.hint}>{t('fortuneWheelHint')}</Text>

                <View style={styles.wheelWrap}>
                  <View style={styles.pointer} />
                  <Animated.View style={wheelStyle}>
                    <Svg width={SIZE} height={SIZE}>
                      <Circle cx={CX} cy={CY} r={R + 4} fill="rgba(255,255,255,0.25)" />
                      {segments.map((seg: FortuneWheelSegment, i) => {
                        const lp = labelPos(i, segments.length);
                        return (
                          <G key={seg.id}>
                            <Path d={slicePath(i, segments.length)} fill={seg.color} />
                            <SvgText
                              x={lp.x}
                              y={lp.y}
                              fill="#fff"
                              fontSize="13"
                              fontWeight="800"
                              textAnchor="middle"
                              alignmentBaseline="middle"
                            >
                              {seg.label}
                            </SvgText>
                          </G>
                        );
                      })}
                      <Circle cx={CX} cy={CY} r={22} fill="#1a1a2e" />
                      <Circle cx={CX} cy={CY} r={16} fill="#FFD700" />
                    </Svg>
                  </Animated.View>
                </View>

                <Button
                  title={spinning ? t('wheelSpinning') : t('wheelSpin')}
                  onPress={handleSpin}
                  loading={spinning}
                  disabled={spinning || celebrate}
                  style={styles.spinBtn}
                  sound={false}
                />
                {status.unlimited ? <Text style={styles.devBadge}>{t('dailyStarDevMode')}</Text> : null}
              </LinearGradient>
            </Animated.View>
          </View>

          <Celebration
            visible={celebrate}
            sfx={false}
            message={celebrateMsg || t('wheelWin')}
            onDone={handleCelebrateDone}
          />
        </View>
      </Modal>
    </>
  );
}
