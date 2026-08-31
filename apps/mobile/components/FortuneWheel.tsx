import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { G, Path, Text as SvgText, Circle } from 'react-native-svg';
import Animated, {
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
import { useModalEnter } from './animations/modalEnter';
import { BouncyPressable } from './animations/BouncyPressable';
import { api } from '../lib/api';
import {
  dismissKidGift,
  isKidGiftDismissed,
  subscribeKidGiftDismiss,
} from '../lib/kid-gift-dismiss';

interface FortuneWheelProps {
  kidId: string;
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

export function FortuneWheel({ kidId, onWon }: FortuneWheelProps) {
  const { borderRadius, cardBorder, heroGradient, id: themeId } = useTheme();
  const [status, setStatus] = useState<FortuneWheelStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateMsg, setCelebrateMsg] = useState('');
  const pendingResult = useRef<FortuneWheelSpinResult | null>(null);
  const onWonRef = useRef(onWon);
  onWonRef.current = onWon;

  const rotation = useSharedValue(0);
  const { overlayStyle, cardStyle: enterStyle } = useModalEnter(visible);

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
          alignItems: 'stretch',
          width: '100%',
        },
        title: {
          color: '#fff',
          fontSize: 22,
          fontWeight: '800',
          textAlign: 'center',
          alignSelf: 'center',
        },
        hint: {
          color: 'rgba(255,255,255,0.9)',
          fontSize: 14,
          marginTop: spacing.sm,
          marginBottom: spacing.md,
          textAlign: 'center',
          alignSelf: 'center',
        },
        wheelWrap: {
          width: SIZE,
          height: SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
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
        spinBtn: {
          marginTop: spacing.lg,
          width: '100%',
          minHeight: 52,
          borderRadius: borderRadius.full,
          backgroundColor: '#FFD700',
          borderWidth: 2,
          borderColor: '#FFF8B0',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
        },
        spinBtnDisabled: { opacity: 0.55 },
        spinBtnText: {
          color: '#1a1a2e',
          fontSize: 18,
          fontWeight: '800',
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
          zIndex: 2,
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
          alignSelf: 'center',
        },
      }),
    [themeId, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    try {
      const res = await api.getFortuneWheel(kidId);
      setStatus(res.status);
      setVisible(!!res.status.available && !isKidGiftDismissed('wheel'));
    } catch {
      setStatus(null);
      setVisible(false);
    }
  }, [kidId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => subscribeKidGiftDismiss(load), [load]);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const finishSpin = useCallback(() => {
    setSpinning(false);
    const result = pendingResult.current;
    if (!result) return;
    playSfx('gem');
    const parts = [`+${result.pointsAwarded} ${t('points')}`];
    if (result.streakBonus) parts.push(`${t('streakBonus')}: +${result.streakBonus}`);
    setCelebrateMsg(`${parts.join(' · ')}!`);
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

  const handleDismiss = () => {
    if (spinning || celebrate) return;
    dismissKidGift('wheel');
    setVisible(false);
  };

  const handleCelebrateDone = () => {
    setCelebrate(false);
    setVisible(false);
    setStatus((prev) => (prev ? { ...prev, available: false } : prev));
  };

  if (!status?.available && !visible) return null;

  const segments = status.segments;

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
                  disabled={spinning || celebrate}
                  accessibilityRole="button"
                  accessibilityLabel={t('close')}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </Pressable>
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

                <BouncyPressable
                  onPress={handleSpin}
                  disabled={spinning || celebrate}
                  style={[styles.spinBtn, (spinning || celebrate) && styles.spinBtnDisabled]}
                >
                  {spinning ? (
                    <ActivityIndicator color="#1a1a2e" />
                  ) : (
                    <Text style={styles.spinBtnText}>{t('wheelSpin')}</Text>
                  )}
                </BouncyPressable>

                <Pressable onPress={handleDismiss} disabled={spinning || celebrate}>
                  <Text style={styles.closeLink}>{t('close')}</Text>
                </Pressable>
              </LinearGradient>
            </Animated.View>
          </Animated.View>

          <Celebration
            visible={celebrate}
            sfx={false}
            message={celebrateMsg || t('wheelWin')}
            onDone={handleCelebrateDone}
          />
        </View>
        ) : null}
      </Modal>
  );
}
