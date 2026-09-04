import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { KidLoginQrModal } from '../../components/KidLoginQrModal';

export default function ParentKidsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, borderRadius, cardBorder, pointsEmoji, id: themeId } = useTheme();
  const [kids, setKids] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingKid, setEditingKid] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [qrKid, setQrKid] = useState<User | null>(null);
  const savingRef = useRef(false);

  const modalMaxHeight = Dimensions.get('window').height - insets.top - insets.bottom - spacing.lg * 2;

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
        kidRow: { alignItems: 'flex-start', width: '100%', gap: spacing.sm },
        kidAvatar: { fontSize: 48 },
        kidInfo: { flex: 1, minWidth: 0 },
        kidName: { color: colors.text, fontSize: 20, fontWeight: '800' },
        kidUsername: { color: colors.textMuted },
        kidStats: { gap: spacing.md, marginTop: spacing.sm },
        kidStat: { color: colors.gold, fontWeight: '700' },
        editBtn: { padding: spacing.xs, flexShrink: 0 },
        editIcon: { fontSize: 20 },
        qrBtn: { padding: spacing.xs, flexShrink: 0 },
        qrIcon: { fontSize: 20 },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        modalBackdrop: { ...StyleSheet.absoluteFill },
        modal: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.xl,
          maxWidth: 500,
          alignSelf: 'center',
          width: '100%',
          overflow: 'hidden',
          ...cardBorder(2),
        },
        modalScroll: { padding: spacing.lg, paddingBottom: spacing.sm },
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
          textAlign: 'right',
          writingDirection: 'rtl',
        },
        chipRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.md,
          justifyContent: 'flex-end',
          width: '100%',
        },
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
        modalActions: {
          gap: spacing.sm,
          padding: spacing.lg,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    const res = await api.getKids();
    setKids(res.kids);
  }, []);

  useFocusLoad(load);

  const resetForm = () => {
    setEditingKid(null);
    setDisplayName('');
    setUsername('');
    setPin('');
    setAvatar(AVATARS[0]);
  };

  const openCreate = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (kid: User) => {
    setEditingKid(kid);
    setDisplayName(kid.displayName);
    setUsername(kid.username ?? '');
    setPin('');
    setAvatar(kid.avatar || AVATARS[0]);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleSave = async () => {
    if (savingRef.current || loading) return;
    if (!displayName.trim() || !username.trim()) {
      alert('מלא שם תצוגה ושם משתמש');
      return;
    }
    if (!editingKid && pin.length < 4) {
      alert('PIN חייב 4 ספרות');
      return;
    }
    if (editingKid && pin.length > 0 && pin.length < 4) {
      alert('PIN חייב 4 ספרות');
      return;
    }

    savingRef.current = true;
    setLoading(true);
    try {
      if (editingKid) {
        await api.updateKid(editingKid._id, {
          displayName: displayName.trim(),
          username: username.trim(),
          avatar,
          ...(pin.length > 0 ? { pin } : {}),
        });
      } else {
        await api.createKid({
          displayName: displayName.trim(),
          username: username.trim(),
          pin,
          avatar,
        });
      }
      closeModal();
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <ThemedScreen tabs>
      <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
        <View style={[styles.header, rtl.headerSplit]}>
          <Button title={`+ ${t('addKid')}`} onPress={openCreate} style={styles.addBtn} />
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
                <View style={styles.kidInfo}>
                  <Text style={[styles.kidName, rtl.textFull]}>{kid.displayName}</Text>
                  <Text style={[styles.kidUsername, rtl.textFull]}>@{kid.username}</Text>
                  <View style={[styles.kidStats, rtl.row]}>
                    <Text style={styles.kidStat}>{kid.points} {pointsEmoji}</Text>
                    <Text style={styles.kidStat}>רמה {kid.level}</Text>
                    <Text style={styles.kidStat}>🔥 {kid.streak}</Text>
                  </View>
                </View>
                <Text style={styles.kidAvatar}>{kid.avatar}</Text>
                <TouchableOpacity style={styles.qrBtn} onPress={() => setQrKid(kid)}>
                  <Text style={styles.qrIcon}>📷</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(kid)}>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View style={[styles.modal, { maxHeight: modalMaxHeight }]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScroll}
              showsVerticalScrollIndicator
            >
              <Text style={styles.modalTitle}>{editingKid ? t('editKid') : t('addKid')}</Text>
              <Input label={t('displayName')} value={displayName} onChangeText={setDisplayName} placeholder="יונתן" />
              <Input
                label={t('username')}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholder="yonatan"
              />
              <Input
                label={editingKid ? t('pinOptional') : t('pin')}
                value={pin}
                onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
              />

              <Text style={styles.label}>{t('selectAvatar')}</Text>
              <View style={styles.chipRow}>
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
            </ScrollView>

            <View style={[styles.modalActions, rtl.row]}>
              <Button title={t('save')} onPress={handleSave} loading={loading} style={{ flex: 1 }} />
              <Button title={t('cancel')} onPress={closeModal} variant="outline" style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <KidLoginQrModal kid={qrKid} visible={!!qrKid} onClose={() => setQrKid(null)} />
    </ThemedScreen>
  );
}
