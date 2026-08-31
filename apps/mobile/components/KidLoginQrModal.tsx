import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { buildKidLoginQrPayload } from '@kidsapp/shared';
import type { User } from '@kidsapp/shared';
import { Button } from './Button';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme-context';
import { spacing } from '../constants/theme';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';

interface KidLoginQrModalProps {
  kid: User | null;
  visible: boolean;
  onClose: () => void;
}

export function KidLoginQrModal({ kid, visible, onClose }: KidLoginQrModalProps) {
  const { colors, borderRadius, cardBorder } = useTheme();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!kid) return;
    setLoading(true);
    try {
      const res = await api.getFamilyInvite();
      setInviteCode(res.inviteCode);
    } catch {
      setInviteCode(null);
    } finally {
      setLoading(false);
    }
  }, [kid]);

  React.useEffect(() => {
    if (visible && kid) {
      void load();
    } else {
      setInviteCode(null);
    }
  }, [visible, kid, load]);

  const qrValue =
    kid && inviteCode && kid.username
      ? buildKidLoginQrPayload(inviteCode, kid.username, kid.displayName)
      : null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.75)',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        card: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          maxWidth: 360,
          width: '100%',
          alignSelf: 'center',
          alignItems: 'center',
          ...cardBorder(2),
        },
        title: {
          color: colors.text,
          fontSize: 20,
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: spacing.sm,
        },
        hint: {
          color: colors.textMuted,
          fontSize: 13,
          textAlign: 'center',
          marginBottom: spacing.lg,
        },
        kidLine: {
          color: colors.primaryLight,
          fontSize: 16,
          fontWeight: '700',
          marginBottom: spacing.md,
          textAlign: 'center',
        },
        qrWrap: {
          backgroundColor: '#fff',
          padding: spacing.md,
          borderRadius: borderRadius.md,
          marginBottom: spacing.md,
        },
        codeLabel: {
          color: colors.textMuted,
          fontSize: 12,
          marginBottom: spacing.xs,
        },
        code: {
          color: colors.primaryLight,
          fontSize: 24,
          fontWeight: '800',
          letterSpacing: 6,
          marginBottom: spacing.lg,
        },
      }),
    [colors, borderRadius, cardBorder]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, rtl.textFull]}>{t('kidLoginQrTitle')}</Text>
          <Text style={[styles.hint, rtl.textFull]}>{t('kidLoginQrHint')}</Text>

          {kid ? (
            <Text style={styles.kidLine}>
              {kid.avatar} {kid.displayName} · @{kid.username}
            </Text>
          ) : null}

          {loading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : qrValue ? (
            <View style={styles.qrWrap}>
              <QRCode value={qrValue} size={200} />
            </View>
          ) : (
            <Text style={styles.hint}>{t('kidLoginQrLoadError')}</Text>
          )}

          {inviteCode ? (
            <>
              <Text style={styles.codeLabel}>{t('familyCodeManual')}</Text>
              <Text style={styles.code}>{inviteCode}</Text>
            </>
          ) : null}

          <Button title={t('close')} onPress={onClose} variant="outline" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
