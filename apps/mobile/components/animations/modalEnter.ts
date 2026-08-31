import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const ENTER_MS = 320;
const enterConfig = { duration: ENTER_MS, easing: Easing.out(Easing.cubic) };
const overlayConfig = { duration: 240, easing: Easing.out(Easing.quad) };

/**
 * Manual modal entrance — Reanimated `entering` does not run reliably inside RN Modal.
 * Pair with `<Modal animationType="none">` so the native fade does not swallow the effect.
 */
export function useModalEnter(active: boolean) {
  const overlayOpacity = useSharedValue(0);
  const scale = useSharedValue(0.88);
  const translateY = useSharedValue(22);

  useEffect(() => {
    if (!active) {
      overlayOpacity.value = 0;
      scale.value = 0.88;
      translateY.value = 22;
      return;
    }

    overlayOpacity.value = 0;
    scale.value = 0.88;
    translateY.value = 22;

    overlayOpacity.value = withTiming(1, overlayConfig);
    scale.value = withTiming(1, enterConfig);
    translateY.value = withTiming(0, enterConfig);
  }, [active, overlayOpacity, scale, translateY]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return { overlayStyle, cardStyle };
}
