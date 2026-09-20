import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SHOP_TEASER_AVATAR_IDS } from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { Card } from './Card';
import { BouncyPressable } from './animations/BouncyPressable';
import { KidAvatar } from './KidAvatar';
import { playSfx } from '../lib/sfx';
import { t } from '../lib/i18n';

const FACE = 44;
const OVERLAP = 16;
const SAMPLES = SHOP_TEASER_AVATAR_IDS.slice(0, 3);
const STACK_WIDTH = FACE + (SAMPLES.length - 1) * (FACE - OVERLAP);

export function AvatarShopTeaser({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();

  return (
    <Card>
      <BouncyPressable
        onPress={() => {
          playSfx('tap');
          onPress();
        }}
        style={styles.press}
      >
        <View style={styles.row}>
          <View style={styles.stack}>
            {SAMPLES.map((id, i) => (
              <View key={id} style={[styles.face, { right: i * (FACE - OVERLAP), zIndex: SAMPLES.length - i }]}>
                <KidAvatar avatar={id} size={FACE} />
              </View>
            ))}
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {t('shopAvatarTeaser')}
            </Text>
            <Text style={[styles.hint, { color: colors.textMuted }]} numberOfLines={1}>
              {t('shopAvatarTeaserHint')}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: colors.primary }]}>‹</Text>
        </View>
      </BouncyPressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  press: { width: '100%' },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '100%',
    gap: spacing.md,
  },
  stack: {
    width: STACK_WIDTH,
    height: FACE,
    flexShrink: 0,
  },
  face: {
    position: 'absolute',
    top: 0,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 0 0 2px rgba(255,255,255,0.25)' },
      default: {
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.25)',
      },
    }),
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hint: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  chevron: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
    flexShrink: 0,
  },
});
