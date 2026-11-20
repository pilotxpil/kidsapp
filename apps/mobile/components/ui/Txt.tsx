import React from 'react';
import { Text, type TextProps, type TextStyle, StyleSheet } from 'react-native';
import { F } from '../../lib/fonts';
import { INK, INK_SOFT } from '../../constants/themes';
import { TEXT_END, TEXT_START } from '../../lib/dir';

export type TxtVariant =
  | 'hero'
  | 'display'
  | 'h1'
  | 'h2'
  | 'title'
  | 'body'
  | 'strong'
  | 'caption'
  | 'tiny'
  | 'button';

/** Type scale (Fredoka): one family, weight + size carry the hierarchy. */
export const TYPE: Record<TxtVariant, TextStyle> = {
  hero: { fontFamily: F.bold, fontSize: 40, lineHeight: 46 },
  display: { fontFamily: F.bold, fontSize: 30, lineHeight: 36 },
  h1: { fontFamily: F.bold, fontSize: 24, lineHeight: 30 },
  h2: { fontFamily: F.semibold, fontSize: 20, lineHeight: 26 },
  title: { fontFamily: F.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 22 },
  strong: { fontFamily: F.medium, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: F.medium, fontSize: 13, lineHeight: 18 },
  tiny: { fontFamily: F.semibold, fontSize: 11, lineHeight: 14 },
  button: { fontFamily: F.semibold, fontSize: 17, lineHeight: 22 },
};

interface TxtProps extends TextProps {
  v?: TxtVariant;
  color?: string;
  muted?: boolean;
  align?: 'start' | 'center' | 'end';
  /** Tabular digits for counters. */
  num?: boolean;
  size?: number;
}

export function Txt({ v = 'body', color, muted, align = 'start', num, size, style, children, ...rest }: TxtProps) {
  const base = TYPE[v];
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        base,
        size ? { fontSize: size, lineHeight: Math.round(size * 1.22) } : null,
        { color: color ?? (muted ? INK_SOFT : INK) },
        { textAlign: align === 'center' ? 'center' : align === 'end' ? TEXT_END : TEXT_START },
        num ? styles.num : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { writingDirection: 'rtl', includeFontPadding: false },
  num: { fontVariant: ['tabular-nums'] },
});
