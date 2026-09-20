import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COSMETIC_ITEMS, FREE_AVATAR_ID } from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { KidAvatar } from './KidAvatar';
import { Button } from './Button';
import { t } from '../lib/i18n';

interface AvatarGiftModalProps {
  visible: boolean;
  onUse: () => Promise<void> | void;
  onSkip: () => void;
}

export function AvatarGiftModal({ visible, onUse, onSkip }: AvatarGiftModalProps) {
  const { colors, borderRadius, cardBorder } = useTheme();
  const [saving, setSaving] = useState(false);
  const noob = COSMETIC_ITEMS.find((c) => c.id === FREE_AVATAR_ID);

  const handleUse = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onUse();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <Pressable style={styles.overlay} onPress={onSkip}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.bgCard,
              borderRadius: borderRadius.lg,
              ...cardBorder(3),
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.kicker, { color: colors.gold }]}>{t('freeAvatarGift')}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t('avatarGiftTitle')}</Text>
          <KidAvatar avatar={FREE_AVATAR_ID} size={128} />
          {noob?.label ? (
            <Text style={[styles.name, { color: colors.text }]}>{noob.label}</Text>
          ) : null}
          <Text style={[styles.body, { color: colors.textMuted }]}>{t('avatarGiftBody')}</Text>
          <View style={styles.actions}>
            <Button title={t('avatarGiftUse')} onPress={handleUse} loading={saving} />
            <Button title={t('avatarGiftSkip')} onPress={onSkip} variant="outline" disabled={saving} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: spacing.lg,
    alignItems: 'center',
  },
  kicker: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    width: '100%',
  },
  actions: { width: '100%', gap: spacing.sm },
});
