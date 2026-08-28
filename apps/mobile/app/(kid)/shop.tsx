import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { RewardCard } from '../../components/RewardCard';
import { PointsBadge } from '../../components/Card';
import { Celebration } from '../../components/Celebration';
import type { Reward } from '@kidsapp/shared';
import { colors, spacing } from '../../constants/theme';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function KidShopScreen() {
  const { user, refreshUser } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.getRewards();
    setRewards(res.rewards);
  }, []);

  useFocusLoad(load);

  const handleRedeem = (reward: Reward) => {
    Alert.alert(t('confirmRedeem'), `${reward.title} - ${reward.cost} ⭐`, [
      { text: t('no'), style: 'cancel' },
      {
        text: t('yes'),
        onPress: async () => {
          setRedeemingId(reward._id);
          try {
            await api.redeemReward(reward._id);
            setPendingIds((prev) => new Set(prev).add(reward._id));
            await refreshUser();
            setCelebrate(true);
          } catch (err: any) {
            Alert.alert('שגיאה', err.message);
          } finally {
            setRedeemingId(null);
          }
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={[colors.bg, '#1a0a2e']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
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
            <Text style={[styles.title, rtl.textFull]}>🛒 {t('shop')}</Text>
          </View>

          {rewards.length === 0 ? (
            <Text style={styles.empty}>{t('noRewards')}</Text>
          ) : (
            rewards.map((reward) => (
              <RewardCard
                key={reward._id}
                reward={reward}
                userPoints={user?.points || 0}
                onRedeem={handleRedeem}
                loading={redeemingId === reward._id}
                pending={pendingIds.has(reward._id)}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <Celebration visible={celebrate} message={t('redeemRequest')} onDone={() => setCelebrate(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  header: {
    marginBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', flex: 1, marginRight: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
});
