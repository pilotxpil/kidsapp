import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type {
  FortuneWheelSegment,
  FortuneWheelSpinResult,
  FortuneWheelStatus,
} from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { CORAL, CORAL_DARK, GOLD, GOLD_DARK, INK } from '../constants/themes';
import { useTheme } from '../lib/theme-context';
import { playSfx } from '../lib/sfx';
import { haptic } from '../lib/haptics';
import { t } from '../lib/i18n';
import { Celebration } from './Celebration';
import { useModalEnter } from './animations/modalEnter';
import { Piko, type PikoMood } from './ui/Piko';
import { ToyButton } from './ui/ToyButton';
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

/**
 * Game-show wheel. Everything is drawn in a 300×300 box and scaled to the screen:
 * a fixed gold frame with chasing bulbs, the spinning face (shaded slices, pegs, upright
 * prizes), Piko on the hub and a pointer that flicks as each peg passes it.
 */
const VB = 300;
const C = VB / 2;
const R = 118; // wheel face
const FRAME = 145; // outer edge of the gold frame (+4 shadow stays inside the box)
const BULB_R = 132;
const BULBS = 20;

function polar(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}

/** Slice i spans [i·step, (i+1)·step] degrees clockwise from the top. */
function slicePath(i: number, n: number, r = R) {
  const step = 360 / n;
  const p1 = polar(r, i * step);
  const p2 = polar(r, (i + 1) * step);
  return `M ${C} ${C} L ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y} Z`;
}

/** Four-point twinkle centred on (x, y). */
function sparkle(x: number, y: number, r: number) {
  const q = r * 0.28;
  return `M${x} ${y - r} Q${x + q} ${y - q} ${x + r} ${y} Q${x + q} ${y + q} ${x} ${y + r} Q${x - q} ${y + q} ${x - r} ${y} Q${x - q} ${y - q} ${x} ${y - r} Z`;
}

type BulbMode = 'idle' | 'spin' | 'win';

/** Fixed gold frame with marquee bulbs: slow chase when idle, fast while spinning, all flash on a win. */
const Frame = memo(function Frame({ mode }: { mode: BulbMode }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const ms = mode === 'spin' ? 110 : mode === 'win' ? 180 : 420;
    const id = setInterval(() => setPhase((p) => p + 1), ms);
    return () => clearInterval(id);
  }, [mode]);

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VB} ${VB}`}>
      <Defs>
        <SvgLinearGradient id="frameGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE98F" />
          <Stop offset="0.5" stopColor={GOLD} />
          <Stop offset="1" stopColor={GOLD_DARK} />
        </SvgLinearGradient>
      </Defs>
      {/* hard toy shadow, frame, inner bevel */}
      <Circle cx={C} cy={C + 4} r={FRAME} fill={INK} />
      <Circle cx={C} cy={C} r={FRAME} fill="url(#frameGold)" stroke={INK} strokeWidth={3} />
      <Circle cx={C} cy={C} r={FRAME - 7} fill="none" stroke="#FFF3B8" strokeWidth={2} opacity={0.7} />
      {Array.from({ length: BULBS }, (_, i) => {
        const p = polar(BULB_R, (i * 360) / BULBS);
        const on = mode === 'win' ? phase % 2 === 0 : (i + phase) % 2 === 0;
        return (
          <G key={i}>
            {on ? <Circle cx={p.x} cy={p.y} r={9} fill="#FFF6C8" opacity={0.45} /> : null}
            <Circle cx={p.x} cy={p.y} r={5.2} fill={on ? '#FFFBE6' : '#C98600'} stroke={INK} strokeWidth={1.6} />
          </G>
        );
      })}
    </Svg>
  );
});

/** Flashing overlay on the winning slice. */
function WinFlash({ index, total }: { index: number; total: number }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), 200);
    return () => clearInterval(id);
  }, []);
  return <Path d={slicePath(index, total)} fill="#FFFFFF" opacity={on ? 0.45 : 0.08} />;
}

/** The spinning face: slices with a domed shading, separators, pegs and upright prizes. */
const WheelFace = memo(function WheelFace({ segments, winIndex }: { segments: FortuneWheelSegment[]; winIndex: number | null }) {
  const n = segments.length;
  const step = 360 / n;
  const topPrize = Math.max(...segments.map((s) => s.points));
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VB} ${VB}`}>
      <Defs>
        <RadialGradient id="dome" cx={C} cy={C} r={R} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.32} />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
        </RadialGradient>
        <SvgLinearGradient id="hubGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE98F" />
          <Stop offset="1" stopColor={GOLD_DARK} />
        </SvgLinearGradient>
      </Defs>
      {segments.map((seg, i) => (
        <Path key={seg.id} d={slicePath(i, n)} fill={seg.color} />
      ))}
      <Circle cx={C} cy={C} r={R} fill="url(#dome)" />
      {winIndex != null ? <WinFlash index={winIndex} total={n} /> : null}
      {segments.map((_, i) => {
        const p = polar(R, i * step);
        return <Line key={`l${i}`} x1={C} y1={C} x2={p.x} y2={p.y} stroke="#FFFFFF" strokeWidth={2.5} opacity={0.85} />;
      })}
      {segments.map((seg, i) => {
        // Digits only (the coin says "points"): a "+" would flip to the wrong side in RTL text.
        const jackpot = seg.points === topPrize;
        const fontSize = jackpot ? 30 : 26;
        const y = C - R * 0.68;
        return (
          <G key={`p${seg.id}`} transform={`rotate(${(i + 0.5) * step} ${C} ${C})`}>
            {/* drawn as if the slice were at the top; the group turns it into place */}
            <SvgText x={C} y={y} fontSize={fontSize} fontFamily="Fredoka_700Bold" fontWeight="700" textAnchor="middle" alignmentBaseline="middle" stroke={INK} strokeWidth={5} strokeLinejoin="round" fill={INK}>
              {String(seg.points)}
            </SvgText>
            <SvgText x={C} y={y} fontSize={fontSize} fontFamily="Fredoka_700Bold" fontWeight="700" textAnchor="middle" alignmentBaseline="middle" fill="#FFFFFF">
              {String(seg.points)}
            </SvgText>
            {jackpot ? (
              <>
                <Path d={sparkle(C - 25, y - 9, 6)} fill="#FFFFFF" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
                <Path d={sparkle(C + 24, y + 6, 4.5)} fill="#FFFFFF" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
              </>
            ) : null}
            <Circle cx={C} cy={C - R * 0.43} r={8.5} fill={GOLD} stroke={INK} strokeWidth={2} />
            <Circle cx={C} cy={C - R * 0.43} r={4.5} fill="none" stroke={GOLD_DARK} strokeWidth={1.6} />
          </G>
        );
      })}
      {segments.map((_, i) => {
        const p = polar(R - 7, i * step);
        return <Circle key={`g${i}`} cx={p.x} cy={p.y} r={4.6} fill="#FFE98F" stroke={INK} strokeWidth={1.8} />;
      })}
      <Circle cx={C} cy={C} r={R} fill="none" stroke={INK} strokeWidth={3.5} />
      <Circle cx={C} cy={C} r={36} fill={INK} />
      <Circle cx={C} cy={C} r={32} fill="url(#hubGold)" />
    </Svg>
  );
});

