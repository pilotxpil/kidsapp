import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
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
import { sfxForRewardTitle, playSfx, SfxName } from '../../lib/sfx';
import type { Reward, CosmeticItem, PersonalGoal } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function KidShopScreen() {
  const { user, refreshUser, patchUser } = useAuth();
  const { colors, pointsEmoji, sfx: themeSfx, id: themeId, borderRadius, cardBorder } = useTheme();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [goal, setGoal] = useState<PersonalGoal | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [celebrateSfx, setCelebrateSfx] = useState<SfxName>(themeSfx);
  const [busyCosmetic, setBusyCosmetic] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg },
        header: { marginBottom: spacing.sm, alignItems: 'flex-start' },
        empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
        section: { marginTop: spacing.lg, marginBottom: spacing.sm },
        goalCard: { marginBottom: spacing.md },
        goalTitle: { color: colors.text, fontSize: 16, fontWeight: '700', writingDirection: 'rtl' },
        goalMeta: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm, writingDirection: 'rtl' },
        cosmeticCard: { marginBottom: spacing.sm },
        cosmeticRow: { alignItems: 'center', gap: spacing.md, width: '100%' },
        cosmeticIcon: { fontSize: 36 },
        cosmeticInfo: { flex: 1, minWidth: 0 },
        cosmeticLabel: { color: colors.text, fontWeight: '700', writingDirection: 'rtl' },
        cosmeticCost: { color: colors.gold, marginTop: 2, writingDirection: 'rtl' },
        goalPick: { marginTop: spacing.sm },
        goalPickBtn: { marginTop: spacing.xs },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    const [, res, cos, goalRes] = await Promise.all([
      refreshUser(),
      api.getRewards(),
      api.getCosmetics().catch(() => null),
      api.getPersonalGoal().catch(() => ({ goal: null })),
    ]);
    setRewards(res.rewards);
    if (cos) {
      setCosmetics(cos.items);
      setOwned(cos.owned);
    }
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

  const handleCosmetic = async (item: CosmeticItem) => {
    setBusyCosmetic(item.id);
    try {
      if (owned.includes(item.id)) {
        const res = await api.equipCosmetic(item.id);
        patchUser(res.kid);
      } else {
        const res = await api.buyCosmetic(item.id);
        patchUser(res.kid);
        setOwned((prev) => [...prev, item.id]);
        setCelebrate(true);
      }
      await refreshUser();
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
      playSfx('error');
    } finally {
      setBusyCosmetic(null);
    }
  };

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
            <Text style={styles.goalTitle}>
              {goal.rewardIcon} {t('personalGoal')}: {goal.rewardTitle}
            </Text>
            <ProgressBar progress={goal.progress} />
            <Text style={styles.goalMeta}>
              {t('goalProgress')
                .replace('{current}', String(goal.currentPoints))
                .replace('{cost}', String(goal.rewardCost))}
            </Text>
            <Button title={t('clearPersonalGoal')} onPress={clearGoal} variant="secondary" style={styles.goalPickBtn} />
          </Card>
        ) : null}

        <Text style={[styles.section, { color: colors.text, fontWeight: '700', writingDirection: 'rtl' }]}>
          {t('cosmeticShop')}
        </Text>
        {cosmetics.map((item) => {
          const isOwned = owned.includes(item.id);
          return (
            <Card key={item.id} style={styles.cosmeticCard}>
              <View style={[styles.cosmeticRow, rtl.row]}>
                <Text style={styles.cosmeticIcon}>{item.icon}</Text>
                <View style={styles.cosmeticInfo}>
                  <Text style={styles.cosmeticLabel}>{item.label}</Text>
                  <Text style={styles.cosmeticCost}>
                    {isOwned ? t('ownedCosmetic') : `${item.cost} ${pointsEmoji}`}
                  </Text>
                </View>
                <Button
                  title={isOwned ? t('equipCosmetic') : t('buyCosmetic')}
                  onPress={() => handleCosmetic(item)}
                  loading={busyCosmetic === item.id}
                  variant={isOwned ? 'secondary' : 'primary'}
                />
              </View>
            </Card>
          );
        })}

        <Text style={[styles.section, { color: colors.text, fontWeight: '700', writingDirection: 'rtl' }]}>
          {t('manageRewards')}
        </Text>
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
                <Text style={{ color: colors.primaryLight, textAlign: 'right', writingDirection: 'rtl' }}>
                  {t('setPersonalGoal')}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Celebration visible={celebrate} sfx={celebrateSfx} message={t('redeemRequest')} onDone={() => setCelebrate(false)} />
    </ThemedScreen>
  );
}
