import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/theme-context';
import { FloatingEmojis } from './animations/FloatingEmojis';

const { width: W, height: H } = Dimensions.get('window');

/** Lightweight pattern — few orbs instead of hundreds of views */
function StarPattern({ colors: [c1, c2, c3] }: { colors: [string, string, string] }) {
  const orbs = [
    { size: 320, x: -90, y: -70, color: c1, opacity: 0.28 },
    { size: 220, x: W * 0.48, y: H * 0.04, color: c2, opacity: 0.2 },
    { size: 180, x: W * 0.08, y: H * 0.48, color: c3, opacity: 0.16 },
    { size: 120, x: W * 0.72, y: H * 0.32, color: c1, opacity: 0.12 },
  ];
  const sparks = [
    { x: W * 0.18, y: H * 0.12, s: 3 },
    { x: W * 0.78, y: H * 0.18, s: 2 },
    { x: W * 0.62, y: H * 0.08, s: 2 },
    { x: W * 0.88, y: H * 0.42, s: 3 },
    { x: W * 0.12, y: H * 0.36, s: 2 },
    { x: W * 0.4, y: H * 0.22, s: 2 },
    { x: W * 0.92, y: H * 0.7, s: 3 },
    { x: W * 0.3, y: H * 0.62, s: 2 },
  ];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {orbs.map((o, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: o.x,
            top: o.y,
            width: o.size,
            height: o.size,
            borderRadius: o.size / 2,
            backgroundColor: o.color,
            opacity: o.opacity,
          }}
        />
      ))}
      {sparks.map((d, i) => (
        <View
          key={`s-${i}`}
          style={{
            position: 'absolute',
            left: d.x,
            top: d.y,
            width: d.s,
            height: d.s,
            borderRadius: d.s / 2,
            backgroundColor: '#fff',
            opacity: 0.45,
          }}
        />
      ))}
    </View>
  );
}

function GridPattern({ color, step = 56 }: { color: string; step?: number }) {
  const cols = Math.ceil(W / step);
  const rows = Math.ceil(H / step);
  const cells = [];
  for (let row = 0; row < rows; row += 2) {
    for (let col = 0; col < cols; col += 2) {
      cells.push(
        <View
          key={`${row}-${col}`}
          style={{
            position: 'absolute',
            left: col * step,
            top: row * step,
            width: step - 8,
            height: step - 8,
            backgroundColor: color,
            opacity: 0.05,
            borderRadius: 2,
          }}
        />
      );
    }
  }
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {cells}
    </View>
  );
}

function HeartPattern({ colors: [c1, c2, c3] }: { colors: [string, string, string] }) {
  const orbs = [
    { size: 260, x: W * 0.55, y: -60, color: c1, opacity: 0.22 },
    { size: 180, x: -50, y: H * 0.15, color: c2, opacity: 0.18 },
    { size: 140, x: W * 0.25, y: H * 0.55, color: c3, opacity: 0.14 },
    { size: 100, x: W * 0.7, y: H * 0.4, color: c1, opacity: 0.1 },
  ];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {orbs.map((o, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: o.x,
            top: o.y,
            width: o.size,
            height: o.size,
            borderRadius: o.size / 2,
            backgroundColor: o.color,
            opacity: o.opacity,
          }}
        />
      ))}
    </View>
  );
}

export function ThemeBackground() {
  const { gradientBg, decorEmojis, pattern, colors, id, chrome } = useTheme();

  const emojiKey = useMemo(() => `${id}-${decorEmojis.join('')}`, [id, decorEmojis]);

  return (
    <View style={styles.wrap} pointerEvents="none">
      <LinearGradient colors={[...gradientBg]} style={StyleSheet.absoluteFill} />
      {pattern === 'blocks' && <GridPattern color={colors.primary} step={48} />}
      {pattern === 'stars' && (
        <StarPattern colors={[colors.primary, colors.accent, colors.secondary]} />
      )}
      {pattern === 'hearts' && (
        <HeartPattern colors={[colors.primary, colors.secondary, colors.accent]} />
      )}
      {pattern === 'embers' && (
        <StarPattern colors={[colors.primary, colors.primaryLight, colors.gold]} />
      )}
      {pattern === 'studs' && <GridPattern color={colors.textMuted} step={36} />}
      {chrome !== 'vector' && (
        <FloatingEmojis key={emojiKey} emojis={decorEmojis} count={10} opacity={0.18} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
});
