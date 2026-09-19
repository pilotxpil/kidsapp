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
import { useRouter } from 'expo-router';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { KidAvatar } from '../../components/KidAvatar';
import { ShopAvatarGrid } from '../../components/ShopAvatarGrid';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemedScreen } from '../../components/ThemedScreen';
import { DEFAULT_SHOP_AVATAR_ID, MAX_MANUAL_BONUS_POINTS, GRADE_OPTIONS, formatGradeLabel } from '@kidsapp/shared';
import type { User } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';
import { KidLoginQrModal } from '../../components/KidLoginQrModal';

const BONUS_PRESETS = [10, 20, 50, 100];

export default function ParentKidsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, borderRadius, cardBorder, pointsEmoji, id: themeId } = useTheme();
  const [kids, setKids] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingKid, setEditingKid] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_SHOP_AVATAR_ID);
  const [grade, setGrade] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrKid, setQrKid] = useState<User | null>(null);
  const [bonusKid, setBonusKid] = useState<User | null>(null);
  const [bonusAmount, setBonusAmount] = useState('20');
  const [bonusReason, setBonusReason] = useState('');
  const [bonusLoading, setBonusLoading] = useState(false);
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
        historyBtn: { marginTop: spacing.sm, alignSelf: 'stretch' },
        actionRow: { marginTop: spacing.sm, gap: spacing.sm, width: '100%' },
        actionBtn: { flex: 1 },
        presetRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          justifyContent: 'flex-end',
          marginBottom: spacing.md,
          width: '100%',
        },
        presetChip: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: borderRadius.full,
          backgroundColor: colors.bgCardLight,
          borderWidth: 2,
          borderColor: colors.border,
        },
        presetChipActive: { borderColor: colors.primary },
        presetText: { color: colors.text, fontWeight: '700' },
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
        avatarGrid: { width: '100%', marginBottom: spacing.md },
        gradeChip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.md,
          backgroundColor: colors.bgCardLight,
          borderWidth: 2,
          borderColor: 'transparent',
        },
        gradeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '33' },
        gradeChipText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
        gradeChipTextActive: { color: colors.text },
        hint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm, writingDirection: 'rtl', textAlign: 'right', width: '100%' },
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
    setAvatar(DEFAULT_SHOP_AVATAR_ID);
    setGrade(null);
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
    setAvatar(kid.avatar || DEFAULT_SHOP_AVATAR_ID);
    setGrade(kid.grade ?? null);
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
          grade,
          ...(pin.length > 0 ? { pin } : {}),
        });
        closeModal();
        await load();
      } else {
        const res = await api.createKid({
          displayName: displayName.trim(),
          username: username.trim(),
          pin,
          avatar,
          ...(grade != null ? { grade } : {}),
        });
        closeModal();
        await load();
        setQrKid(res.kid);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  };

  const closeBonusModal = () => {
    setBonusKid(null);
    setBonusAmount('20');
    setBonusReason('');
  };

  const openBonus = (kid: User) => {
    setBonusKid(kid);
    setBonusAmount('20');
    setBonusReason('');
  };

  const handleAwardBonus = async () => {
    if (!bonusKid || bonusLoading) return;
    const amount = Number(bonusAmount);
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_MANUAL_BONUS_POINTS) {
      alert(t('awardBonusInvalid').replace('{max}', String(MAX_MANUAL_BONUS_POINTS)));
      return;
    }
    setBonusLoading(true);
    try {
      await api.awardKidBonus(bonusKid._id, amount, bonusReason.trim() || undefined);
      closeBonusModal();
      await load();
      alert(t('awardBonusSuccess'));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBonusLoading(false);
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
                  {kid.grade ? (
                    <Text style={[styles.kidUsername, rtl.textFull]}>
                      {formatGradeLabel(kid.grade, t('kidGrade'))}
                    </Text>
                  ) : null}
                  <View style={[styles.kidStats, rtl.row]}>
                    <Text style={styles.kidStat}>{kid.points} {pointsEmoji}</Text>
                    <Text style={styles.kidStat}>רמה {kid.level}</Text>
                    <Text style={styles.kidStat}>🔥 {kid.streak}</Text>
                  </View>
                </View>
                <KidAvatar avatar={kid.avatar} size={48} />
                <TouchableOpacity
                  style={styles.qrBtn}
                  onPress={() => setQrKid(kid)}
                  accessibilityLabel={t('showKidLoginQr')}
                >
                  <Text style={styles.qrIcon}>📤</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(kid)}>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.actionRow, rtl.row]}>
                <Button
                  title={t('awardBonus')}
                  style={styles.actionBtn}
                  onPress={() => openBonus(kid)}
                />
                <Button
                  title={t('viewPointsHistory')}
                  variant="outline"
                  style={styles.actionBtn}
                  onPress={() =>
                    router.push({ pathname: '/(parent)/kid-history', params: { kidId: kid._id } })
                  }
                />
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
                autoCorrect={false}
                placeholder="yonatan"
              />
              <Input
                label={editingKid ? t('pinOptional') : t('pin')}
                value={pin}
                onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
              />

              <Text style={styles.label}>{t('kidGrade')}</Text>
              <Text style={styles.hint}>{t('kidGradeHint')}</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.gradeChip, grade === null && styles.gradeChipActive]}
                  onPress={() => setGrade(null)}
                >
                  <Text style={[styles.gradeChipText, grade === null && styles.gradeChipTextActive]}>
                    {t('noGrade')}
                  </Text>
                </TouchableOpacity>
                {GRADE_OPTIONS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.gradeChip, grade === g && styles.gradeChipActive]}
                    onPress={() => setGrade(g)}
                  >
                    <Text style={[styles.gradeChipText, grade === g && styles.gradeChipTextActive]}>
                      {formatGradeLabel(g, t('kidGrade'))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{t('selectAvatar')}</Text>
              <View style={styles.avatarGrid}>
                <ShopAvatarGrid selected={avatar} onSelect={setAvatar} />
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

      <Modal
        visible={!!bonusKid}
        animationType="slide"
        transparent
        onRequestClose={closeBonusModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeBonusModal} />
          <View style={[styles.modal, { maxHeight: modalMaxHeight }]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScroll}
              showsVerticalScrollIndicator
            >
              <Text style={styles.modalTitle}>
                {t('awardBonusTitle')}
                {bonusKid ? ` · ${bonusKid.displayName}` : ''}
              </Text>

              <Text style={styles.label}>{t('awardBonusAmount')}</Text>
              <View style={styles.presetRow}>
                {BONUS_PRESETS.map((n) => {
                  const active = bonusAmount === String(n);
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[styles.presetChip, active && styles.presetChipActive]}
                      onPress={() => setBonusAmount(String(n))}
                    >
                      <Text style={styles.presetText}>
                        +{n} {pointsEmoji}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Input
                value={bonusAmount}
                onChangeText={(v) => setBonusAmount(v.replace(/\D/g, '').slice(0, 3))}
                keyboardType="number-pad"
                placeholder="20"
              />
              <Input
                label={t('awardBonusReason')}
                value={bonusReason}
                onChangeText={setBonusReason}
                placeholder={t('awardBonusReasonPlaceholder')}
              />
            </ScrollView>

            <View style={[styles.modalActions, rtl.row]}>
              <Button
                title={t('awardBonusSubmit')}
                onPress={handleAwardBonus}
                loading={bonusLoading}
                style={{ flex: 1 }}
              />
              <Button
                title={t('cancel')}
                onPress={closeBonusModal}
                variant="outline"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedScreen>
  );
}
