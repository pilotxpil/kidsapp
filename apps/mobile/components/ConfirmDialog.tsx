import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors, borderRadius, cardBorder } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        card: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          maxWidth: 420,
          width: '100%',
          alignSelf: 'center',
          ...cardBorder(2),
        },
        title: {
          color: colors.text,
          fontSize: 18,
          fontWeight: '800',
          marginBottom: spacing.sm,
        },
        message: {
          color: colors.textMuted,
          fontSize: 15,
          marginBottom: spacing.lg,
        },
        actions: { gap: spacing.sm, width: '100%' },
      }),
    [colors, borderRadius, cardBorder]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.card}>
          <Text style={[styles.title, rtl.textFull]}>{title}</Text>
          <Text style={[styles.message, rtl.textFull]}>{message}</Text>
          <View style={styles.actions}>
            <Button title={confirmLabel ?? t('delete')} variant="danger" onPress={onConfirm} />
            <Button title={t('cancel')} variant="outline" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
