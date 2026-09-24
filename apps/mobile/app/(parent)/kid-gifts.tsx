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
import { KidAvatar } from '../../components/KidAvatar';
import { Button } from '../../components/Button';
import { ThemedScreen } from '../../components/ThemedScreen';
import { SectionHeader } from '../../components/ThemedHero';
import type { Redemption, User } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

function formatWhen(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('he-IL');
}

export default function ParentKidGiftsScreen() {
  const router = useRouter();
  const { kidId: kidIdParam } = useLocalSearchParams<{ kidId?: string }>();
  const { colors, borderRadius, pointsEmoji, id: themeId } = useTheme();

  const [kids, setKids] = useState<User[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  const [gifts, setGifts] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
        backRow: { marginBottom: spacing.md },
        chips: {
          flexDirection: 'row-reverse',
          flexWrap: 'wrap',
          gap: spacing.sm,
          justifyContent: 'flex-start',
          marginBottom: spacing.lg,
          width: '100%',
        },
        chip: {
          flexDirection: 'row-reverse',
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
        giftCard: { marginBottom: spacing.md },
        giftRow: { alignItems: 'flex-start', width: '100%', gap: spacing.md },
        giftIcon: { fontSize: 28, flexShrink: 0 },
        giftInfo: { flex: 1, minWidth: 0 },
        giftTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
        giftMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
        giftUsed: { color: colors.success, fontSize: 13, marginTop: 4, fontWeight: '700' },
        giftWaiting: { color: colors.gold, fontSize: 13, marginTop: 4, fontWeight: '700' },
        markBtn: { marginTop: spacing.sm, alignSelf: 'stretch' },
        loader: { paddingVertical: spacing.xl },
      }),
    [themeId, colors, borderRadius]
  );

  const loadForKid = useCallback(async (kidId: string) => {
    const { redemptions } = await api.getKidGifts(kidId);
    setGifts(redemptions);
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
        setGifts([]);
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
      setGifts([]);
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

  const markUsed = async (id: string) => {
    setMarkingId(id);
    try {
      const { redemption } = await api.markGiftUsed(id);
      setGifts((prev) => prev.map((g) => (g._id === id ? { ...g, ...redemption } : g)));
    } finally {
      setMarkingId(null);
    }
  };

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

        <SectionHeader title={t('kidGifts')} icon="🎁" />

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
                    <KidAvatar avatar={kid.avatar} size={22} />
                    <Text style={[styles.chipName, active && styles.chipNameActive]}>
                      {kid.displayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {loading ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : gifts.length === 0 ? (
              <Text style={styles.empty}>{t('noKidGifts')}</Text>
            ) : (
              gifts.map((gift) => {
                const bought = gift.status === 'approved' || gift.status === 'fulfilled';
                const pending = gift.status === 'pending';
                return (
                  <Card key={gift._id} style={styles.giftCard}>
                    <View style={[styles.giftRow, rtl.row]}>
                      <Text style={styles.giftIcon}>{gift.reward?.icon || '🎁'}</Text>
                      <View style={styles.giftInfo}>
                        <Text style={[styles.giftTitle, rtl.textFull]}>
                          {gift.reward?.title || t('kidGifts')}
                        </Text>
                        <Text style={[styles.giftMeta, rtl.textFull]}>
                          {gift.cost} {pointsEmoji}
                          {bought
                            ? ` · ${t('giftBoughtAt').replace('{date}', formatWhen(gift.reviewedAt || gift.requestedAt))}`
                            : ''}
                        </Text>
                        {pending ? (
                          <Text style={[styles.giftWaiting, rtl.textFull]}>{t('giftPendingApproval')}</Text>
                        ) : gift.usedAt ? (
                          <Text style={[styles.giftUsed, rtl.textFull]}>
                            {t('giftUsedAt').replace('{date}', formatWhen(gift.usedAt))}
                          </Text>
                        ) : (
                          <Text style={[styles.giftWaiting, rtl.textFull]}>{t('giftNotUsed')}</Text>
                        )}
                      </View>
                    </View>
                    {bought && !gift.usedAt ? (
                      <Button
                        title={t('markGiftUsed')}
                        variant="success"
                        style={styles.markBtn}
                        loading={markingId === gift._id}
                        onPress={() => void markUsed(gift._id)}
                      />
                    ) : null}
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </ThemedScreen>
  );
}
