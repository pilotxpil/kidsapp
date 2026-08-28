import React, { useEffect, useRef } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

interface AnimatedCounterProps {
  value: number;
  style?: StyleProp<TextStyle>;
  suffix?: string;
}

export function AnimatedCounter({ value, style, suffix = '' }: AnimatedCounterProps) {
  const [text, setText] = React.useState(value.toLocaleString());
  const prev = useRef(value);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      prev.current = value;
      setText(value.toLocaleString());
      return;
    }

    if (prev.current === value) return;

    const start = prev.current;
    const end = value;
    prev.current = value;
    const steps = 10;
    let step = 0;

    const id = setInterval(() => {
      step += 1;
      const current = Math.round(start + (end - start) * (step / steps));
      setText(current.toLocaleString());
      if (step >= steps) clearInterval(id);
    }, 24);

    return () => clearInterval(id);
  }, [value]);

  return (
    <Text style={style}>
      {text}{suffix}
    </Text>
  );
}
