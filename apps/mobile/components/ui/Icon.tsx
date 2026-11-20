import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { INK } from '../../constants/themes';

/**
 * Line icons for app chrome (24×24, round 2.2 stroke). Directional icons are drawn for RTL:
 * "forward" points left, "back" points right.
 */
export type IconName =
  | 'home'
  | 'tasks'
  | 'learn'
  | 'shop'
  | 'user'
  | 'users'
  | 'plus'
  | 'minus'
  | 'check'
  | 'x'
  | 'forward'
  | 'back'
  | 'down'
  | 'settings'
  | 'logout'
  | 'camera'
  | 'bell'
  | 'trash'
  | 'edit'
  | 'copy'
  | 'qr'
  | 'share'
  | 'clock'
  | 'lock'
  | 'crown'
  | 'sparkle'
  | 'search'
  | 'eye'
  | 'eyeOff'
  | 'mail'
  | 'key'
  | 'help'
  | 'refresh'
  | 'music'
  | 'volume'
  | 'vibrate'
  | 'shield'
  | 'star'
  | 'calendar'
  | 'gift'
  | 'chart'
  | 'photo'
  | 'heart'
  | 'more'
  | 'info'
  | 'doc'
  | 'repeat'
  | 'target'
  | 'trophy'
  | 'palette'
  | 'card';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
}

export function Icon({ name, size = 24, color = INK, stroke = 2.2 }: IconProps) {
  const p = {
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {GLYPHS[name](p, color)}
    </Svg>
  );
}

type P = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: string;
};

