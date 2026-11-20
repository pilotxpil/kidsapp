import React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { END, ROW, START } from '../../lib/dir';

interface RowProps extends ViewProps {
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: 'start' | 'end' | 'center' | 'between' | 'around';
  wrap?: boolean;
}

// ROW already points the main axis right→left on every platform, so "start" is flex-start.
const JUSTIFY: Record<NonNullable<RowProps['justify']>, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  between: 'space-between',
  around: 'space-around',
};

/** Horizontal stack whose first child sits on the physical right (Hebrew reading order). */
export function Row({ gap = 0, align = 'center', justify = 'start', wrap, style, ...rest }: RowProps) {
  return (
    <View
      {...rest}
      style={[
        { flexDirection: ROW, alignItems: align, justifyContent: JUSTIFY[justify], gap },
        wrap ? { flexWrap: 'wrap' } : null,
        style,
      ]}
    />
  );
}

interface StackProps extends ViewProps {
  gap?: number;
  align?: 'stretch' | 'start' | 'center' | 'end';
}

export function Stack({ gap = 0, align = 'stretch', style, ...rest }: StackProps) {
  const alignItems: ViewStyle['alignItems'] =
    align === 'start' ? START : align === 'end' ? END : align;
  return <View {...rest} style={[{ gap, alignItems }, style]} />;
}

export function Spacer({ size = 16 }: { size?: number }) {
  return <View style={{ height: size, width: size }} />;
}

export function Grow() {
  return <View style={{ flex: 1 }} />;
}
