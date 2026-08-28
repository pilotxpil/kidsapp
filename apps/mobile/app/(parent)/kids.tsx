import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeScreen } from "../../components/SafeScreen";
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { AVATARS } from '@kidsapp/shared';
import type { User } from '@kidsapp/shared';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function ParentKidsScreen() {
  const [kids, setKids] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);

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
    <LinearGradient colors={[colors.bg, '#0f172a']} style={styles.container}>
      <SafeScreen tabs style={styles.safe}>
        <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
          <View style={[styles.header, rtl.headerSplit]}>
            <Button title={`+ ${t('addKid')}`} onPress={() => setModalVisible(true)} style={styles.addBtn} />
            <Text style={[styles.title, rtl.textFull]}>👶 {t('manageKids')}</Text>
          </View>

          {kids.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>👶</Text>
              <Text style={styles.emptyText}>הוסף את הילד הראשון שלך!</Text>
            </Card>
          ) : (
            kids.map((kid) => (
              <Card key={kid._id} style={[styles.kidCard, rtl.row]}>
                <Text style={styles.kidAvatar}>{kid.avatar}</Text>
                <View style={styles.kidInfo}>
                  <Text style={styles.kidName}>{kid.displayName}</Text>
                  <Text style={styles.kidUsername}>@{kid.username}</Text>
                  <View style={[styles.kidStats, rtl.row]}>
                    <Text style={styles.kidStat}>{kid.points} ⭐</Text>
                    <Text style={styles.kidStat}>רמה {kid.level}</Text>
                    <Text style={styles.kidStat}>🔥 {kid.streak}</Text>
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
              <Input label={t('username')} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="yonatan" />
              <Input label={t('pin')} value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} />

              <Text style={styles.label}>{t('selectAvatar')}</Text>
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
                <Button title={t('cancel')} onPress={() => setModalVisible(false)} variant="outline" style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </Modal>
      </SafeScreen>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
  header: { marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', flex: 1, marginRight: spacing.md },
  addBtn: { paddingHorizontal: spacing.md },
  emptyCard: { alignItems: 'center', padding: spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 16 },
  kidCard: { alignItems: 'center', marginBottom: spacing.md },
  kidAvatar: { fontSize: 48, marginEnd: spacing.md },
  kidInfo: { flex: 1 },
  kidName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  kidUsername: { color: colors.textMuted },
  kidStats: { gap: spacing.md, marginTop: spacing.sm },
  kidStat: { color: colors.gold, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.bgCard, borderRadius: borderRadius.xl, padding: spacing.lg, maxWidth: 500, alignSelf: 'center', width: '100%' },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: spacing.lg },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  avatars: { flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  avatarBtn: { width: 48, height: 48, borderRadius: borderRadius.md, backgroundColor: colors.bgCardLight, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  avatarActive: { borderColor: colors.primary },
  avatarEmoji: { fontSize: 24 },
  modalActions: { gap: spacing.sm, marginTop: spacing.md },
});
