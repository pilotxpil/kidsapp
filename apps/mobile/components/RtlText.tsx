import React, { useState, useCallback } from 'react';
import { Text, TextProps, StyleSheet, View, ViewStyle, I18nManager, Platform } from 'react-native';

interface RtlTextProps extends TextProps {
  wrap?: boolean;
  wrapperStyle?: ViewStyle;
}

/** Align to physical right edge (accounts for native RTL mirroring) */
function hebrewAlign(): 'left' | 'right' {
  if (Platform.OS === 'web') return 'right';
  return I18nManager.isRTL ? 'left' : 'right';
}

/**
 * Hebrew text aligned to the physical right.
 * Android: measures container width via onLayout and sets explicit pixel width on Text,
 * because percentage widths inside ScrollView don't expand Text nodes.
 */
export function RtlText({ style, wrap = true, wrapperStyle, children, ...props }: RtlTextProps) {
  const [width, setWidth] = useState<number | null>(null);

  const onLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setWidth((prev) => (prev === w ? prev : w));
  }, []);

  const textStyle = [
    styles.text,
    Platform.OS === 'web' ? styles.webText : width != null ? { width } : null,
    { textAlign: hebrewAlign() },
    style,
  ];

  const text = (
    <Text {...props} style={textStyle}>
      {children}
    </Text>
  );

  if (!wrap) return text;

  return (
    <View
      style={[styles.wrap, width == null && Platform.OS !== 'web' && styles.beforeMeasure, wrapperStyle]}
      onLayout={Platform.OS === 'web' ? undefined : onLayout}
    >
      {text}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'stretch',
  },
  beforeMeasure: {
    alignItems: 'flex-end',
  },
  text: {
    writingDirection: 'rtl',
  },
  webText: {
    width: '100%',
  },
});
