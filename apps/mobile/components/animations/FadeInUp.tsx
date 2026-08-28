import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface FadeInUpProps {
  children: React.ReactNode;
  delay?: number;
  index?: number;
  style?: StyleProp<ViewStyle>;
}

/** Enter animation on individual blocks — do not wrap full-screen flex containers. */
export function FadeInUp({ children, delay = 0, index = 0, style }: FadeInUpProps) {
  const wait = Math.min(delay + index * 70, 280);

  return (
    <Animated.View
      entering={FadeInDown.duration(420).delay(wait).springify().damping(16).stiffness(120)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
