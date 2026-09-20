import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { RewardCard } from '../../components/RewardCard';
import { PointsBadge, Card } from '../../components/Card';
import { Celebration } from '../../components/Celebration';
import { ThemedScreen } from '../../components/ThemedScreen';
import { SectionHeader } from '../../components/ThemedHero';
import { ProgressBar } from '../../components/ProgressBar';
import { Button } from '../../components/Button';
import { RtlText } from '../../components/RtlText';
import { AvatarShopTeaser } from '../../components/AvatarShopTeaser';
import { sfxForRewardTitle, playSfx, SfxName } from '../../lib/sfx';
import type { Reward, PersonalGoal } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function KidShopScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const { colors, pointsEmoji, sfx: themeSfx, id: themeId } = useTheme();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [goal, setGoal] = useState<PersonalGoal | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [celebrateSfx, setCelebrateSfx] = useState<SfxName>(themeSfx);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
        header: { marginBottom: spacing.sm, alignItems: 'flex-start' },
        empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
        section: { marginTop: spacing.lg, marginBottom: spacing.sm },
        goalCard: { marginBottom: spacing.md },
        goalTitle: { color: colors.text, fontSize: 16, fontWeight: '700', writingDirection: 'rtl' },
        goalMeta: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm, writingDirection: 'rtl' },
        goalPick: { marginTop: spacing.sm },
        goalPickBtn: { marginTop: spacing.xs },
        avatarRow: { marginTop: spacing.lg },
      }),
    [themeId, colors]
  );

  const load = useCallback(async () => {
    const [, res, goalRes] = await Promise.all([
      refreshUser(),
      api.getRewards(),
      api.getPersonalGoal().catch(() => ({ goal: null })),
    ]);
    setRewards(res.rewards);
    setGoal(goalRes.goal);
  }, [refreshUser]);

  useFocusLoad(load, !!user);

  const handleRedeem = (reward: Reward) => {
    Alert.alert(t('confirmRedeem'), `${reward.title} · ${reward.cost} ${themeId === 'ember' ? t('emberFireStones') : pointsEmoji}`, [
      { text: t('no'), style: 'cancel' },
      {
        text: t('yes'),
        onPress: async () => {
          setRedeemingId(reward._id);
          try {
            await api.redeemReward(reward._id);
            setPendingIds((prev) => new Set(prev).add(reward._id));
            await refreshUser();
            setCelebrateSfx(sfxForRewardTitle(reward.title) || themeSfx);
            setCelebrate(true);
          } catch (err: any) {
            Alert.alert('שגיאה', err.message);
            playSfx('error');
          } finally {
            setRedeemingId(null);
          }
        },
      },
    ]);
  };

  const setAsGoal = async (reward: Reward) => {
    try {
      const res = await api.setPersonalGoal(reward._id);
      setGoal(res.goal);
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
    }
  };

  const clearGoal = async () => {
    try {
      await api.setPersonalGoal(null);
      setGoal(null);
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
    }
  };

  const openAvatarShop = () => router.push('/(kid)/avatar-shop');

  return (
    <ThemedScreen tabs>
      <ScrollView
        contentContainerStyle={[styles.scroll, rtl.scrollContent]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={[styles.header, rtl.headerSplit]}>
          <PointsBadge points={user?.points || 0} />
          <View style={{ flex: 1 }}>
            <SectionHeader title={t('shop')} icon="🛒" />
          </View>
        </View>

        {goal ? (
          <Card style={styles.goalCard}>
            <RtlText style={styles.goalTitle}>
              {goal.rewardIcon} {t('personalGoal')}: {goal.rewardTitle}
            </RtlText>
            <ProgressBar progress={goal.progress} />
            <RtlText style={styles.goalMeta}>
              {t('goalProgress')
                .replace('{current}', String(goal.currentPoints))
                .replace('{cost}', String(goal.rewardCost))}
            </RtlText>
            <Button title={t('clearPersonalGoal')} onPress={clearGoal} variant="secondary" style={styles.goalPickBtn} />
          </Card>
        ) : null}

        <RtlText style={[styles.section, { color: colors.text, fontWeight: '700', fontSize: 18 }]}>
          {t('manageRewards')}
        </RtlText>
        {rewards.length === 0 ? (
          <Text style={styles.empty}>{t('noRewards')}</Text>
        ) : (
          rewards.map((reward, i) => (
            <View key={reward._id}>
              <RewardCard
                index={i}
                reward={reward}
                userPoints={user?.points || 0}
                onRedeem={handleRedeem}
                loading={redeemingId === reward._id}
                pending={pendingIds.has(reward._id)}
              />
              <TouchableOpacity onPress={() => setAsGoal(reward)} style={styles.goalPick}>
                <RtlText style={{ color: colors.primaryLight }}>{t('setPersonalGoal')}</RtlText>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.avatarRow}>
          <AvatarShopTeaser onPress={openAvatarShop} />
        </View>
      </ScrollView>

      <Celebration visible={celebrate} sfx={celebrateSfx} message={t('redeemRequest')} onDone={() => setCelebrate(false)} />
    </ThemedScreen>
  );
}
