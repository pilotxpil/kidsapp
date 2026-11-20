import React, { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Polygon, Ellipse, Path, Circle, G } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated';
import { GOLD, INK } from '../../constants/themes';

/**
 * Piko — the KidsQuest mascot. A soft, round-cornered star with a face.
 * Drawn in SVG so it is crisp at any size and recolourable per world.
 */
export type PikoMood = 'happy' | 'wow' | 'wink' | 'sleepy' | 'cheer' | 'think';

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

const BODY = starPoints(60, 66, 44, 25);
const SHADOW = starPoints(60, 71, 44, 25);

function Face({ mood }: { mood: PikoMood }) {
  const eyeY = 64;
  const lx = 49;
  const rx = 71;
  const closedEye = (x: number) => (
    <Path d={`M${x - 5} ${eyeY} q5 4 10 0`} stroke={INK} strokeWidth={3.4} strokeLinecap="round" fill="none" />
  );
  const openEye = (x: number) => (
    <G>
      <Ellipse cx={x} cy={eyeY} rx={4.6} ry={6} fill={INK} />
      <Circle cx={x + 1.6} cy={eyeY - 2.2} r={1.8} fill="#FFFFFF" />
    </G>
  );

  let eyes: React.ReactNode;
  if (mood === 'sleepy') eyes = <>{closedEye(lx)}{closedEye(rx)}</>;
  else if (mood === 'wink') eyes = <>{openEye(lx)}{closedEye(rx)}</>;
  else if (mood === 'cheer')
    eyes = (
      <>
        <Path d={`M${lx - 5} ${eyeY + 2} q5 -7 10 0`} stroke={INK} strokeWidth={3.4} strokeLinecap="round" fill="none" />
        <Path d={`M${rx - 5} ${eyeY + 2} q5 -7 10 0`} stroke={INK} strokeWidth={3.4} strokeLinecap="round" fill="none" />
      </>
    );
  else eyes = <>{openEye(lx)}{openEye(rx)}</>;

  let mouth: React.ReactNode;
  switch (mood) {
    case 'wow':
      mouth = <Ellipse cx={60} cy={80} rx={4.5} ry={5.5} fill={INK} />;
      break;
    case 'cheer':
      mouth = (
        <G>
          <Path d="M50 76 q10 14 20 0 Z" fill={INK} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
          <Path d="M54.5 81.5 q5.5 4 11 0" fill="#FF7A9C" />
        </G>
      );
      break;
    case 'sleepy':
      mouth = <Path d="M56 80 q4 2 8 0" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />;
      break;
    case 'think':
      mouth = <Path d="M54 80 q4 -3 9 1" stroke={INK} strokeWidth={3.2} strokeLinecap="round" fill="none" />;
      break;
    default:
      mouth = <Path d="M52 76 q8 9 16 0" stroke={INK} strokeWidth={3.4} strokeLinecap="round" fill="none" />;
  }

  return (
    <G>
      {eyes}
      <Ellipse cx={42} cy={74} rx={5} ry={3} fill="#FF8FB1" opacity={0.75} />
      <Ellipse cx={78} cy={74} rx={5} ry={3} fill="#FF8FB1" opacity={0.75} />
      {mouth}
    </G>
  );
}

interface PikoProps {
  size?: number;
  mood?: PikoMood;
  color?: string;
  /** Gentle idle bob. Off by default — use for one hero moment per screen. */
  bob?: boolean;
  style?: ViewStyle;
}

export function Piko({ size = 120, mood = 'happy', color = GOLD, bob, style }: PikoProps) {
  const y = useSharedValue(0);
  const rot = useSharedValue(0);

  useEffect(() => {
    if (!bob) return;
    y.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System
    );
    rot.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(3, { duration: 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true,
      undefined,
      ReduceMotion.System
    );
  }, [bob, y, rot]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, anim, style]}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {/* Hard toy shadow, then outline, then body (round joins soften the star). */}
        <Polygon points={SHADOW} fill={INK} stroke={INK} strokeWidth={19} strokeLinejoin="round" />
        <Polygon points={BODY} fill={INK} stroke={INK} strokeWidth={19} strokeLinejoin="round" />
        <Polygon points={BODY} fill={color} stroke={color} strokeWidth={12} strokeLinejoin="round" />
        <Path d="M41 44 q6 -10 15 -12" stroke="#FFF7DA" strokeWidth={5} strokeLinecap="round" fill="none" />
        <Face mood={mood} />
      </Svg>
    </Animated.View>
  );
}

/** Piko holding a speech bubble — used for empty states and tips. */
export function PikoSays({ children, mood = 'happy', size = 72 }: { children: React.ReactNode; mood?: PikoMood; size?: number }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Piko size={size} mood={mood} />
      {children}
    </View>
  );
}
