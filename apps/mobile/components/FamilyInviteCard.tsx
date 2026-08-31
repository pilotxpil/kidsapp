import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Share, Alert, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { FamilyInviteInfo } from '@kidsapp/shared';
import { Card } from './Card';
import { Button } from './Button';
import { api } from '../lib/api';
import { useFocusLoad } from '../hooks/useFocusLoad';
import { useTheme } from '../lib/theme-context';
import { spacing } from '../constants/theme';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';

export function FamilyInviteCard() {
  const { colors, borderRadius } = useTheme();
  const [info, setInfo] = useState<FamilyInviteInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getFamilyInvite();
      setInfo(res);
    } catch {
      setInfo(null);
    }
  }, []);

  useFocusLoad(load);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginTop: spacing.lg, marginBottom: spacing.md },
        title: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
        hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
        codeBox: {
          backgroundColor: colors.bg,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          alignItems: 'center',
          marginBottom: spacing.md,
        },
        code: {
          color: colors.primaryLight,
          fontSize: 32,
          fontWeight: '800',
          letterSpacing: 8,
        },
        tapHint: {
          color: colors.textMuted,
          fontSize: 12,
          marginTop: spacing.sm,
        },
        parents: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.md },
        full: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
        actions: { gap: spacing.sm, width: '100%' },
        actionBtn: { flex: 1 },
      }),
    [colors, borderRadius]
  );

  const handleCopy = async () => {
    if (!info?.inviteCode) return;
    try {
      await Clipboard.setStringAsync(info.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert(t('inviteCode'), info.inviteCode);
    }
  };

  const handleShare = async () => {
    if (!info?.inviteCode) return;
    try {
      await Share.share({
        message: `הצטרף/י למשפחה שלנו ב-QUEST!\nקוד הזמנה: ${info.inviteCode}`,
      });
    } catch {
      Alert.alert(t('inviteCode'), info.inviteCode);
    }
  };

  if (!info) return null;

  const parentNames = info.parents.map((p) => p.displayName).join(', ');

  return (
    <Card style={styles.card}>
      <Text style={[styles.title, rtl.textFull]}>{t('familyInvite')}</Text>
      <Text style={[styles.hint, rtl.textFull]}>{t('familyInviteHint')}</Text>

      {info.canInvite ? (
        <>
          <TouchableOpacity style={styles.codeBox} onPress={handleCopy} activeOpacity={0.7}>
            <Text style={styles.code}>{info.inviteCode}</Text>
            <Text style={styles.tapHint}>{copied ? `✓ ${t('inviteCodeCopied')}` : t('tapToCopy')}</Text>
          </TouchableOpacity>
          <Text style={[styles.parents, rtl.textFull]}>
            {t('familyParents')}: {parentNames} ({info.parentCount}/{info.maxParents})
          </Text>
          <View style={[styles.actions, rtl.row]}>
            <Button title={t('copyInviteCode')} onPress={handleCopy} style={styles.actionBtn} />
            <Button
              title={t('shareInviteCode')}
              onPress={handleShare}
              variant="secondary"
              style={styles.actionBtn}
            />
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.parents, rtl.textFull]}>
            {t('familyParents')}: {parentNames} ({info.parentCount}/{info.maxParents})
          </Text>
          <Text style={styles.full}>{t('familyFull')}</Text>
        </>
      )}
    </Card>
  );
}
