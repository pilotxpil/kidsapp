import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemedScreen } from '../../components/ThemedScreen';
import { AVATARS } from '@kidsapp/shared';
import type { User } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function ParentKidsScreen() {
  const { colors, borderRadius, cardBorder, pointsEmoji, id: themeId } = useTheme();
  const [kids, setKids] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
        header: { marginBottom: spacing.lg },
        title: { color: colors.text, fontSize: 24, fontWeight: '800', flex: 1, minWidth: 0 },
        addBtn: { flexShrink: 0 },
        emptyCard: { marginBottom: spacing.md },
        emptyInner: { alignItems: 'center', padding: spacing.xl, width: '100%' },
        emptyEmoji: { fontSize: 48, marginBottom: spacing.md, textAlign: 'center' },
        emptyText: {
          color: colors.textMuted,
          fontSize: 16,
          textAlign: 'center',
          writingDirection: 'rtl',
          width: '100%',
        },
        kidCard: { marginBottom: spacing.md },
        kidRow: { alignItems: 'center', width: '100%' },
        kidAvatar: { fontSize: 48 },
        kidInfo: { flex: 1, minWidth: 0 },
        kidName: { color: colors.text, fontSize: 20, fontWeight: '800' },
        kidUsername: { color: colors.textMuted },
        kidStats: { gap: spacing.md, marginTop: spacing.sm },
        kidStat: { color: colors.gold, fontWeight: '700' },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        modal: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          maxWidth: 500,
          alignSelf: 'center',
          width: '100%',
          ...cardBorder(2),
        },
        modalTitle: {
          color: colors.text,
          fontSize: 22,
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: spacing.lg,
          writingDirection: 'rtl',
        },
        label: {
          color: colors.text,
          fontSize: 14,
          fontWeight: '600',
          marginBottom: spacing.sm,
          width: '100%',
        },
        avatars: { flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
        avatarBtn: {
          width: 48,
          height: 48,
          borderRadius: borderRadius.md,
          backgroundColor: colors.bgCardLight,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: 'transparent',
        },
        avatarActive: { borderColor: colors.primary },
        avatarEmoji: { fontSize: 24 },
        modalActions: { gap: spacing.sm, marginTop: spacing.md },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    const res = await api.getKids();
    setKids(res.kids);
  }, []);

  useFocusLoad(load);

  const handleCreate = async () => {
    if (!displayName || !username || pin.length < 4) {
      alert('מלא את כל השדות (PIN של 4 ספרות)');
      return;
    }
    setLoading(true);
    try {
      await api.createKid({ displayName, username, pin, avatar });
      setModalVisible(false);
      setDisplayName('');
      setUsername('');
      setPin('');
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedScreen tabs>
      <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
        <View style={[styles.header, rtl.headerSplit]}>
          <Button title={`+ ${t('addKid')}`} onPress={() => setModalVisible(true)} style={styles.addBtn} />
          <Text style={[styles.title, rtl.textFull]}>{t('manageKids')}</Text>
        </View>

        {kids.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyInner}>
              <Text style={styles.emptyEmoji}>👶</Text>
              <Text style={styles.emptyText}>אין פרופילים עדיין</Text>
            </View>
          </Card>
        ) : (
          kids.map((kid) => (
            <Card key={kid._id} style={styles.kidCard}>
              <View style={[styles.kidRow, rtl.row]}>
                <Text style={styles.kidAvatar}>{kid.avatar}</Text>
                <View style={styles.kidInfo}>
                  <Text style={[styles.kidName, rtl.textFull]}>{kid.displayName}</Text>
                  <Text style={[styles.kidUsername, rtl.textFull]}>@{kid.username}</Text>
                  <View style={[styles.kidStats, rtl.row]}>
                    <Text style={styles.kidStat}>{kid.points} {pointsEmoji}</Text>
                    <Text style={styles.kidStat}>רמה {kid.level}</Text>
                    <Text style={styles.kidStat}>🔥 {kid.streak}</Text>
                  </View>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('addKid')}</Text>
            <Input label={t('displayName')} value={displayName} onChangeText={setDisplayName} placeholder="יונתן" />
            <Input
              label={t('username')}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="yonatan"
            />
            <Input
              label={t('pin')}
              value={pin}
              onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
            />

            <Text style={[styles.label, rtl.textFull]}>{t('selectAvatar')}</Text>
            <View style={[styles.avatars, rtl.row]}>
              {AVATARS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.avatarBtn, avatar === a && styles.avatarActive]}
                  onPress={() => setAvatar(a)}
                >
                  <Text style={styles.avatarEmoji}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.modalActions, rtl.row]}>
              <Button title={t('save')} onPress={handleCreate} loading={loading} style={{ flex: 1 }} />
              <Button
                title={t('cancel')}
                onPress={() => setModalVisible(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}
