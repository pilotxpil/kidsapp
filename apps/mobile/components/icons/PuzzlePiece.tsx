import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

/** Classic jigsaw: top+right knobs, left+bottom sockets. */
const BODY =
  'M14 22 h12 a9 9 0 1 1 18 0 h12 v12 a9 9 0 1 1 0 18 v12 H44 a9 9 0 1 0 -18 0 H14 V52 a9 9 0 1 0 0 -18 V22 z';

export function PuzzlePiece({
  size = 58,
  light,
  mid,
  dark,
}: {
  size?: number;
  light: string;
  mid: string;
  dark: string;
}) {
  const id = `jig-${mid.replace('#', '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        <LinearGradient id={`${id}-body`} x1="16%" y1="6%" x2="88%" y2="96%">
          <Stop offset="0%" stopColor={light} />
          <Stop offset="42%" stopColor={mid} />
          <Stop offset="100%" stopColor={dark} />
        </LinearGradient>
        <LinearGradient id={`${id}-edge`} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <Stop offset="40%" stopColor="#fff" stopOpacity="0" />
          <Stop offset="100%" stopColor="#000" stopOpacity="0.28" />
        </LinearGradient>
        <RadialGradient id={`${id}-glow`} cx="50%" cy="42%" r="55%">
          <Stop offset="0%" stopColor={light} stopOpacity="0.55" />
          <Stop offset="100%" stopColor={dark} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`${id}-spec`} cx="32%" cy="28%" r="38%">
          <Stop offset="0%" stopColor="#fff" stopOpacity="0.7" />
          <Stop offset="70%" stopColor="#fff" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="42" cy="44" r="30" fill={`url(#${id}-glow)`} />
      <Path d={BODY} fill={dark} opacity={0.4} transform="translate(2.8 3.4)" />
      <Path d={BODY} fill={`url(#${id}-body)`} />
      <Path d={BODY} fill={`url(#${id}-edge)`} />
      <Path
        d={BODY}
        fill="none"
        stroke={dark}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <Path d={BODY} fill={`url(#${id}-spec)`} />
      <Circle cx="35" cy="16" r="3.2" fill="#fff" opacity={0.55} />
      <Circle cx="64" cy="43" r="3.2" fill="#fff" opacity={0.4} />
      <Path
        d="M20 26c6-4 14-5 22-2"
        fill="none"
        stroke="#fff"
        strokeOpacity={0.5}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
