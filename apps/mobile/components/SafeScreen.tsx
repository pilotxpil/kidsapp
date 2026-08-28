import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

interface SafeScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** When true, only pad top/sides — bottom inset is handled by the tab bar */
  tabs?: boolean;
}

export function SafeScreen({ children, style, tabs }: SafeScreenProps) {
  const edges: Edge[] | undefined = tabs ? ['top', 'left', 'right'] : undefined;

  return (
    <SafeAreaView style={[{ flex: 1 }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}
