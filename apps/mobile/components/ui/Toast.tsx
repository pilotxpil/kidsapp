import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CORAL, INK, MINT, WHITE } from '../../constants/themes';
import { ROW } from '../../lib/dir';
import { Txt } from './Txt';
import { Icon } from './Icon';

type Kind = 'success' | 'error' | 'info';
type ToastMsg = { id: number; text: string; kind: Kind };

let listener: ((m: ToastMsg) => void) | null = null;
let seq = 0;

/** Fire-and-forget toast from anywhere. */
export function toast(text: string, kind: Kind = 'success') {
  listener?.({ id: ++seq, text, kind });
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<ToastMsg | null>(null);

  useEffect(() => {
    listener = (m) => setMsg(m);
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg((cur) => (cur?.id === msg.id ? null : cur)), msg.kind === 'error' ? 3800 : 2400);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;
  const bg = msg.kind === 'error' ? CORAL : msg.kind === 'success' ? MINT : INK;
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 8 }]}>
      <Animated.View
        key={msg.id}
        entering={FadeInUp.springify().damping(16)}
        exiting={FadeOutUp.duration(160)}
        style={[styles.toast, { backgroundColor: bg, flexDirection: ROW }]}
        accessibilityLiveRegion="polite"
      >
        <Icon name={msg.kind === 'error' ? 'info' : msg.kind === 'success' ? 'check' : 'sparkle'} size={20} color={WHITE} stroke={2.8} />
        <Txt v="strong" color={WHITE} style={{ flexShrink: 1 }}>
          {msg.text}
        </Txt>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 1000 },
  toast: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: INK,
    maxWidth: 480,
    boxShadow: `0px 4px 0px ${INK}`,
  },
});
