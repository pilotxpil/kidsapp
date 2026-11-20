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
import { useTheme } from '../../lib/theme-context';

/**
 * Piko — the KidsQuest mascot. A soft, round-cornered star with a face.
 * Drawn in SVG so it is crisp at any size and recolourable per world.
 */
export type PikoMood = 'happy' | 'wow' | 'wink' | 'sleepy' | 'cheer' | 'think';
export type PikoOutfit = 'none' | 'waves' | 'lava' | 'leaves' | 'stars' | 'sprinkles';

/** World costume drawn on top of the star (120×120 space, top spike tip ≈ (60, 14)). */
function Outfit({ kind }: { kind: PikoOutfit }) {
  switch (kind) {
    case 'waves': // sailor cap
      return (
        <G>
          <Path d="M44 30 Q60 6 76 30 Z" fill="#FFFFFF" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M42 30 H78 V36 Q60 40 42 36 Z" fill="#1F7AFF" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={60} cy={12} r={4} fill="#1F7AFF" stroke={INK} strokeWidth={2.5} />
        </G>
      );
    case 'lava': // little flame tuft
      return (
        <G>
          <Path d="M60 4 C70 14 72 22 66 30 C64 24 61 22 60 18 C59 22 56 24 54 30 C48 22 50 14 60 4 Z" fill="#FF7A1A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M60 14 C64 19 64 24 61 28 C60 25 59 25 58 28 C56 24 56 19 60 14 Z" fill="#FFD54A" />
        </G>
      );
    case 'leaves': // explorer helmet
      return (
        <G>
          <Path d="M40 31 Q60 26 80 31 Q72 35 60 35 Q48 35 40 31 Z" fill="#B98C4E" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M47 30 Q48 12 60 11 Q72 12 73 30 Z" fill="#D9AE6A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M48 25 H72" stroke="#12A85E" strokeWidth={4} />
        </G>
      );
    case 'stars': // astronaut bubble + antenna
      return (
        <G>
          <Circle cx={60} cy={64} r={52} fill="#B9E6FF" fillOpacity={0.18} stroke={INK} strokeWidth={3} />
          <Path d="M28 40 Q36 26 52 20" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.8} />
          <Path d="M60 12 V2" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={60} cy={2} r={4} fill="#FF4FA3" stroke={INK} strokeWidth={2} />
        </G>
      );
    case 'sprinkles': // candy crown
      return (
        <G>
          <Path d="M44 32 L46 16 L53 24 L60 10 L67 24 L74 16 L76 32 Z" fill="#FF7AB8" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={60} cy={10} r={3.5} fill="#FFE066" stroke={INK} strokeWidth={2} />
          <Path d="M50 27 l3 -2 M58 29 l3 1 M66 27 l3 -2" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" />
        </G>
      );
    default:
      return null;
  }
}

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
  /** World costume. Defaults to the current world; pass 'none' for the plain star. */
  outfit?: PikoOutfit;
  color?: string;
  /** Gentle idle bob. Off by default — use for one hero moment per screen. */
  bob?: boolean;
  style?: ViewStyle;
}

export function Piko({ size = 120, mood = 'happy', color = GOLD, bob, style, outfit }: PikoProps) {
  const { world } = useTheme();
  const wear: PikoOutfit = outfit ?? world.scenery;
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
        <Outfit kind={wear} />
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
