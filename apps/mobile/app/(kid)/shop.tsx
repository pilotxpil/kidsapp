import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { RewardCard } from '../../components/RewardCard';
import { PointsBadge } from '../../components/Card';
import { Celebration } from '../../components/Celebration';
import { ThemedScreen } from '../../components/ThemedScreen';
import { SectionHeader } from '../../components/ThemedHero';
import { sfxForRewardTitle, playSfx, SfxName } from '../../lib/sfx';
import type { Reward } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function KidShopScreen() {
  const { user, refreshUser } = useAuth();
  const { colors, pointsEmoji, sfx: themeSfx, id: themeId } = useTheme();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [celebrateSfx, setCelebrateSfx] = useState<SfxName>(themeSfx);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg },
        header: { marginBottom: spacing.sm, alignItems: 'flex-start' },
        empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
      }),
    [themeId, colors]
  );

  const load = useCallback(async () => {
    const res = await api.getRewards();
    setRewards(res.rewards);
  }, []);

  useFocusLoad(load, !!user);

  const handleRedeem = (reward: Reward) => {
    Alert.alert(t('confirmRedeem'), `${reward.title} · ${reward.cost} ${pointsEmoji}`, [
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

  return (
    <ThemedScreen tabs>
      <ScrollView
        contentContainerStyle={[styles.scroll, rtl.scrollContent]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
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

        {rewards.length === 0 ? (
          <Text style={styles.empty}>{t('noRewards')}</Text>
        ) : (
          rewards.map((reward, i) => (
            <RewardCard
              key={reward._id}
              index={i}
              reward={reward}
              userPoints={user?.points || 0}
              onRedeem={handleRedeem}
              loading={redeemingId === reward._id}
              pending={pendingIds.has(reward._id)}
            />
          ))
        )}
      </ScrollView>

      <Celebration visible={celebrate} sfx={celebrateSfx} message={t('redeemRequest')} onDone={() => setCelebrate(false)} />
    </ThemedScreen>
  );
}
