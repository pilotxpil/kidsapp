import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { PointsBadge, LevelBar } from '../../components/Card';
import { TaskCard } from '../../components/TaskCard';
import { Celebration } from '../../components/Celebration';
import { DailyStar } from '../../components/DailyStar';
import { FortuneWheel } from '../../components/FortuneWheel';
import { TreasureChest } from '../../components/TreasureChest';
import { ThemedScreen } from '../../components/ThemedScreen';
import { ThemedHero, SectionHeader } from '../../components/ThemedHero';
import { FadeInUp } from '../../components/animations/FadeInUp';
import type {
  Task,
  KidProfile,
  DailyStarClaimResult,
  FortuneWheelSpinResult,
  TreasureChestOpenResult,
} from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';
import { useCelebrateBadges } from '../../lib/badge-celebration';

export default function KidHomeScreen() {
  const { user } = useAuth();
  const celebrateBadges = useCelebrateBadges();
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();
  const userId = user?._id;
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [starKey, setStarKey] = useState(0);
  const [chestKey, setChestKey] = useState(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, width: '100%' },
        content: { width: '100%', alignSelf: 'stretch' },
        statsCard: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          marginBottom: spacing.lg,
          ...cardBorder(2),
        },
        statsInner: {
          padding: spacing.lg,
          alignItems: 'center',
        },
        pointsLabel: {
          color: colors.textMuted,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 2,
          marginBottom: spacing.sm,
          width: '100%',
          textAlign: 'center',
        },
        levelSection: { width: '100%', marginTop: spacing.md },
        empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    if (!userId) return;
    const [profileRes, tasksRes] = await Promise.all([
      api.getKidProfile(userId),
      api.getTasks(userId),
    ]);
    setProfile(profileRes.profile);
    setTasks(tasksRes.tasks.slice(0, 5));
  }, [userId]);

  useFocusLoad(load, !!userId);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setStarKey((k) => k + 1);
    setChestKey((k) => k + 1);
    setRefreshing(false);
  };

  const applyPoints = (result: { points: number; level: number; xp: number; streak?: number }) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            points: result.points,
            level: result.level,
            xp: result.xp,
            ...(result.streak != null ? { streak: result.streak } : {}),
          }
        : prev
    );
  };

  const handleStarClaimed = (result: DailyStarClaimResult) => {
    applyPoints(result);
    if (result.newBadges?.length) celebrateBadges(result.newBadges);
  };

  const handleWheelWon = (result: FortuneWheelSpinResult) => {
    applyPoints({ ...result, streak: result.streak });
    if (result.newBadges?.length) celebrateBadges(result.newBadges);
  };

  const handleChestOpened = (result: TreasureChestOpenResult) => {
    applyPoints(result);
    if (result.newBadges?.length) celebrateBadges(result.newBadges);
  };

  const handleComplete = async (task: Task) => {
    setCompletingId(task._id);
    try {
      await api.completeTask(task._id);
      setPendingIds((prev) => new Set(prev).add(task._id));
      setCelebrate(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <ThemedScreen tabs>
      <ScrollView
        contentContainerStyle={[styles.scroll, rtl.scrollContent]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.content}>
          <FadeInUp index={0}>
            <ThemedHero
              displayName={user?.displayName ?? ''}
              avatar={user?.avatar ?? '🎮'}
              streak={profile?.streak ?? user?.streak ?? 0}
              level={profile?.level ?? user?.level}
            />
          </FadeInUp>

          <FadeInUp index={1}>
            <View style={styles.statsCard}>
              <View style={styles.statsInner}>
                <Text style={styles.pointsLabel}>{t('points').toUpperCase()}</Text>
                <PointsBadge points={profile?.points ?? user?.points ?? 0} size="lg" />
                {profile && (
                  <View style={styles.levelSection}>
                    <LevelBar
                      level={profile.level}
                      progress={profile.xpProgress}
                      max={profile.xpToNextLevel}
                    />
                  </View>
                )}
              </View>
            </View>
          </FadeInUp>

          {userId ? (
            <FadeInUp index={2}>
              <TreasureChest kidId={userId} refreshKey={chestKey} onOpened={handleChestOpened} />
            </FadeInUp>
          ) : null}

          <FadeInUp index={3}>
            <SectionHeader title={t('tasks')} icon="📜" />
          </FadeInUp>
          {tasks.length === 0 ? (
            <Text style={styles.empty}>{t('noTasks')}</Text>
          ) : (
            tasks.map((task, i) => (
              <TaskCard
                key={task._id}
                task={task}
                index={i + 4}
                onComplete={handleComplete}
                loading={completingId === task._id}
                pending={pendingIds.has(task._id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {userId ? (
        <>
          <DailyStar
            key={starKey}
            kidId={userId}
            onClaimed={handleStarClaimed}
          />
          <FortuneWheel
            key={`wheel-${starKey}`}
            kidId={userId}
            onWon={handleWheelWon}
          />
        </>
      ) : null}

      <Celebration
        visible={celebrate}
        message={t('taskSubmitted')}
        onDone={() => setCelebrate(false)}
      />
    </ThemedScreen>
  );
}
