import React, { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { INK, WHITE } from '../../constants/themes';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../lib/theme-context';
import { playSfx } from '../../lib/sfx';
import { Confetti } from '../animations/Confetti';
import { Coin, Piko, Row, ToyButton, Txt, type PikoMood } from '../ui';
import { c } from '../../lib/i18n';

/**
 * The app's one big orchestrated moment: Piko pops in, the coins bounce, confetti falls.
 * Used when a quest is sent, a prize is bought, a pack is finished.
 */
export function RewardBurst({
  visible,
  title,
  body,
  coins,
  mood = 'cheer',
  cta = c.kid.yay,
  onClose,
}: {
  visible: boolean;
  title: string;
  body?: string;
  coins?: number;
  mood?: PikoMood;
  cta?: string;
  onClose: () => void;
}) {
  const { world, celebrationKicker } = useTheme();
  const pop = useSharedValue(0);
  const coin = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    pop.value = 0;
    coin.value = 0;
    pop.value = withSpring(1, { damping: 9, stiffness: 180 });
    coin.value = withDelay(260, withSequence(withSpring(1.25, { damping: 6 }), withSpring(1, { damping: 10 })));
    haptic.success();
    playSfx('cheer', { volume: 0.7 });
  }, [visible, pop, coin]);

  const card = useAnimatedStyle(() => ({
    transform: [{ scale: 0.6 + 0.4 * pop.value }, { rotate: `${(1 - pop.value) * -8}deg` }],
    opacity: withTiming(pop.value > 0.05 ? 1 : 0, { duration: 120 }),
  }));
  const coinStyle = useAnimatedStyle(() => ({ transform: [{ scale: coin.value }] }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Confetti active={visible} count={46} />
        <Animated.View style={[styles.card, card]}>
          <View style={styles.piko}>
            <Piko size={120} mood={mood} />
          </View>
          <View style={[styles.kicker, { backgroundColor: world.accent }]}>
            <Txt v="title" color={WHITE} align="center">
              {celebrationKicker}
            </Txt>
          </View>
          <Txt v="display" align="center">
            {title}
          </Txt>
          {body ? (
            <Txt v="body" muted align="center">
              {body}
            </Txt>
          ) : null}
          {coins ? (
            <Animated.View style={[{ alignSelf: 'center' }, coinStyle]}>
              <Row gap={6} style={styles.coins}>
                <Coin size={34} />
                <Txt v="display" num>
                  +{coins}
                </Txt>
              </Row>
            </Animated.View>
          ) : null}
          <ToyButton title={cta} variant="gold" full onPress={onClose} sound="coin" />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(36,21,71,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: WHITE,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: INK,
    padding: 22,
    paddingTop: 70,
    gap: 10,
    boxShadow: `0px 7px 0px ${INK}`,
  },
  piko: { position: 'absolute', top: -64, alignSelf: 'center' },
  kicker: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: INK,
    transform: [{ rotate: '-4deg' }],
    marginTop: -8,
  },
  coins: {
    backgroundColor: '#FFF4CC',
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: INK,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
});