const GLYPHS: Record<IconName, (p: P, color: string) => React.ReactNode> = {
  home: (p) => (
    <>
      <Path {...p} d="M3.5 11 12 4l8.5 7" />
      <Path {...p} d="M5.5 9.5V19a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1V9.5" />
    </>
  ),
  tasks: (p) => (
    <>
      <Rect {...p} x={4} y={3.5} width={16} height={17} rx={3} />
      <Path {...p} d="m8 9 1.6 1.6L12.5 7.8" />
      <Path {...p} d="M8 15h8" />
    </>
  ),
  learn: (p) => (
    <>
      <Path {...p} d="M12 6.5C10.3 5 7.8 4.5 4 4.5v13c3.8 0 6.3.5 8 2 1.7-1.5 4.2-2 8-2v-13c-3.8 0-6.3.5-8 2Z" />
      <Path {...p} d="M12 6.5v13" />
    </>
  ),
  shop: (p) => (
    <>
      <Path {...p} d="M5 8h14l-1.2 11.1a1.5 1.5 0 0 1-1.5 1.4H7.7a1.5 1.5 0 0 1-1.5-1.4Z" />
      <Path {...p} d="M9 10V7a3 3 0 0 1 6 0v3" />
    </>
  ),
  user: (p) => (
    <>
      <Circle {...p} cx={12} cy={8.5} r={4} />
      <Path {...p} d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </>
  ),
  users: (p) => (
    <>
      <Circle {...p} cx={9} cy={8.5} r={3.5} />
      <Path {...p} d="M2.8 19.5c1-3.2 3.3-5 6.2-5s5.2 1.8 6.2 5" />
      <Path {...p} d="M15.5 5.3a3.5 3.5 0 0 1 0 6.4M17.5 14.7c1.8.6 3 2.2 3.7 4.8" />
    </>
  ),
  plus: (p) => <Path {...p} d="M12 5v14M5 12h14" />,
  minus: (p) => <Path {...p} d="M5 12h14" />,
  check: (p) => <Path {...p} d="m5 12.5 4.5 4.5L19 7.5" />,
  x: (p) => <Path {...p} d="M6 6l12 12M18 6 6 18" />,
  forward: (p) => <Path {...p} d="m14.5 5.5-6.5 6.5 6.5 6.5" />,
  back: (p) => <Path {...p} d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  down: (p) => <Path {...p} d="m6 9.5 6 6 6-6" />,
  settings: (p) => (
    <>
      <Circle {...p} cx={12} cy={12} r={3} />
      <Path
        {...p}
        d="M19.4 14.6a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1h-.2a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5v-.2a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"
      />
    </>
  ),
  logout: (p) => (
    <>
      <Path {...p} d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4" />
      <Path {...p} d="M9.5 8 5.5 12l4 4M5.5 12H15" />
    </>
  ),
  camera: (p) => (
    <>
      <Path {...p} d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2.5h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
      <Circle {...p} cx={12} cy={12.5} r={3.3} />
    </>
  ),
  bell: (p) => (
    <>
      <Path {...p} d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z" />
      <Path {...p} d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  trash: (p) => (
    <>
      <Path {...p} d="M4.5 7h15M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
      <Path {...p} d="m6.5 7 .9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
    </>
  ),
  edit: (p) => (
    <>
      <Path {...p} d="M15.5 5.5 18.5 8.5 9 18l-4 1 1-4Z" />
      <Path {...p} d="m13.5 7.5 3 3" />
    </>
  ),
  copy: (p) => (
    <>
      <Rect {...p} x={8.5} y={8.5} width={11} height={11} rx={2.5} />
      <Path {...p} d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  qr: (p) => (
    <>
      <Rect {...p} x={4} y={4} width={6} height={6} rx={1.2} />
      <Rect {...p} x={14} y={4} width={6} height={6} rx={1.2} />
      <Rect {...p} x={4} y={14} width={6} height={6} rx={1.2} />
      <Path {...p} d="M14 14h2.5v2.5H14zM18.5 18.5H20V20h-1.5zM14 19.5h1M19.5 14v1.5" />
    </>
  ),
  share: (p) => (
    <>
      <Path {...p} d="M12 14.5V4M8 7.5 12 4l4 3.5" />
      <Path {...p} d="M7 11H6a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18 11h-1" />
    </>
  ),
  clock: (p) => (
    <>
      <Circle {...p} cx={12} cy={12} r={8} />
      <Path {...p} d="M12 7.5V12l3 2" />
    </>
  ),
  lock: (p) => (
    <>
      <Rect {...p} x={5} y={10.5} width={14} height={10} rx={2.5} />
      <Path {...p} d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  crown: (p) => (
    <>
      <Path {...p} d="m4 8 4 4 4-6 4 6 4-4-1.5 10h-13Z" />
      <Path {...p} d="M5.5 20.5h13" />
    </>
  ),
  sparkle: (p) => (
    <>
      <Path {...p} d="M12 3.5c.6 4.4 2.1 5.9 6.5 6.5-4.4.6-5.9 2.1-6.5 6.5-.6-4.4-2.1-5.9-6.5-6.5 4.4-.6 5.9-2.1 6.5-6.5Z" />
      <Path {...p} d="M18.5 16v4M16.5 18h4" />
    </>
  ),
  search: (p) => (
    <>
      <Circle {...p} cx={11} cy={11} r={6.5} />
      <Path {...p} d="m16 16 4 4" />
    </>
  ),
  eye: (p) => (
    <>
      <Path {...p} d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <Circle {...p} cx={12} cy={12} r={3} />
    </>
  ),
  eyeOff: (p) => (
    <>
      <Path {...p} d="M10 5.8a9 9 0 0 1 2-.3c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.4 3.1M6.6 6.7C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.9-1.5" />
      <Path {...p} d="M4 4l16 16M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  mail: (p) => (
    <>
      <Rect {...p} x={3.5} y={5.5} width={17} height={13} rx={2.5} />
      <Path {...p} d="m4.5 7 7.5 6 7.5-6" />
    </>
  ),
  key: (p) => (
    <>
      <Circle {...p} cx={8} cy={15} r={4} />
      <Path {...p} d="m11 12 8-8M16 7l2.5 2.5M14 9l2 2" />
    </>
  ),
  help: (p) => (
    <>
      <Circle {...p} cx={12} cy={12} r={8.5} />
      <Path {...p} d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6M12 17v.2" />
    </>
  ),
  refresh: (p) => (
    <>
      <Path {...p} d="M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12a7.5 7.5 0 0 1 13.2-4.9" />
      <Path {...p} d="M17.8 3.5v3.6h-3.6M6.2 20.5v-3.6h3.6" />
    </>
  ),
  music: (p) => (
    <>
      <Path {...p} d="M9 17.5V6l10-2v11.5" />
      <Circle {...p} cx={6.5} cy={17.5} r={2.5} />
      <Circle {...p} cx={16.5} cy={15.5} r={2.5} />
    </>
  ),
  volume: (p) => (
    <>
      <Path {...p} d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3Z" />
      <Path {...p} d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" />
    </>
  ),
  vibrate: (p) => (
    <>
      <Rect {...p} x={7.5} y={4} width={9} height={16} rx={2} />
      <Path {...p} d="M4 9v6M20 9v6" />
    </>
  ),
  shield: (p) => (
    <>
      <Path {...p} d="M12 3.5 5 6v5.5c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6Z" />
      <Path {...p} d="m9 12 2 2 4-4" />
    </>
  ),
  star: (p) => (
    <Path {...p} d="m12 4 2.4 5 5.4.7-4 3.7 1 5.4L12 16.2 7.2 18.8l1-5.4-4-3.7 5.4-.7Z" />
  ),
  calendar: (p) => (
    <>
      <Rect {...p} x={4} y={5.5} width={16} height={15} rx={2.5} />
      <Path {...p} d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  gift: (p) => (
    <>
      <Rect {...p} x={4} y={9} width={16} height={4} rx={1} />
      <Path {...p} d="M5.5 13v6a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-6M12 9v11.5" />
      <Path {...p} d="M12 9c-1-3.5-5-4.5-5-2s3 2 5 2c2 0 5 .5 5-2s-4-1.5-5 2Z" />
    </>
  ),
  chart: (p) => (
    <>
      <Path {...p} d="M4.5 4.5v15h15" />
      <Path {...p} d="m8 14.5 3.5-4 3 2.5 4.5-6" />
    </>
  ),
  photo: (p) => (
    <>
      <Rect {...p} x={4} y={4.5} width={16} height={15} rx={2.5} />
      <Circle {...p} cx={9} cy={9.5} r={1.6} />
      <Path {...p} d="m4.5 17 4.5-4.5 3.5 3.5 2.5-2.5 4.5 4.5" />
    </>
  ),
  heart: (p) => (
    <Path {...p} d="M12 19.5S4 15 4 9.5A4 4 0 0 1 12 8a4 4 0 0 1 8 1.5c0 5.5-8 10-8 10Z" />
  ),
  more: (_p, color) => (
    <>
      <Circle cx={6} cy={12} r={1.7} fill={color} />
      <Circle cx={12} cy={12} r={1.7} fill={color} />
      <Circle cx={18} cy={12} r={1.7} fill={color} />
    </>
  ),
  info: (p) => (
    <>
      <Circle {...p} cx={12} cy={12} r={8.5} />
      <Path {...p} d="M12 11v5.5M12 7.8V8" />
    </>
  ),
  doc: (p) => (
    <>
      <Path {...p} d="M6.5 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z" />
      <Path {...p} d="M13.5 3.5v4h4M8.5 12.5h7M8.5 16h5" />
    </>
  ),
  repeat: (p) => (
    <>
      <Path {...p} d="M4.5 11V9.5a3 3 0 0 1 3-3h11M15.5 3.5l3 3-3 3" />
      <Path {...p} d="M19.5 13v1.5a3 3 0 0 1-3 3h-11M8.5 20.5l-3-3 3-3" />
    </>
  ),
  target: (p) => (
    <>
      <Circle {...p} cx={12} cy={12} r={8.5} />
      <Circle {...p} cx={12} cy={12} r={4.5} />
      <Circle {...p} cx={12} cy={12} r={0.8} />
    </>
  ),
  trophy: (p) => (
    <>
      <Path {...p} d="M7.5 4.5h9V10a4.5 4.5 0 0 1-9 0Z" />
      <Path {...p} d="M7.5 6.5H4.5c0 3 1.2 4.5 3.3 4.8M16.5 6.5h3c0 3-1.2 4.5-3.3 4.8M12 14.5V18M8.5 20h7" />
    </>
  ),
  palette: (p) => (
    <>
      <Path {...p} d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 1.8-1 1.3-2-.7-1.3.2-2.5 1.6-2.5H17a3.5 3.5 0 0 0 3.5-3.5c0-5-3.8-9-8.5-9Z" />
      <Circle cx={8} cy={11} r={1.3} fill={p.stroke} />
      <Circle cx={11} cy={7.5} r={1.3} fill={p.stroke} />
      <Circle cx={15.5} cy={8.5} r={1.3} fill={p.stroke} />
    </>
  ),
  card: (p) => (
    <>
      <Rect {...p} x={3.5} y={6} width={17} height={12} rx={2.5} />
      <Line {...p} x1={3.5} y1={10} x2={20.5} y2={10} />
      <Path {...p} d="M7 14.5h3" />
    </>
  ),
};