/** Rotating light rays behind the wheel. */
function Rays({ size }: { size: number }) {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 24000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(spin);
  }, [spin]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const rays = 14;
  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size, pointerEvents: 'none' }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 200 200">
        {Array.from({ length: rays }, (_, i) => {
          const a0 = ((i * 360) / rays - 6) * (Math.PI / 180);
          const a1 = ((i * 360) / rays + 6) * (Math.PI / 180);
          return (
            <Path
              key={i}
              d={`M100 100 L${100 + 100 * Math.sin(a0)} ${100 - 100 * Math.cos(a0)} L${100 + 100 * Math.sin(a1)} ${100 - 100 * Math.cos(a1)} Z`}
              fill="#FFFFFF"
              opacity={0.16}
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

export function FortuneWheel({ kidId, onWon }: FortuneWheelProps) {
  const { borderRadius, cardBorder, heroGradient, id: themeId } = useTheme();
  const { width: winW } = useWindowDimensions();
  const size = Math.min(300, winW - 84);
  const k = size / VB;
  const [status, setStatus] = useState<FortuneWheelStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [winIndex, setWinIndex] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateMsg, setCelebrateMsg] = useState('');
  const pendingResult = useRef<FortuneWheelSpinResult | null>(null);
  const onWonRef = useRef(onWon);
  onWonRef.current = onWon;
  const lastTick = useRef(0);

  const rotation = useSharedValue(0);
  const pointer = useSharedValue(0);
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
          paddingHorizontal: spacing.md,
          alignItems: 'stretch',
          width: '100%',
        },
        title: {
          color: '#fff',
          fontSize: 24,
          fontFamily: 'Fredoka_700Bold',
          textAlign: 'center',
          alignSelf: 'center',
          textShadowColor: 'rgba(0,0,0,0.35)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 3,
        },
        hint: {
          color: 'rgba(255,255,255,0.92)',
          fontSize: 15,
          fontFamily: 'Fredoka_600SemiBold',
          marginTop: spacing.xs,
          marginBottom: spacing.md,
          textAlign: 'center',
          alignSelf: 'center',
        },
        wheelWrap: {
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
        },
        layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
        hub: {
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        },
        pointer: {
          position: 'absolute',
          top: -10,
          alignSelf: 'center',
          pointerEvents: 'none',
        },
        spinBtn: { marginTop: spacing.lg },
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
          fontFamily: 'Fredoka_700Bold',
          lineHeight: 20,
        },
        closeLink: {
          marginTop: spacing.md,
          color: 'rgba(255,255,255,0.75)',
          fontSize: 13,
          fontFamily: 'Fredoka_600SemiBold',
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
  const pointerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pointer.value}deg` }],
  }));

  // A peg passes the pointer every `step` degrees: flick the pointer and tick softly.
  const step = 360 / Math.max(1, status?.segments.length ?? 8);
  const onTick = useCallback(() => {
    const now = Date.now();
    if (now - lastTick.current < 75) return;
    lastTick.current = now;
    void playSfx('tap', { volume: 0.35 });
  }, []);
  useAnimatedReaction(
    () => Math.floor(rotation.value / step),
    (cur, prev) => {
      if (prev === null || cur === prev) return;
      pointer.value = withSequence(withTiming(-18, { duration: 30 }), withSpring(0, { damping: 7, stiffness: 320 }));
      runOnJS(onTick)();
    },
    [step]
  );

  const finishSpin = useCallback((index: number) => {
    setSpinning(false);
    setWinIndex(index);
    const result = pendingResult.current;
    if (!result) return;
    playSfx('gem');
    haptic.success();
    const parts = [`+${result.pointsAwarded} ${t('points')}`];
    if (result.streakBonus) parts.push(`${t('streakBonus')}: +${result.streakBonus}`);
    setCelebrateMsg(`${parts.join(' · ')}!`);
    // let the winning slice flash for a moment before the celebration covers it
    setTimeout(() => {
      setCelebrate(true);
      onWonRef.current?.(result);
    }, 900);
  }, []);

  const handleSpin = async () => {
    if (!status?.available || spinning) return;
    setSpinning(true);
    setWinIndex(null);
    playSfx('whoosh');
    haptic.press();
    try {
      const result = await api.spinFortuneWheel(kidId);
      pendingResult.current = result;
      const n = status.segments.length;
      const slice = 360 / n;
      // Land so the segment's centre sits under the top pointer.
      const target = -(result.segmentIndex + 0.5) * slice;
      const current = rotation.value % 360;
      const extra = 360 * 6;
      const next = rotation.value + extra + (target - current);
      const index = result.segmentIndex;
      rotation.value = withTiming(
        next,
        { duration: 4800, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(finishSpin)(index);
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

  if (!status || (!status.available && !visible)) return null;

  const segments = status.segments;
  const mode: BulbMode = winIndex != null ? 'win' : spinning ? 'spin' : 'idle';
  const mood: PikoMood = winIndex != null ? 'cheer' : spinning ? 'wow' : 'happy';
  const busy = spinning || celebrate || winIndex != null;

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
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t('close')}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </Pressable>
                <Text style={styles.title}>{t('fortuneWheel')}</Text>
                <Text style={styles.hint}>{t('fortuneWheelHint')}</Text>

                <View style={[styles.wheelWrap, { width: size, height: size }]}>
                  <Rays size={size * 1.45} />
                  <View style={styles.layer}>
                    <Frame mode={mode} />
                  </View>
                  <Animated.View style={[styles.layer, wheelStyle]}>
                    <WheelFace segments={segments} winIndex={winIndex} />
                  </Animated.View>
                  <View style={[styles.hub, { width: 58 * k, height: 58 * k }]}>
                    <Piko size={58 * k} mood={mood} />
                  </View>
                  <Animated.View style={[styles.pointer, { width: 44 * k, height: 58 * k, transformOrigin: "50% 31%" }, pointerStyle]}>
                    <Svg width="100%" height="100%" viewBox="0 0 44 58">
                      <Path d="M22 55 L7 25 A16.5 16.5 0 1 1 37 25 Z" fill={CORAL_DARK} stroke={INK} strokeWidth={3} strokeLinejoin="round" transform="translate(0 3)" />
                      <Path d="M22 55 L7 25 A16.5 16.5 0 1 1 37 25 Z" fill={CORAL} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
                      <Path d="M12 15 Q15 9 21 8" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.85} />
                      <Circle cx={22} cy={18} r={6} fill={GOLD} stroke={INK} strokeWidth={2.5} />
                    </Svg>
                  </Animated.View>
                </View>

                <ToyButton
                  title={spinning ? t('wheelSpinning') : t('wheelSpin')}
                  onPress={handleSpin}
                  variant="gold"
                  full
                  sound={false}
                  disabled={busy}
                  style={styles.spinBtn}
                />

                <Pressable onPress={handleDismiss} disabled={busy}>
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
