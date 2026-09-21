import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { PointsBadge } from '../../components/Card';
import { Celebration } from '../../components/Celebration';
import { ThemedScreen } from '../../components/ThemedScreen';
import { SectionHeader } from '../../components/ThemedHero';
import { Button } from '../../components/Button';
import { KidAvatar } from '../../components/KidAvatar';
import { AvatarPreviewModal } from '../../components/AvatarPreviewModal';
import { BouncyPressable } from '../../components/animations/BouncyPressable';
import { playSfx } from '../../lib/sfx';
import type { CosmeticItem } from '@kidsapp/shared';
import { FREE_AVATAR_IDS } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { useType } from '../../lib/typography';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function KidAvatarShopScreen() {
  const { user, refreshUser, patchUser } = useAuth();
  const router = useRouter();
  const { colors, pointsEmoji, id: themeId, borderRadius, cardBorder } = useTheme();
  const type = useType();
  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [busyCosmetic, setBusyCosmetic] = useState<string | null>(null);
  const [preview, setPreview] = useState<CosmeticItem | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg },
        header: { marginBottom: spacing.sm, alignItems: 'flex-start' },
        back: { marginBottom: spacing.md, alignSelf: 'stretch' },
        sectionHint: {
          color: colors.textMuted,
          textAlign: 'right',
          writingDirection: 'rtl',
          marginBottom: spacing.md,
          ...type.body,
        },
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          justifyContent: 'flex-end',
          width: '100%',
        },
        tile: {
          width: '31%',
          alignItems: 'center',
          padding: spacing.sm,
        },
        label: {
          color: colors.text,
          fontWeight: '700',
          fontSize: 11,
          textAlign: 'center',
          marginTop: spacing.xs,
          ...type.ui,
        },
        cost: { color: colors.gold, fontSize: 11, fontWeight: '800', marginTop: 2, ...type.ui },
        costLocked: { color: colors.textMuted },
        rentalBadge: { color: colors.accent, fontSize: 11, fontWeight: '800', marginTop: 2, ...type.ui },
      }),
    [themeId, colors, type.ui, type.body]
  );

  const load = useCallback(async () => {
    const [, cos] = await Promise.all([refreshUser(), api.getCosmetics().catch(() => null)]);
    if (cos) {
      setCosmetics(
        [...cos.items].filter((item) => item.type === 'avatar').sort((a, b) => a.cost - b.cost)
      );
      setOwned(cos.owned);
    }
  }, [refreshUser]);

  useFocusLoad(load, !!user);

  const ownedSet = useMemo(
    () =>
      new Set<string>([
        ...FREE_AVATAR_IDS,
        ...owned,
        ...(user?.ownedCosmetics ?? []),
        ...(user?.rentalAvatar ? [user.rentalAvatar] : []),
      ]),
    [owned, user?.ownedCosmetics, user?.rentalAvatar]
  );
  const ownedItems = useMemo(
    () => cosmetics.filter((item) => ownedSet.has(item.id)),
    [cosmetics, ownedSet]
  );
  const forSale = useMemo(
    () => cosmetics.filter((item) => item.cost > 0 && !ownedSet.has(item.id)),
    [cosmetics, ownedSet]
  );

  const handleCosmetic = async (item: CosmeticItem) => {
    const canAfford = (user?.points || 0) >= item.cost;
    const isOwned = ownedSet.has(item.id);
    if (!isOwned && !canAfford) {
      playSfx('error');
      return;
    }
    setBusyCosmetic(item.id);
    try {
      if (isOwned) {
        const res = await api.equipCosmetic(item.id);
        patchUser(res.kid);
      } else {
        const res = await api.buyCosmetic(item.id);
        patchUser(res.kid);
        setOwned((prev) => [...prev, item.id]);
        setCelebrate(true);
      }
      setPreview(null);
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
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
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
        <Button title={t('back')} variant="outline" onPress={() => router.back()} style={styles.back} />
        <View style={[styles.header, rtl.headerSplit]}>
          <PointsBadge points={user?.points || 0} />
          <View style={{ flex: 1 }}>
            <SectionHeader title={t('cosmeticShop')} icon="🎭" />
          </View>
        </View>

        {ownedItems.length > 0 ? (
          <>
            <SectionHeader title={t('ownedAvatars')} icon="⭐" />
            <Text style={styles.sectionHint}>{t('ownedAvatarsHint')}</Text>
            <View style={styles.grid}>
              {ownedItems.map((item) => {
                  const equipped = user?.avatar === item.id;
                  const rentalOnly =
                    user?.rentalAvatar === item.id && !(user?.ownedCosmetics ?? []).includes(item.id);
                  return (
                    <BouncyPressable
                      key={item.id}
                      onPress={() => {
                        setPreview(item);
                      }}
                      style={[
                        styles.tile,
                        {
                          backgroundColor: colors.bgCard,
                          borderRadius: borderRadius.md,
                          ...cardBorder(equipped ? 2 : 1),
                          borderColor: equipped ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {busyCosmetic === item.id ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                      ) : (
                        <KidAvatar avatar={item.id} size={64} />
                      )}
                      <Text numberOfLines={1} style={styles.label}>
                        {item.label}
                      </Text>
                      <Text style={rentalOnly ? styles.rentalBadge : styles.cost}>
                        {rentalOnly
                          ? t('shopDailyRentalBadge')
                          : equipped
                            ? t('avatarEquipped')
                            : t('freeToChoose')}
                      </Text>
                    </BouncyPressable>
                  );
                })}
            </View>
          </>
        ) : null}

        <SectionHeader title={t('paidAvatars')} icon="🛒" />
        <View style={styles.grid}>
          {forSale.map((item) => {
              const canAfford = (user?.points || 0) >= item.cost;
              return (
                <BouncyPressable
                  key={item.id}
                  onPress={() => {
                    setPreview(item);
                  }}
                  style={[
                    styles.tile,
                    {
                      backgroundColor: colors.bgCard,
                      borderRadius: borderRadius.md,
                      ...cardBorder(1),
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {busyCosmetic === item.id ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <KidAvatar avatar={item.id} size={64} />
                  )}
                  <Text numberOfLines={1} style={styles.label}>
                    {item.label}
                  </Text>
                  <Text style={[styles.cost, !canAfford && styles.costLocked]}>
                    {item.cost} {pointsEmoji}
                  </Text>
                </BouncyPressable>
              );
            })}
        </View>
      </ScrollView>

      <AvatarPreviewModal
        item={preview}
        visible={!!preview}
        owned={preview ? ownedSet.has(preview.id) : false}
        equipped={preview ? user?.avatar === preview.id : false}
        canAfford={preview ? (user?.points || 0) >= preview.cost : false}
        pointsLabel={pointsEmoji}
        loading={preview ? busyCosmetic === preview.id : false}
        onClose={() => setPreview(null)}
        onConfirm={() => {
          if (preview) void handleCosmetic(preview);
        }}
      />
      <Celebration visible={celebrate} sfx="complete" message={t('ownedCosmetic')} onDone={() => setCelebrate(false)} />
    </ThemedScreen>
  );
}
