import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { DailyStarClaimResult, FortuneWheelSpinResult, KidProfile, PersonalGoal, Task } from '@kidsapp/shared';
import { FREE_AVATAR_ID } from '@kidsapp/shared';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { useTheme } from '../../lib/theme-context';
import { c } from '../../lib/i18n';
import { useCelebrateBadges } from '../../lib/badge-celebration';
import { ScreenCacheKey, readScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { consumeAvatarGiftUnlocked, isAvatarGiftPending, subscribeAvatarGift } from '../../lib/avatar-gift';
import { INK } from '../../constants/themes';
import {
  Coin,
  EmptyState,
  GiftBox,
  KidScreen,
  ProgressBar,
  Row,
  SectionTitle,
  Sticker,
  ToyButton,
  Txt,
  formatNum,
} from '../../components/ui';
import { KidSkyHeader } from '../../components/kid/KidSky';
import { World3D } from '../../components/kid/World3D';
import { QuestCard } from '../../components/kid/QuestCard';
import { useCompleteTask } from '../../components/kid/CompleteTaskSheet';
import { RewardBurst } from '../../components/kid/RewardBurst';
import { DailyStar } from '../../components/DailyStar';
import { FortuneWheel } from '../../components/FortuneWheel';
import { DailyWord } from '../../components/DailyWord';
import { DailyRiddle } from '../../components/DailyRiddle';
import { AvatarGiftModal } from '../../components/AvatarGiftModal';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';

type HomeCache = { profile: KidProfile; goal: PersonalGoal | null };

function GoalCard({ goal, onShop }: { goal: PersonalGoal | null; onShop: () => void }) {
  const { world } = useTheme();
  if (!goal) {
    return (
      <Sticker onPress={onShop} accessibilityLabel={c.kid.goalPick}>
        <Row gap={12}>
          <GiftBox size={52} color={world.accent} />
          <View style={{ flex: 1 }}>
            <Txt v="title">{c.kid.goalPick}</Txt>
            <Txt v="caption" muted>
              {c.kid.goalPickBody}
            </Txt>
          </View>
        </Row>
      </Sticker>
    );
  }
  const need = Math.max(0, goal.rewardCost - goal.currentPoints);
  return (
    <Sticker onPress={onShop} accessibilityLabel={`${c.kid.goal}: ${goal.rewardTitle}`}>
      <Row gap={12} align="center">
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: world.accentSoft, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={30} align="center">
            {goal.rewardIcon}
          </Txt>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt v="caption" muted>
            {c.kid.goal}
          </Txt>
          <Txt v="title" numberOfLines={1}>
            {goal.rewardTitle}
          </Txt>
          <ProgressBar value={goal.progress / 100} color="#FFC233" />
          <Row gap={4}>
            <Coin size={16} />
            <Txt v="caption" num>
              {need > 0 ? c.kid.goalNeed.replace('{n}', formatNum(need)) : c.kid.goalReady}
            </Txt>
          </Row>
        </View>
      </Row>
    </Sticker>
  );
}

export default function KidHomeScreen() {
  const { user, patchUser, refreshUser } = useAuth();
  const router = useRouter();
  const celebrateBadges = useCelebrateBadges();
  const userId = user?._id;
  const cached = useRef(readScreenCache<HomeCache>(ScreenCacheKey.kidHome)).current;
  const [profile, setProfile] = useState<KidProfile | null>(cached?.profile ?? null);
  const [goal, setGoal] = useState<PersonalGoal | null>(cached?.goal ?? null);
  const [tasks, setTasks] = useState<Task[]>(() => readScreenCache<Task[]>(ScreenCacheKey.kidTasks) ?? []);
  const [refreshing, setRefreshing] = useState(false);
  const [giftKey, setGiftKey] = useState(0);
  const [avatarGift, setAvatarGift] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const knownLevel = useRef<number | null>(user?.level ?? null);
  const level = user?.level ?? 1;

  // Game moment: any level increase while the kid is in the app gets a celebration.
  useEffect(() => {
    if (knownLevel.current != null && level > knownLevel.current) setLevelUp(level);
    knownLevel.current = level;
  }, [level]);

  useEffect(() => {
    const show = () => {
      if (!isAvatarGiftPending()) return;
      consumeAvatarGiftUnlocked();
      setAvatarGift(true);
    };
    show();
    return subscribeAvatarGift(show);
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    const [p, g, t] = await Promise.all([
      api.getKidProfile(userId),
      api.getPersonalGoal().catch(() => ({ goal: null })),
      api.getTasks(userId),
    ]);
    setProfile(p.profile);
    setGoal(g.goal);
    setTasks(t.tasks);
    writeScreenCache(ScreenCacheKey.kidHome, { profile: p.profile, goal: g.goal });
    writeScreenCache(ScreenCacheKey.kidTasks, t.tasks);
    patchUser({
      points: p.profile.points,
      level: p.profile.level,
      xp: p.profile.xp,
      streak: p.profile.streak,
      badges: p.profile.badges,
      learningStreak: p.profile.learningStreak,
    });
  }, [userId, patchUser]);

  const ready = useFocusLoad(load, !!userId);

  const complete = useCompleteTask((id) =>
    setTasks((prev) => prev.map((t) => (t._id === id ? { ...t, completionStatus: 'pending' as const } : t)))
  );

  const applyPoints = (r: { points: number; level: number; xp: number; streak?: number; newBadges?: { id: string; xpAwarded: number }[] }) => {
    patchUser({ points: r.points, level: r.level, xp: r.xp, ...(r.streak != null ? { streak: r.streak } : {}) });
    setProfile((prev) => (prev ? { ...prev, points: r.points, level: r.level, xp: r.xp, ...(r.streak != null ? { streak: r.streak } : {}) } : prev));
    if (r.newBadges?.length) celebrateBadges(r.newBadges);
  };

  const today = useMemo(() => {
    const daily = tasks.filter((t) => t.recurrence === 'daily');
    const list = daily.length ? daily : tasks;
    const done = list.filter((t) => t.completionStatus !== 'available').length;
    const open = tasks
      .filter((t) => (t.completionStatus ?? 'available') === 'available')
      .sort((a, b) => (a.recurrence === 'daily' ? -1 : 0) - (b.recurrence === 'daily' ? -1 : 0))
      .slice(0, 3);
    return { total: list.length, done, open };
  }, [tasks]);

  const points = profile?.points ?? user?.points ?? 0;
  const streak = profile?.streak ?? user?.streak ?? 0;
  const xp = profile?.xp ?? user?.xp ?? 0;

  return (
    <KidScreen
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        try {
          await load();
        } catch {
          // keep showing cached data
        }
        setGiftKey((k) => k + 1);
        setRefreshing(false);
      }}
      sky={
        <View>
          <KidSkyHeader
            points={points}
            streak={streak}
            xp={xp}
            line={user?.heroLine}
            onAvatar={() => router.push('/(kid)/avatar-shop')}
          />
          <World3D height={200} />
        </View>
      }
      overlay={
        userId ? (
          <>
            <DailyStar key={`star-${giftKey}`} kidId={userId} onClaimed={(r: DailyStarClaimResult) => applyPoints(r)} />
            <FortuneWheel key={`wheel-${giftKey}`} kidId={userId} onWon={(r: FortuneWheelSpinResult) => applyPoints(r)} />
            {complete.ui}
            <RewardBurst
              visible={levelUp != null}
              title={`עלית לשלב ${levelUp ?? ''}!`}
              body="כל הכבוד! המשיכו לאסוף XP כדי לפתוח עוד הפתעות."
              mood="cheer"
              onClose={() => setLevelUp(null)}
            />
            <AvatarGiftModal
              visible={avatarGift}
              onSkip={() => setAvatarGift(false)}
              onUse={async () => {
                try {
                  const res = await api.equipCosmetic(FREE_AVATAR_ID);
                  patchUser(res.kid);
                } catch {
                  await refreshUser();
                }
                setAvatarGift(false);
              }}
            />
          </>
        ) : null
      }
    >
      <SectionTitle
        title={c.kid.today}
        action={tasks.length ? c.kid.allTasks : undefined}
        onAction={() => router.push('/(kid)/tasks')}
      />
      {!ready && !tasks.length && !cached ? (
        <ScreenSkeleton cards={2} />
      ) : tasks.length === 0 ? (
        <Sticker>
          <EmptyState title={c.kid.noTasks} body={c.kid.noTasksBody} mood="sleepy" />
        </Sticker>
      ) : (
        <>
          <Sticker pad={14}>
            <View style={{ gap: 8 }}>
              <Row justify="between">
                <Txt v="title">{today.open.length === 0 ? c.kid.todayDone : c.kid.todayProgress.replace('{done}', String(today.done)).replace('{total}', String(today.total))}</Txt>
                <Txt v="h2" num>
                  {today.total ? Math.round((today.done / today.total) * 100) : 0}%
                </Txt>
              </Row>
              <ProgressBar value={today.total ? today.done / today.total : 0} color="#1DBF7F" />
            </View>
          </Sticker>
          {today.open.map((task) => (
            <QuestCard key={task._id} task={task} compact onComplete={complete.start} busy={complete.busyId === task._id} />
          ))}
        </>
      )}

      <SectionTitle title={c.kid.goal} />
      <GoalCard goal={goal} onShop={() => router.push('/(kid)/shop')} />

      {userId ? (
        <View style={{ gap: 14, marginTop: 4 }}>
          <DailyWord kidId={userId} />
          <DailyRiddle kidId={userId} onWon={(r) => applyPoints(r)} />
        </View>
      ) : null}

      {tasks.length > 3 ? (
        <ToyButton title={c.kid.allTasks} variant="secondary" full icon="tasks" onPress={() => router.push('/(kid)/tasks')} />
      ) : null}
    </KidScreen>
  );
}
