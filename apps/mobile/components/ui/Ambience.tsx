import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Scenery } from '../../constants/themes';

/**
 * Living sky: each world has its own ambient motion (bubbles, embers, leaves, stars, sprinkles).
 * Kept to ~10 light Views per screen and switched off when the OS asks for reduced motion.
 */
type P = { x: number; size: number; dur: number; delay: number; drift: number; color: string; spin: number };

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const PALETTE: Record<Scenery, string[]> = {
  waves: ['rgba(255,255,255,0.75)'],
  lava: ['#FFD54A', '#FF9A3C', '#FFF1B8'],
  leaves: ['#7EDB5A', '#B8F28A', '#3FBF6A'],
  stars: ['#FFFFFF', '#FFF3B0', '#C9B8FF'],
  sprinkles: ['#FFF27A', '#7AE7FF', '#FFFFFF', '#B57BFF'],
};

function Mote({ p, kind, h }: { p: P; kind: Scenery; h: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      p.delay,
      withRepeat(withTiming(1, { duration: p.dur, easing: kind === 'stars' ? Easing.inOut(Easing.sin) : Easing.linear }), -1, kind === 'stars')
    );
  }, [t, p.delay, p.dur, kind]);

  const style = useAnimatedStyle(() => {
    const v = t.value;
    switch (kind) {
      case 'waves':
      case 'lava': {
        const y = h + 10 - v * (h + 30);
        const x = Math.sin(v * Math.PI * 2) * p.drift;
        const o = kind === 'lava' ? (v < 0.8 ? 0.9 : (1 - v) * 4.5) * (0.6 + 0.4 * Math.abs(Math.sin(v * 30))) : v < 0.85 ? 0.85 : (1 - v) * 5.6;
        return { opacity: o, transform: [{ translateY: y }, { translateX: x }] };
      }
      case 'leaves':
      case 'sprinkles': {
        const y = -20 + v * (h + 40);
        const x = Math.sin(v * Math.PI * 2) * p.drift + v * p.drift;
        return { opacity: v < 0.9 ? 0.95 : (1 - v) * 9.5, transform: [{ translateY: y }, { translateX: x }, { rotate: `${v * p.spin}deg` }] };
      }
      case 'stars':
      default:
        return { opacity: 0.25 + v * 0.75, transform: [{ scale: 0.6 + v * 0.6 }] };
    }
  });

  const base = { left: `${p.x}%` as const, top: kind === 'stars' ? (p.drift / 30) * h : 0 };
  let shape: React.ReactNode;
  if (kind === 'waves') shape = <View style={{ width: p.size, height: p.size, borderRadius: p.size, borderWidth: 2, borderColor: p.color }} />;
  else if (kind === 'lava') shape = <View style={{ width: p.size, height: p.size, borderRadius: p.size, backgroundColor: p.color }} />;
  else if (kind === 'leaves')
    shape = <View style={{ width: p.size, height: p.size * 0.6, borderTopLeftRadius: p.size, borderBottomRightRadius: p.size, backgroundColor: p.color }} />;
  else if (kind === 'sprinkles') shape = <View style={{ width: p.size, height: p.size * 0.38, borderRadius: p.size, backgroundColor: p.color }} />;
  else
    shape = (
      <View style={{ width: p.size, height: p.size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: p.size, height: 2, borderRadius: 1, backgroundColor: p.color }} />
        <View style={{ position: 'absolute', width: 2, height: p.size, borderRadius: 1, backgroundColor: p.color }} />
        <View style={{ width: p.size * 0.4, height: p.size * 0.4, borderRadius: p.size, backgroundColor: p.color }} />
      </View>
    );

  return <Animated.View style={[styles.mote, base, style]}>{shape}</Animated.View>;
}

function ShootingStar({ w, h }: { w: number; h: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(0, { duration: 5200 }), withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) })), -1, false);
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value > 0 && t.value < 1 ? 1 - t.value * 0.6 : 0,
    transform: [{ translateX: w * 0.9 - t.value * w * 0.7 }, { translateY: h * 0.12 + t.value * h * 0.45 }, { rotate: '-28deg' }],
  }));
  return (
    <Animated.View style={[styles.mote, style]}>
      <View style={{ width: 70, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.9)' }} />
    </Animated.View>
  );
}

export function Ambience({ kind, width, height, count = 10 }: { kind: Scenery; width: number; height: number; count?: number }) {
  const reduce = useReducedMotion();
  const motes = useMemo<P[]>(() => {
    const r = seeded(kind.length * 97 + count);
    const colors = PALETTE[kind];
    return Array.from({ length: count }, (_, i) => ({
      x: 4 + r() * 90,
      size: kind === 'stars' ? 6 + r() * 6 : kind === 'lava' ? 3 + r() * 4 : kind === 'waves' ? 7 + r() * 10 : 10 + r() * 8,
      dur: (kind === 'stars' ? 1400 : kind === 'lava' ? 3200 : 5200) + r() * 2600,
      delay: Math.round(r() * 4000) + i * 120,
      drift: kind === 'stars' ? r() * 26 : 6 + r() * 18,
      color: colors[i % colors.length],
      spin: (r() < 0.5 ? -1 : 1) * (180 + r() * 360),
    }));
  }, [kind, count]);

  if (reduce || !width || !height) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {motes.map((p, i) => (
        <Mote key={`${kind}-${i}`} p={p} kind={kind} h={height} />
      ))}
      {kind === 'stars' ? <ShootingStar w={width} h={height} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mote: { position: 'absolute' },
});
