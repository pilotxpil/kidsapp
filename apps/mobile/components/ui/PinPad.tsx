import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../lib/theme-context';
import { INK, WHITE } from '../../constants/themes';
import { haptic } from '../../lib/haptics';
import { playSfx } from '../../lib/sfx';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { ROW } from '../../lib/dir';

/** Physical left→right, like a phone keypad, regardless of RTL. */
const LTR_ROW = ROW === 'row' ? 'row-reverse' : 'row';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/** Big friendly PIN pad for kids. Digits are always laid out LTR like a phone keypad. */
export function PinPad({
  value,
  onChange,
  length = 4,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: boolean;
}) {
  const { world } = useTheme();
  const shake = useSharedValue(0);

  React.useEffect(() => {
    if (error) {
      haptic.error();
      shake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [error, shake]);

  const dotsStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const press = (k: string) => {
    if (k === 'del') {
      haptic.tap();
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= length) return;
    haptic.tap();
    playSfx('tap', { volume: 0.5 });
    onChange(value + k);
  };

  return (
    <View style={{ gap: 18, alignItems: 'center' }}>
      <Animated.View style={[styles.dots, dotsStyle]}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                filled ? { backgroundColor: world.accent, transform: [{ scale: 1.05 }] } : { backgroundColor: WHITE },
              ]}
            />
          );
        })}
      </Animated.View>
      <View style={styles.grid}>
        {KEYS.map((k, i) =>
          k === '' ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={i}
              onPress={() => press(k)}
              accessibilityRole="button"
              accessibilityLabel={k === 'del' ? 'מחיקה' : k}
              style={({ pressed }) => [
                styles.key,
                styles.keyFace,
                pressed && { transform: [{ translateY: 3 }], boxShadow: `0px 0px 0px ${INK}` },
              ]}
            >
              {k === 'del' ? (
                <Icon name="forward" size={26} color={INK} stroke={2.8} />
              ) : (
                <Txt v="display" align="center">
                  {k}
                </Txt>
              )}
            </Pressable>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: LTR_ROW, gap: 14 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: INK },
  grid: {
    flexDirection: LTR_ROW,
    flexWrap: 'wrap',
    width: 3 * 76 + 2 * 14,
    gap: 14,
    justifyContent: 'center',
  },
  key: { width: 76, height: 64 },
  keyFace: {
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 2.5,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 4px 0px ${INK}`,
  },
});
