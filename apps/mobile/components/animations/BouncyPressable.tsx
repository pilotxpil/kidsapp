import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { playSfx } from '../../lib/sfx';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface BouncyPressableProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleDown?: number;
  /** Play the active skin's tap sound. Default on. */
  sound?: boolean;
}

export function BouncyPressable({
  children,
  style,
  scaleDown = 0.97,
  disabled,
  sound = true,
  onPress,
  onPressIn,
  onPressOut,
  unstable_pressDelay = 80,
  ...props
}: BouncyPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      unstable_pressDelay={unstable_pressDelay}
      style={[style, animatedStyle]}
      onPress={(e) => {
        if (sound && !disabled) playSfx('tap');
        onPress?.(e);
      }}
      onPressIn={(e) => {
        scale.value = withSpring(scaleDown, { damping: 12, stiffness: 400 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 8, stiffness: 300 });
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
