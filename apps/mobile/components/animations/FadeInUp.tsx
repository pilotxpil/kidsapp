import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

interface FadeInUpProps {
  children: React.ReactNode;
  delay?: number;
  index?: number;
  style?: StyleProp<ViewStyle>;
}

export function FadeInUp({ children, delay = 0, index = 0, style }: FadeInUpProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(28);

  useEffect(() => {
    const totalDelay = delay + index * 70;
    opacity.value = withDelay(totalDelay, withSpring(1, { damping: 14 }));
    translateY.value = withDelay(totalDelay, withSpring(0, { damping: 12, stiffness: 90 }));
  }, [delay, index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
