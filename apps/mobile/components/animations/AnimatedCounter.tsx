import React, { useEffect } from 'react';
import { TextStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface AnimatedCounterProps {
  value: number;
  style?: StyleProp<TextStyle>;
  suffix?: string;
}

export function AnimatedCounter({ value, style, suffix = '' }: AnimatedCounterProps) {
  const display = useSharedValue(value);
  const scale = useSharedValue(1);
  const [text, setText] = React.useState(value.toLocaleString());

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.25, { damping: 6, stiffness: 400 }),
      withSpring(1, { damping: 8 })
    );

    const start = display.value;
    const end = value;
    const steps = 12;
    let step = 0;

    const tick = () => {
      step += 1;
      const progress = step / steps;
      const current = Math.round(start + (end - start) * progress);
      setText(current.toLocaleString());
      if (step < steps) {
        setTimeout(tick, 30);
      } else {
        display.value = end;
      }
    };
    tick();
  }, [value, display, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text style={[style, animatedStyle]}>
      {text}{suffix}
    </Animated.Text>
  );
}
