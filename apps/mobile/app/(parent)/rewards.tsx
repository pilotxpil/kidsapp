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
import { REWARD_CATEGORIES, REWARD_TEMPLATES } from '@kidsapp/shared';
import type { Reward, RewardCategory, RewardTemplate } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

const DEFAULT_REWARDS = REWARD_TEMPLATES;

export default function ParentRewardsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, borderRadius, cardBorder, pointsEmoji, id: themeId } = useTheme();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('100');
  const [category, setCategory] = useState<RewardCategory>('gaming');
  const [icon, setIcon] = useState('🎁');
  const [loading, setLoading] = useState(false);
  const savingRef = useRef(false);

  const modalMaxHeight = Dimensions.get('window').height - insets.top - insets.bottom - spacing.lg * 2;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
        header: { marginBottom: spacing.md },
        title: { color: colors.text, fontSize: 24, fontWeight: '800', flex: 1, minWidth: 0 },
        addBtn: { flexShrink: 0 },
        subtitle: { color: colors.textMuted, marginBottom: spacing.sm, width: '100%' },
        templates: { flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
        template: {
          backgroundColor: colors.bgCard,
          padding: spacing.sm,
          borderRadius: borderRadius.md,
          alignItems: 'center',
          width: '30%',
          borderWidth: 1,
          borderColor: colors.border,
        },
        templateIcon: { fontSize: 24, textAlign: 'center' },
        templateText: {
          color: colors.text,
          fontSize: 11,
          textAlign: 'center',
          marginTop: 4,
          writingDirection: 'rtl',
          width: '100%',
        },
        templateDesc: {
          color: colors.textMuted,
          fontSize: 9,
          textAlign: 'center',
          marginTop: 2,
          writingDirection: 'rtl',
          width: '100%',
        },
        rewardCard: { marginBottom: spacing.sm },
        rewardRow: { alignItems: 'flex-start', width: '100%', gap: spacing.sm },
        actions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexShrink: 0 },
        actionIcon: { fontSize: 20 },
        rewardInfo: { flex: 1, minWidth: 0 },
        rewardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
        rewardMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
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
        chip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          backgroundColor: colors.bgCardLight,
          borderWidth: 1,
          borderColor: colors.border,
        },
        chipContent: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        chipIcon: { fontSize: 13 },
        chipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
        chipText: { color: colors.text, fontSize: 13, textAlign: 'right', writingDirection: 'rtl' },
        chipTextActive: { color: colors.text, fontWeight: '700' },
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
    const res = await api.getRewards();
    setRewards(res.rewards);
  }, []);

  useFocusLoad(load);

  const resetForm = () => {
    setEditingReward(null);
    setTitle('');
    setDescription('');
    setCost('100');
    setCategory('gaming');
    setIcon('🎁');
  };

  const openCreate = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (reward: Reward) => {
    setEditingReward(reward);
    setTitle(reward.title);
    setDescription(reward.description);
    setCost(String(reward.cost));
    setCategory(reward.category);
    setIcon(reward.icon);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleSave = async () => {
    if (savingRef.current || loading) return;
    if (!title.trim()) return;

    savingRef.current = true;
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description,
        cost: parseInt(cost) || 100,
        category,
        icon,
      };
      if (editingReward) {
        await api.updateReward(editingReward._id, payload);
      } else {
        await api.createReward(payload);
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

  const handleDelete = async (id: string) => {
    await api.deleteReward(id);
    await load();
  };

  const applyTemplate = (tpl: RewardTemplate) => {
    setEditingReward(null);
    setTitle(tpl.title);
    setDescription(tpl.description);
    setIcon(tpl.icon);
    setCost(String(tpl.cost));
    setCategory(tpl.category);
    setModalVisible(true);
  };

  const categories = Object.entries(REWARD_CATEGORIES) as [RewardCategory, { label: string; icon: string }][];

  return (
    <ThemedScreen tabs>
      <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
        <View style={[styles.header, rtl.headerSplit]}>
          <Button title={`+ ${t('addReward')}`} onPress={openCreate} style={styles.addBtn} />
          <Text style={[styles.title, rtl.textFull]}>{t('manageRewards')}</Text>
        </View>

        <Text style={[styles.subtitle, rtl.textFull]}>תבניות מהירות:</Text>
        <View style={[styles.templates, rtl.row]}>
          {DEFAULT_REWARDS.map((tpl) => (
            <TouchableOpacity key={tpl.title} style={styles.template} onPress={() => applyTemplate(tpl)}>
              <Text style={styles.templateIcon}>{tpl.icon}</Text>
              <Text style={styles.templateText}>{tpl.title}</Text>
              <Text style={styles.templateDesc}>{tpl.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {rewards.map((reward) => {
          const cat = REWARD_CATEGORIES[reward.category];
          return (
            <Card key={reward._id} style={styles.rewardCard}>
              <View style={[styles.rewardRow, rtl.row]}>
                <View style={styles.rewardInfo}>
                  <Text style={[styles.rewardTitle, rtl.textFull]}>
                    {reward.icon} {reward.title}
                  </Text>
                  <Text style={[styles.rewardMeta, rtl.textFull]}>
                    {cat.label} · {reward.cost} {pointsEmoji}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => openEdit(reward)}>
                    <Text style={styles.actionIcon}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(reward._id)}>
                    <Text style={styles.actionIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        })}
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
              <Text style={styles.modalTitle}>{editingReward ? t('editReward') : t('addReward')}</Text>
              <Input label={t('title')} value={title} onChangeText={setTitle} />
              <Input label={t('description')} value={description} onChangeText={setDescription} />
              <Input label={t('cost')} value={cost} onChangeText={setCost} keyboardType="number-pad" />

              <Text style={styles.label}>{t('category')}</Text>
              <View style={styles.chipRow}>
                {categories.map(([key, val]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.chip, category === key && styles.chipActive]}
                    onPress={() => {
                      setCategory(key);
                      setIcon(val.icon);
                    }}
                  >
                    <View style={styles.chipContent}>
                      <Text style={styles.chipIcon}>{val.icon}</Text>
                      <Text style={[styles.chipText, category === key && styles.chipTextActive]}>
                        {val.label}
                      </Text>
                    </View>
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
    </ThemedScreen>
  );
}
