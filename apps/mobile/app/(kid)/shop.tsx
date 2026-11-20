import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { PersonalGoal, Reward } from '@kidsapp/shared';
import { resolvedRewardIcon } from '@kidsapp/shared';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { useTheme } from '../../lib/theme-context';
import { c } from '../../lib/i18n';
import { haptic } from '../../lib/haptics';
import { useErrorHandler } from '../../lib/premium';
import { ScreenCacheKey, readScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { GOLD, INK, WHITE } from '../../constants/themes';
import { ROW } from '../../lib/dir';
import {
  AvatarSticker,
  Coin,
  Dialog,
  EmptyState,
  Icon,
  KidScreen,
  ProgressBar,
  Row,
  SectionTitle,
  Sticker,
  ToyButton,
  Txt,
  formatNum,
} from '../../components/ui';
import { KidSkyTitle } from '../../components/kid/KidSky';
import { RewardBurst } from '../../components/kid/RewardBurst';
import { ShopDailyGifts } from '../../components/ShopDailyGifts';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';
import { SHOP_TEASER_AVATAR_IDS } from '@kidsapp/shared';

type ShopCache = { rewards: Reward[]; goal: PersonalGoal | null };

function RewardTile({
  reward,
  points,
  isGoal,
  onBuy,
  onGoal,
}: {
  reward: Reward;
  points: number;
  isGoal: boolean;
  onBuy: () => void;
  onGoal: () => void;
}) {
  const { world } = useTheme();
  const can = points >= reward.cost;
  const icon = resolvedRewardIcon(reward.title, reward.icon, reward.category);
  return (
    <View style={styles.tileWrap}>
      <Sticker pad={12} color={isGoal ? '#FFF6D6' : WHITE}>
        <View style={{ gap: 8 }}>
          <Pressable
            onPress={onGoal}
            hitSlop={10}
            style={styles.goalStar}
            accessibilityRole="button"
            accessibilityLabel={c.kid.setGoal}
            accessibilityState={{ selected: isGoal }}
          >
            <Icon name="star" size={22} color={isGoal ? GOLD : '#C9C2E0'} stroke={isGoal ? 3 : 2.2} />
          </Pressable>
          <View style={[styles.iconBubble, { backgroundColor: world.accentSoft }]}>
            <Txt size={40} align="center" style={{ lineHeight: 50 }}>
              {icon}
            </Txt>
          </View>
          <Txt v="title" align="center" numberOfLines={2} style={{ minHeight: 44 }}>
            {reward.title}
          </Txt>
          <Row gap={4} justify="center">
            <Coin size={18} />
            <Txt v="title" num>
              {formatNum(reward.cost)}
            </Txt>
          </Row>
          {can ? (
            <ToyButton title={c.kid.buy} variant="gold" size="sm" full onPress={onBuy} sound="coin" />
          ) : (
            <View style={{ gap: 4 }}>
              <ProgressBar value={points / reward.cost} height={12} color={GOLD} />
              <Txt v="tiny" muted align="center" num>
                {c.kid.needMore.replace('{n}', formatNum(reward.cost - points))}
              </Txt>
            </View>
          )}
        </View>
      </Sticker>
    </View>
  );
}

export default function KidShopScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const onError = useErrorHandler();
  const cached = useRef(readScreenCache<ShopCache>(ScreenCacheKey.kidShop)).current;
  const [rewards, setRewards] = useState<Reward[]>(cached?.rewards ?? []);
  const [goal, setGoal] = useState<PersonalGoal | null>(cached?.goal ?? null);
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<Reward | null>(null);
  const [buying, setBuying] = useState(false);
  const [bought, setBought] = useState<Reward | null>(null);

  const load = useCallback(async () => {
    const [, r, g] = await Promise.all([refreshUser(), api.getRewards(), api.getPersonalGoal().catch(() => ({ goal: null }))]);
    setRewards(r.rewards);
    setGoal(g.goal);
    writeScreenCache(ScreenCacheKey.kidShop, { rewards: r.rewards, goal: g.goal });
  }, [refreshUser]);
  const ready = useFocusLoad(load, !!user);
  const points = user?.points ?? 0;

  const buy = async () => {
    if (!confirm) return;
    setBuying(true);
    try {
      await api.redeemReward(confirm._id);
      await refreshUser();
      setBought(confirm);
      setConfirm(null);
    } catch (e) {
      haptic.error();
      onError(e);
    } finally {
      setBuying(false);
    }
  };

  const toggleGoal = async (reward: Reward) => {
    try {
      const isGoal = goal?.rewardId === reward._id;
      const res = await api.setPersonalGoal(isGoal ? null : reward._id);
      haptic.select();
      setGoal(res.goal);
    } catch (e) {
      onError(e);
    }
  };

  const sorted = [...rewards].sort((a, b) => a.cost - b.cost);

  return (
    <KidScreen
      compactSky
      sky={<KidSkyTitle title={c.kid.shopTitle} sub={c.kid.shopSub} points={points} />}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load().catch(() => {});
        setRefreshing(false);
      }}
      overlay={
        <>
          <Dialog
            visible={!!confirm}
            title={confirm ? c.kid.buyTitle.replace('{name}', confirm.title) : ''}
            message={confirm ? c.kid.buyBody.replace('{n}', formatNum(confirm.cost)) : ''}
            confirmLabel={c.kid.buyConfirm}
            loading={buying}
            onConfirm={buy}
            onCancel={() => setConfirm(null)}
          />
          <RewardBurst
            visible={!!bought}
            title={c.kid.yay}
            body={bought ? c.kid.bought.replace('{name}', bought.title) : ''}
            onClose={() => setBought(null)}
          />
        </>
      }
    >
      {user?._id ? <ShopDailyGifts kidId={user._id} refreshing={refreshing} /> : null}

      <Sticker onPress={() => router.push('/(kid)/avatar-shop')} accessibilityLabel={c.kid.avatars} color="#EDE6FF">
        <Row gap={12}>
          <Row>
            {SHOP_TEASER_AVATAR_IDS.slice(0, 3).map((id, i) => (
              <View key={id} style={{ marginHorizontal: i === 0 ? 0 : -7 }}>
                <AvatarSticker avatar={id} size={46} bg={WHITE} />
              </View>
            ))}
          </Row>
          <View style={{ flex: 1 }}>
            <Txt v="title">{c.kid.avatars}</Txt>
            <Txt v="caption" muted>
              {c.kid.avatarsSub}
            </Txt>
          </View>
          <Icon name="forward" size={24} color={INK} stroke={2.6} />
        </Row>
      </Sticker>

      <SectionTitle title={c.kid.rewards} />
      {!ready && !rewards.length ? (
        <ScreenSkeleton cards={2} />
      ) : sorted.length === 0 ? (
        <Sticker>
          <EmptyState title={c.kid.noRewards} body={c.kid.noRewardsBody} mood="think" />
        </Sticker>
      ) : (
        <View style={styles.grid}>
          {sorted.map((r) => (
            <RewardTile
              key={r._id}
              reward={r}
              points={points}
              isGoal={goal?.rewardId === r._id}
              onBuy={() => setConfirm(r)}
              onGoal={() => toggleGoal(r)}
            />
          ))}
        </View>
      )}
    </KidScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: ROW, flexWrap: 'wrap', marginHorizontal: -6 },
  tileWrap: { width: '50%', padding: 6 },
  goalStar: { position: 'absolute', top: -2, left: -2, zIndex: 2 },
  iconBubble: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
