import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ThemedScreen } from '../../components/ThemedScreen';
import { ThemePicker } from '../../components/ThemePicker';
import { FamilyInviteCard } from '../../components/FamilyInviteCard';
import { AvatarPickerModal } from '../../components/AvatarPicker';
import { SectionHeader } from '../../components/ThemedHero';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function ParentProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, maxWidth: 600, alignSelf: 'center', width: '100%' },
        avatarSection: { alignItems: 'center', marginBottom: spacing.lg },
        avatar: { fontSize: 72, textAlign: 'center' },
        avatarBtn: {
          marginTop: spacing.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: borderRadius.full,
          borderWidth: 2,
          borderColor: colors.primary,
        },
        avatarBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
        form: { marginBottom: spacing.lg },
        emailRow: {
          backgroundColor: colors.bgCardLight,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginBottom: spacing.md,
          width: '100%',
          ...cardBorder(1),
        },
        emailLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4, textAlign: 'right', width: '100%' },
        emailValue: { color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'right', width: '100%' },
        inviteSection: { marginBottom: spacing.lg },
        themeSection: { marginTop: spacing.md, marginBottom: spacing.lg },
        hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md, width: '100%' },
        logout: { marginTop: spacing.md, marginBottom: spacing.xl },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const handleSave = async () => {
    const name = displayName.trim();
    if (!name) {
      Alert.alert('שגיאה', 'יש להזין שם תצוגה');
      return;
    }
    setSaving(true);
    try {
      await api.updateMe({ displayName: name });
      await refreshUser();
      Alert.alert(t('profileSaved'));
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedScreen tabs>
      <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
        <SectionHeader title={t('profile')} icon="🛡️" />

        <View style={styles.avatarSection}>
          <Text style={styles.avatar}>{user?.avatar ?? '👨‍👩‍👧‍👦'}</Text>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => setAvatarOpen(true)}>
            <Text style={[styles.avatarBtnText, rtl.textCenter]}>{t('selectAvatar')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Input label={t('displayName')} value={displayName} onChangeText={setDisplayName} placeholder="אבא" />
          {user?.email ? (
            <View style={styles.emailRow}>
              <Text style={styles.emailLabel}>{t('email')}</Text>
              <Text style={styles.emailValue}>{user.email}</Text>
            </View>
          ) : null}
          <Button title={t('saveProfile')} onPress={handleSave} loading={saving} />
        </View>

        <View style={styles.inviteSection}>
          <FamilyInviteCard />
        </View>

        <View style={styles.themeSection}>
          <SectionHeader title={t('uiTheme')} icon="🎨" />
          <Text style={[styles.hint, rtl.textFull]}>{t('uiThemeHint')}</Text>
          <ThemePicker />
        </View>

        <Button title={t('privacyPolicy')} variant="outline" onPress={() => router.push('/privacy')} />
        <Button title={t('logout')} onPress={logout} variant="danger" style={styles.logout} />
      </ScrollView>

      <AvatarPickerModal visible={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </ThemedScreen>
  );
}
