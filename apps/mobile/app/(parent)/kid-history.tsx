import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ThemedScreen } from '../../components/ThemedScreen';
import { SectionHeader } from '../../components/ThemedHero';
import type { PointTransaction, PointTransactionType, User } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t, type TranslationKey } from '../../lib/i18n';

const TX_TYPE_KEYS: Record<PointTransactionType, TranslationKey> = {
  task: 'txType_task',
  redemption: 'txType_redemption',
  bonus: 'txType_bonus',
  streak: 'txType_streak',
  daily: 'txType_daily',
};

export default function ParentKidHistoryScreen() {
  const router = useRouter();
  const { kidId: kidIdParam } = useLocalSearchParams<{ kidId?: string }>();
  const { colors, borderRadius, cardBorder, pointsEmoji, id: themeId } = useTheme();

  const [kids, setKids] = useState<User[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const selectedRef = useRef<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
        backRow: { marginBottom: spacing.md },
        chips: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          justifyContent: 'flex-end',
          marginBottom: spacing.lg,
          width: '100%',
        },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: borderRadius.full,
          backgroundColor: colors.bgCard,
          borderWidth: 2,
          borderColor: colors.border,
        },
        chipActive: {
          borderColor: colors.primary,
          backgroundColor: colors.bgCardLight,
        },
        chipAvatar: { fontSize: 18 },
        chipName: { color: colors.text, fontWeight: '700', fontSize: 14 },
        chipNameActive: { color: colors.primary },
        empty: {
          color: colors.textMuted,
          textAlign: 'center',
          writingDirection: 'rtl',
          paddingVertical: spacing.xl,
          width: '100%',
        },
        txCard: { marginBottom: spacing.md },
        txRow: { alignItems: 'center', width: '100%', gap: spacing.md },
        txInfo: { flex: 1, minWidth: 0 },
        txDesc: { color: colors.text, fontWeight: '600', fontSize: 15 },
        txMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
        txAmount: { fontWeight: '800', fontSize: 18, flexShrink: 0 },
        txPositive: { color: colors.success },
        txNegative: { color: colors.danger },
        summary: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginBottom: spacing.lg,
          width: '100%',
          ...cardBorder(1),
        },
        summaryText: {
          color: colors.text,
          fontWeight: '700',
          fontSize: 15,
          textAlign: 'right',
          writingDirection: 'rtl',
          width: '100%',
        },
        loader: { paddingVertical: spacing.xl },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const loadForKid = useCallback(async (kidId: string) => {
    const { transactions: txs } = await api.getTransactions(kidId);
    setTransactions(txs);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { kids: list } = await api.getKids();
      setKids(list);

      const fromParam =
        typeof kidIdParam === 'string' && list.some((k) => k._id === kidIdParam)
          ? kidIdParam
          : null;
      const fromPrev =
        selectedRef.current && list.some((k) => k._id === selectedRef.current)
          ? selectedRef.current
          : null;
      const id = fromParam || fromPrev || list[0]?._id || null;

      selectedRef.current = id;
      setSelectedKidId(id);

      if (id) {
        await loadForKid(id);
      } else {
        setTransactions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [kidIdParam, loadForKid]);

  useFocusLoad(load);

  const selectKid = async (id: string) => {
    selectedRef.current = id;
    setSelectedKidId(id);
    setLoading(true);
    try {
      await loadForKid(id);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (!selectedKidId) return;
    setRefreshing(true);
    try {
      await loadForKid(selectedKidId);
    } finally {
      setRefreshing(false);
    }
  };

  const selectedKid = kids.find((k) => k._id === selectedKidId) ?? null;
  const earned = transactions.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const spent = transactions.filter((tx) => tx.amount < 0).reduce((s, tx) => s + tx.amount, 0);

  return (
    <ThemedScreen tabs>
      <ScrollView
        contentContainerStyle={[styles.scroll, rtl.scrollContent]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.backRow}>
          <Button title={t('back')} variant="outline" onPress={() => router.back()} />
        </View>

        <SectionHeader title={t('pointsHistory')} icon="📜" />

        {kids.length === 0 ? (
          <Text style={styles.empty}>{t('noKidsForHistory')}</Text>
        ) : (
          <>
            <View style={styles.chips}>
              {kids.map((kid) => {
                const active = kid._id === selectedKidId;
                return (
                  <TouchableOpacity
                    key={kid._id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => void selectKid(kid._id)}
                  >
                    <Text style={styles.chipAvatar}>{kid.avatar}</Text>
                    <Text style={[styles.chipName, active && styles.chipNameActive]}>
                      {kid.displayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedKid ? (
              <View style={styles.summary}>
                <Text style={styles.summaryText}>
                  {selectedKid.displayName} · {selectedKid.points} {pointsEmoji} · {t('level')}{' '}
                  {selectedKid.level}
                </Text>
                <Text
                  style={[
                    styles.summaryText,
                    { color: colors.textMuted, fontWeight: '600', marginTop: 6 },
                  ]}
                >
                  {t('pointsHistorySummary')
                    .replace('{earned}', `+${earned}`)
                    .replace('{spent}', String(spent))}
                </Text>
              </View>
            ) : null}

            {loading ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : transactions.length === 0 ? (
              <Text style={styles.empty}>{t('noPointTransactions')}</Text>
            ) : (
              transactions.map((tx) => (
                <Card key={tx._id} style={styles.txCard}>
                  <View style={[styles.txRow, rtl.row]}>
                    <View style={styles.txInfo}>
                      <Text style={[styles.txDesc, rtl.textFull]}>{tx.description}</Text>
                      <Text style={[styles.txMeta, rtl.textFull]}>
                        {new Date(tx.createdAt).toLocaleString('he-IL')}
                        {' · '}
                        {t(TX_TYPE_KEYS[tx.type])}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        tx.amount > 0 ? styles.txPositive : styles.txNegative,
                      ]}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount}
                    </Text>
                  </View>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </ThemedScreen>
  );
}
