import React from 'react';
import Svg, { Path, Circle, Ellipse, G, Polygon, Rect } from 'react-native-svg';
import { GOLD, GOLD_DARK, INK, FLAME } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';

/** Colourful "toy" icons with an ink outline — the collectible pieces of the KidsQuest world. */

type ToyProps = { size?: number };

const EMBLEM: Record<string, string> = {
  stars: 'm20 11.8 2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7Z',
  waves: 'M13 22 Q20 9 27 22 Q24 25 20 25 Q16 25 13 22 Z M20 12 V24 M16.5 14 L18 24 M23.5 14 L22 24',
  lava: 'M20 10 C26 15 27 20 24 25 C23 22 21 21 20 19 C19 21 17 22 16 25 C13 20 14 15 20 10 Z',
  leaves: 'M14 25 C14 16 20 11 27 11 C27 19 22 25 14 25 Z M14 25 L23 15',
  sprinkles: 'M20 26 C14 21 12 18 12 15.5 C12 13 14 11.5 16.2 11.5 C17.8 11.5 19.2 12.5 20 14 C20.8 12.5 22.2 11.5 23.8 11.5 C26 11.5 28 13 28 15.5 C28 18 26 21 20 26 Z',
};

/** Points coin — the app's currency. Its embossed emblem changes with the world. */
export function Coin({ size = 24 }: ToyProps) {
  const { world } = useTheme();
  const d = EMBLEM[world.scenery] ?? EMBLEM.stars;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={21.5} r={16.5} fill={GOLD_DARK} stroke={INK} strokeWidth={2.6} />
      <Circle cx={20} cy={19} r={16.5} fill={GOLD} stroke={INK} strokeWidth={2.6} />
      <Circle cx={20} cy={19} r={11} fill="none" stroke={GOLD_DARK} strokeWidth={2.4} />
      <Path d={d} fill="#FFF3C4" stroke={GOLD_DARK} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M9.5 13.5a12 12 0 0 1 6-5" stroke="#FFF7DA" strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** XP / level gem. */
export function Gem({ size = 24, color = '#38C6FF' }: ToyProps & { color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Polygon
        points="20,36 4,15 11,6 29,6 36,15"
        fill={color}
        stroke={INK}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      <Polygon points="11,6 15,15 20,6" fill="#FFFFFF" opacity={0.55} />
      <Polygon points="4,15 36,15 20,36" fill="#000" opacity={0.12} />
      <Path d="M4 15h32M15 15l5 21 5-21M11 6l4 9 5-9 5 9 4-9" stroke={INK} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

/** Streak flame. */
export function Flame({ size = 24, dim = false }: ToyProps & { dim?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M20 37c-7.5 0-12.5-5-12.5-11.5 0-5.5 3.5-9 6-12 .5 3 2 4.5 3.5 5 0-6 3-11 7.5-14.5-.5 5 2 8.5 4.5 11.5 2.3 2.7 3.5 5.5 3.5 9.5C32.5 32 27.5 37 20 37Z"
        fill={dim ? '#D9D3EC' : FLAME}
        stroke={INK}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      <Path
        d="M20 33.5c-3.5 0-6-2.3-6-5.5 0-2.8 2-4.6 3.6-6.3.4 1.8 1.5 2.7 2.6 3 .2-2.7 1.6-4.8 3.4-6.2 0 2.7 2.4 4.6 2.4 8.5 0 3.7-2.5 6.5-6 6.5Z"
        fill={dim ? '#F1EEF8' : '#FFD54A'}
      />
    </Svg>
  );
}

/** Gift box (daily gift, rewards). */
export function GiftBox({ size = 24, color = '#FF4FA3' }: ToyProps & { color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M20 12c-2-5-9-7.5-9.5-3.5S16 12 20 12c4 0 10 0 9.5-3.5S22 7 20 12Z" fill={GOLD} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <Rect x={7} y={17} width={26} height={19} rx={3} fill={color} stroke={INK} strokeWidth={2.6} />
      <Rect x={4.5} y={11.5} width={31} height={7.5} rx={2.5} fill={color} stroke={INK} strokeWidth={2.6} />
      <Rect x={17} y={11.5} width={6} height={24.5} fill={GOLD} stroke={INK} strokeWidth={2.2} />
      <Path d="M9 21v6" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

export function TrophyToy({ size = 24 }: ToyProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M11 9H5.5c0 6 2.5 9 7 9.5M29 9h5.5c0 6-2.5 9-7 9.5" stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <Path d="M11 5h18v10a9 9 0 0 1-18 0Z" fill={GOLD} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <Path d="M17 24h6v5h-6z" fill={GOLD_DARK} stroke={INK} strokeWidth={2.4} />
      <Rect x={11} y={29} width={18} height={6.5} rx={2} fill="#8B5CF6" stroke={INK} strokeWidth={2.6} />
      <Path d="M15 9v6" stroke="#FFF3C4" strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

export function LockToy({ size = 24 }: ToyProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M13 18v-5a7 7 0 0 1 14 0v5" stroke={INK} strokeWidth={3} fill="none" />
      <Rect x={8} y={17} width={24} height={19} rx={4} fill={GOLD} stroke={INK} strokeWidth={2.6} />
      <Circle cx={20} cy={25} r={2.8} fill={INK} />
      <Path d="M20 26.5v4" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

export function CrownToy({ size = 24 }: ToyProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="m5 13 8 7 7-11 7 11 8-7-3 19H8Z" fill={GOLD} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <Path d="M8 32h24" stroke={INK} strokeWidth={2.6} />
      <Circle cx={20} cy={23} r={2.6} fill="#FF4FA3" stroke={INK} strokeWidth={1.6} />
      <Circle cx={12} cy={25} r={1.8} fill="#38C6FF" stroke={INK} strokeWidth={1.4} />
      <Circle cx={28} cy={25} r={1.8} fill="#38C6FF" stroke={INK} strokeWidth={1.4} />
    </Svg>
  );
}

export function CheckBadge({ size = 24, color = '#1DBF7F' }: ToyProps & { color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={21.5} r={15.5} fill="#0E8A57" stroke={INK} strokeWidth={2.6} />
      <Circle cx={20} cy={19} r={15.5} fill={color} stroke={INK} strokeWidth={2.6} />
      <Path d="m12.5 19.5 5 5 10-10.5" stroke="#FFFFFF" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function HourglassToy({ size = 24 }: ToyProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G stroke={INK} strokeWidth={2.6} strokeLinejoin="round">
        <Path d="M11 5h18M11 35h18" strokeLinecap="round" />
        <Path d="M13 5c0 7 7 9 7 15s-7 8-7 15h14c0-7-7-9-7-15s7-8 7-15Z" fill="#E8E0FF" />
      </G>
      <Path d="M15.5 33c.8-3.5 4.5-5 4.5-7.5 0 2.5 3.7 4 4.5 7.5Z" fill={GOLD} />
      <Ellipse cx={20} cy={12} rx={4} ry={1.6} fill={GOLD} />
    </Svg>
  );
}
