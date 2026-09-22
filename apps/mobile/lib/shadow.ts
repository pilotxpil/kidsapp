import { Platform, type TextStyle } from 'react-native';

type Offset = { width: number; height: number };

function applyOpacity(color: string, opacity: number): string {
  if (opacity <= 0) return 'rgba(0,0,0,0)';
  const value = color.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const base = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return `rgba(${r},${g},${b},${roundAlpha(base * opacity)})`;
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(value);
  if (rgb) {
    const base = rgb[4] != null ? Number(rgb[4]) : 1;
    return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${roundAlpha(base * opacity)})`;
  }
  return value;
}

function roundAlpha(alpha: number) {
  return Math.round(alpha * 1000) / 1000;
}

/** Cross-platform shadow. Replaces shadowColor / shadowOffset / shadowOpacity / shadowRadius. */
export function toBoxShadow({
  color = '#000',
  offset = { width: 0, height: 0 },
  opacity = 1,
  radius = 0,
}: {
  color?: string;
  offset?: Offset;
  opacity?: number;
  radius?: number;
}): string {
  return `${offset.width}px ${offset.height}px ${radius}px ${applyOpacity(color, opacity)}`;
}

/**
 * Web wants one `textShadow` string. Native still uses the split text shadow props.
 */
export function toTextShadow(
  color: string,
  offset: Offset = { width: 0, height: 0 },
  radius = 0,
): TextStyle {
  if (Platform.OS === 'web') {
    if (offset.width === 0 && offset.height === 0 && radius === 0) {
      return { textShadow: 'none' } as TextStyle;
    }
    return {
      textShadow: `${offset.width}px ${offset.height}px ${radius}px ${color}`,
    } as TextStyle;
  }
  return {
    textShadowColor: color,
    textShadowOffset: offset,
    textShadowRadius: radius,
  };
}
