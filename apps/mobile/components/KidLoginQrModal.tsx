import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Share,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { buildKidLoginShareLink, KID_LOGIN_WEB_ORIGIN } from '@kidsapp/shared';
import type { User } from '@kidsapp/shared';
import { Button } from './Button';
import { KidAvatar } from './KidAvatar';
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

function shareOrigin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return KID_LOGIN_WEB_ORIGIN;
}

function kidLoginShareMessage(
  link: string,
  inviteCode: string,
  username: string,
  displayName: string
) {
  return (
    `היי ${displayName}! כניסה מהירה ל-QUEST:\n` +
    `${link}\n\n` +
    `שם משתמש: ${username}\n` +
    `קוד משפחה: ${inviteCode}\n` +
    `הזינו את ה-PIN שקיבלתם מההורה.`
  );
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

  const loginLink =
    kid && inviteCode && kid.username
      ? buildKidLoginShareLink(inviteCode, kid.username, kid.displayName, shareOrigin())
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
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          marginBottom: spacing.md,
          width: '100%',
        },
        kidLineText: {
          color: colors.primaryLight,
          fontSize: 16,
          fontWeight: '700',
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
          marginBottom: spacing.md,
        },
        actions: { gap: spacing.sm, width: '100%', marginBottom: spacing.sm },
      }),
    [colors, borderRadius, cardBorder]
  );

  const shareMessage = () => {
    if (!loginLink || !inviteCode || !kid?.username) return null;
    return kidLoginShareMessage(loginLink, inviteCode, kid.username, kid.displayName);
  };

  const handleCopyLink = async () => {
    const msg = shareMessage();
    if (!msg || !loginLink) return;
    try {
      await Clipboard.setStringAsync(loginLink);
      Alert.alert(t('kidLoginLinkCopied'));
    } catch {
      Alert.alert(t('kidLoginLink'), loginLink);
    }
  };

  const handleShare = async () => {
    const msg = shareMessage();
    if (!msg) return;
    try {
      await Share.share({ message: msg });
    } catch {
      if (loginLink) Alert.alert(t('kidLoginLink'), loginLink);
    }
  };

  const handleWhatsApp = async () => {
    const msg = shareMessage();
    if (!msg) return;
    const text = encodeURIComponent(msg);
    const url =
      Platform.OS === 'web' ? `https://wa.me/?text=${text}` : `whatsapp://send?text=${text}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (can || Platform.OS === 'web') {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://wa.me/?text=${text}`);
      }
    } catch {
      if (loginLink) Alert.alert(t('kidLoginLink'), loginLink);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, rtl.textFull]}>{t('kidLoginQrTitle')}</Text>
          <Text style={[styles.hint, rtl.textFull]}>{t('kidLoginQrHint')}</Text>

          {kid ? (
            <View style={[styles.kidLine, rtl.row]}>
              <KidAvatar avatar={kid.avatar} size={28} />
              <Text style={[styles.kidLineText, rtl.text]}>
                {kid.displayName} · @{kid.username}
              </Text>
            </View>
          ) : null}

          {loading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : loginLink ? (
            <View style={styles.qrWrap}>
              <QRCode value={loginLink} size={200} />
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

          {loginLink ? (
            <View style={styles.actions}>
              <Button title={t('shareWhatsApp')} onPress={() => void handleWhatsApp()} />
              <Button
                title={t('shareKidLoginLink')}
                onPress={() => void handleShare()}
                variant="secondary"
              />
              <Button
                title={t('copyKidLoginLink')}
                onPress={() => void handleCopyLink()}
                variant="outline"
              />
            </View>
          ) : null}

          <Button title={t('close')} onPress={onClose} variant="outline" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
