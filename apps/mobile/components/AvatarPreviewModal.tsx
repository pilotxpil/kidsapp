import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CosmeticItem } from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { KidAvatar } from './KidAvatar';
import { Button } from './Button';
import { t } from '../lib/i18n';

interface AvatarPreviewModalProps {
  item: CosmeticItem | null;
  visible: boolean;
  owned: boolean;
  equipped: boolean;
  canAfford: boolean;
  pointsLabel: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function AvatarPreviewModal({
  item,
  visible,
  owned,
  equipped,
  canAfford,
  pointsLabel,
  loading,
  onClose,
  onConfirm,
}: AvatarPreviewModalProps) {
  const { colors, borderRadius, cardBorder } = useTheme();

  const actionTitle = equipped
    ? t('avatarEquipped')
    : owned
      ? t('equipCosmetic')
      : canAfford
        ? t('buyCosmetic')
        : t('notEnoughPoints');

  return (
    <Modal visible={visible && !!item} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
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
          {item ? (
            <>
              <KidAvatar avatar={item.id} size={240} />
              <Text style={[styles.name, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.price, { color: canAfford || owned ? colors.gold : colors.textMuted }]}>
                {owned ? `${t('ownedCosmetic')} · ${t('freeToChoose')}` : `${item.cost} ${pointsLabel}`}
              </Text>
              <View style={styles.actions}>
                <Button
                  title={actionTitle}
                  onPress={onConfirm}
                  loading={loading}
                  disabled={equipped || (!owned && !canAfford)}
                />
                <Button title={t('close')} onPress={onClose} variant="outline" disabled={loading} />
              </View>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
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
  name: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  actions: { width: '100%', gap: spacing.sm },
});
