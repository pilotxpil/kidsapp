import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { REWARD_CATEGORIES } from '@kidsapp/shared';
import type { Reward, RewardCategory } from '@kidsapp/shared';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

const DEFAULT_REWARDS = [
  { title: '80 Robux', icon: '🎮', cost: '500', category: 'gaming' as RewardCategory },
  { title: 'Brawl Stars Gems', icon: '💎', cost: '400', category: 'gaming' as RewardCategory },
  { title: 'Minecraft Coins', icon: '⛏️', cost: '350', category: 'gaming' as RewardCategory },
  { title: 'הזמנת פיצה', icon: '🍕', cost: '800', category: 'food' as RewardCategory },
  { title: '30 דק מסך', icon: '📱', cost: '150', category: 'screen' as RewardCategory },
];

export default function ParentRewardsScreen() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('100');
  const [category, setCategory] = useState<RewardCategory>('gaming');
  const [icon, setIcon] = useState('🎁');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await api.getRewards();
    setRewards(res.rewards);
  }, []);

  useFocusLoad(load);

  const handleCreate = async () => {
    if (!title) return;
    setLoading(true);
    try {
      await api.createReward({ title, description, cost: parseInt(cost) || 100, category, icon });
      setModalVisible(false);
      setTitle('');
      setDescription('');
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteReward(id);
    await load();
  };

  const applyTemplate = (tpl: typeof DEFAULT_REWARDS[0]) => {
    setTitle(tpl.title);
    setIcon(tpl.icon);
    setCost(tpl.cost);
    setCategory(tpl.category);
    setModalVisible(true);
  };

  const categories = Object.entries(REWARD_CATEGORIES) as [RewardCategory, { label: string; icon: string }][];

  return (
    <LinearGradient colors={[colors.bg, '#0f172a']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
          <View style={[styles.header, rtl.headerSplit]}>
            <Button title={`+ ${t('addReward')}`} onPress={() => setModalVisible(true)} style={styles.addBtn} />
            <Text style={[styles.title, rtl.textFull]}>🎁 {t('manageRewards')}</Text>
          </View>

          <Text style={[styles.subtitle, rtl.text]}>תבניות מהירות:</Text>
          <View style={[styles.templates, rtl.row]}>
            {DEFAULT_REWARDS.map((tpl) => (
              <TouchableOpacity key={tpl.title} style={styles.template} onPress={() => applyTemplate(tpl)}>
                <Text style={styles.templateIcon}>{tpl.icon}</Text>
                <Text style={styles.templateText}>{tpl.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {rewards.map((reward) => {
            const cat = REWARD_CATEGORIES[reward.category];
            return (
              <Card key={reward._id} style={styles.rewardCard}>
                <View style={[styles.rewardRow, rtl.row]}>
                  <TouchableOpacity onPress={() => handleDelete(reward._id)}>
                    <Text style={styles.delete}>🗑️</Text>
                  </TouchableOpacity>
                  <View style={styles.rewardInfo}>
                    <Text style={styles.rewardTitle}>{reward.icon} {reward.title}</Text>
                    <Text style={styles.rewardMeta}>{cat.label} • {reward.cost} ⭐</Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </ScrollView>

        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{t('addReward')}</Text>
              <Input label={t('title')} value={title} onChangeText={setTitle} />
              <Input label={t('description')} value={description} onChangeText={setDescription} />
              <Input label={t('cost')} value={cost} onChangeText={setCost} keyboardType="number-pad" />

              <Text style={styles.label}>{t('category')}</Text>
              <View style={[styles.chips, rtl.row]}>
                {categories.map(([key, val]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.chip, category === key && styles.chipActive]}
                    onPress={() => { setCategory(key); setIcon(val.icon); }}
                  >
                    <Text style={styles.chipText}>{val.icon} {val.label}</Text>
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
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
  header: { marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', flex: 1, marginRight: spacing.md },
  addBtn: { paddingHorizontal: spacing.md },
  subtitle: { color: colors.textMuted, marginBottom: spacing.sm, width: '100%' },
  templates: { flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  template: { backgroundColor: colors.bgCard, padding: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center', width: '30%', borderWidth: 1, borderColor: colors.border },
  templateIcon: { fontSize: 24 },
  templateText: { color: colors.text, fontSize: 11, textAlign: 'center', marginTop: 4 },
  rewardCard: { marginBottom: spacing.sm },
  rewardRow: { alignItems: 'center' },
  delete: { fontSize: 20, marginEnd: spacing.md },
  rewardInfo: { flex: 1 },
  rewardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  rewardMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.bgCard, borderRadius: borderRadius.xl, padding: spacing.lg, maxWidth: 500, alignSelf: 'center', width: '100%' },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: spacing.lg },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  chips: { flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.bgCardLight, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  modalActions: { gap: spacing.sm, marginTop: spacing.md },
});
