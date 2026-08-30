import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/theme-context';
import { FloatingEmojis } from './animations/FloatingEmojis';

const { width: W, height: H } = Dimensions.get('window');

/** Lightweight pattern — few orbs instead of hundreds of views */
function StarPattern({ colors: [c1, c2, c3] }: { colors: [string, string, string] }) {
  const orbs = [
    { size: 280, x: -80, y: -40, color: c1, opacity: 0.2 },
    { size: 200, x: W * 0.5, y: H * 0.08, color: c2, opacity: 0.15 },
    { size: 160, x: W * 0.1, y: H * 0.5, color: c3, opacity: 0.12 },
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
  const { gradientBg, decorEmojis, pattern, colors, id } = useTheme();

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
      {pattern === 'studs' && <GridPattern color={colors.textMuted} step={36} />}
      <FloatingEmojis key={emojiKey} emojis={decorEmojis} count={10} opacity={0.18} />
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
