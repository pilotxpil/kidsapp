import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { PointsBadge, LevelBar } from '../../components/Card';
import { DailyStar } from '../../components/DailyStar';
import { FortuneWheel } from '../../components/FortuneWheel';
import { AvatarGiftModal } from '../../components/AvatarGiftModal';
import { AvatarZoomModal } from '../../components/AvatarZoomModal';
import { ThemedScreen } from '../../components/ThemedScreen';
import { ThemedHero } from '../../components/ThemedHero';
import { DailyWord } from '../../components/DailyWord';
import { DailyRiddle } from '../../components/DailyRiddle';
import { FadeInUp } from '../../components/animations/FadeInUp';
import { SparkleGem } from '../../components/icons/ThemeGlyph';
import type {
  KidProfile,
  DailyStarClaimResult,
  FortuneWheelSpinResult,
  PersonalGoal,
} from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { getThemeArt } from '../../constants/theme-art';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';
import { useCelebrateBadges } from '../../lib/badge-celebration';
import { ProgressBar } from '../../components/ProgressBar';
import {
  consumeAvatarGiftUnlocked,
  isAvatarGiftPending,
  subscribeAvatarGift,
} from '../../lib/avatar-gift';
import { FREE_AVATAR_ID } from '@kidsapp/shared';

export default function KidHomeScreen() {
  const { user, patchUser, refreshUser } = useAuth();
  const router = useRouter();
  const celebrateBadges = useCelebrateBadges();
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();
  const art = getThemeArt(themeId);
  const userId = user?._id;
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [goal, setGoal] = useState<PersonalGoal | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [starKey, setStarKey] = useState(0);
  const [giftOpen, setGiftOpen] = useState(false);
  const [avatarZoom, setAvatarZoom] = useState(false);

  useEffect(() => {
    const showGift = () => {
      if (!isAvatarGiftPending()) return;
      consumeAvatarGiftUnlocked();
      setGiftOpen(true);
    };
    showGift();
    return subscribeAvatarGift(showGift);
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, paddingTop: spacing.lg, width: '100%' },
        content: { width: '100%', alignSelf: 'stretch' },
        wordSlot: { width: '100%', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.md },
        statsCard: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          marginBottom: spacing.md,
          ...cardBorder(2),
        },
        statsInner: {
          padding: spacing.md,
          alignItems: 'center',
        },
        gemArt: {
          width: 72,
          height: 72,
          marginBottom: spacing.sm,
          backgroundColor: 'transparent',
        },
        pointsLabel: {
          color: colors.textMuted,
          fontSize: 12,
          fontWeight: '700',
          marginBottom: spacing.sm,
          width: '100%',
          textAlign: 'center',
        },
        levelSection: { width: '100%', marginTop: spacing.sm },
        line: { color: colors.textMuted, marginTop: spacing.sm, writingDirection: 'rtl' },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    if (!userId) return;
    const [profileRes, goalRes] = await Promise.all([
      api.getKidProfile(userId),
      api.getPersonalGoal().catch(() => ({ goal: null })),
    ]);
    setProfile(profileRes.profile);
    setGoal(goalRes.goal);
    const p = profileRes.profile;
    patchUser({
      points: p.points,
      level: p.level,
      xp: p.xp,
      streak: p.streak,
      badges: p.badges,
      learningStreak: p.learningStreak,
    });
  }, [userId, patchUser]);

  useFocusLoad(load, !!userId);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setStarKey((k) => k + 1);
    setRefreshing(false);
  };

  const applyPoints = (result: { points: number; level: number; xp: number; streak?: number }) => {
    patchUser({
      points: result.points,
      level: result.level,
      xp: result.xp,
      ...(result.streak != null ? { streak: result.streak } : {}),
    });
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

  const dailyWord = userId ? <DailyWord kidId={userId} /> : null;
  const dailyRiddle = userId ? (
    <DailyRiddle
      kidId={userId}
      onWon={(result) => {
        applyPoints(result);
        if (result.newBadges?.length) celebrateBadges(result.newBadges);
      }}
    />
  ) : null;

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
              tagline={user?.heroLine}
              onAvatarPress={() => setAvatarZoom(true)}
            />
          </FadeInUp>

          {dailyWord || dailyRiddle ? (
            <View style={styles.wordSlot}>
              {dailyWord}
              {dailyRiddle}
            </View>
          ) : null}

          <FadeInUp index={1}>
            <View style={styles.statsCard}>
              <View style={styles.statsInner}>
                {art?.gem ? (
                  themeId === 'minecraft' ? (
                    <SparkleGem source={art.gem} size={72} />
                  ) : (
                    <Image source={art.gem} style={styles.gemArt} resizeMode="contain" />
                  )
                ) : null}
                <Text style={styles.pointsLabel}>
                  {themeId === 'ember' ? t('emberFireStones') : t('points')}
                </Text>
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
                {(profile?.learningStreak ?? user?.learningStreak ?? 0) > 0 ? (
                  <Text style={styles.line}>
                    📚 {t('learningStreak')}: {profile?.learningStreak ?? user?.learningStreak} {t('days')}
                  </Text>
                ) : null}
                {goal ? (
                  <>
                    <Text style={[styles.line, { color: colors.text, fontWeight: '700' }]}>
                      {goal.rewardIcon} {t('personalGoal')}: {goal.rewardTitle}
                    </Text>
                    <ProgressBar progress={goal.progress} />
                  </>
                ) : null}
              </View>
            </View>
          </FadeInUp>
        </View>
      </ScrollView>

      {userId ? (
        <>
          <DailyStar key={starKey} kidId={userId} onClaimed={handleStarClaimed} />
          <FortuneWheel key={`wheel-${starKey}`} kidId={userId} onWon={handleWheelWon} />
        </>
      ) : null}

      <AvatarZoomModal
        visible={avatarZoom}
        avatar={user?.avatar ?? '🎮'}
        onClose={() => setAvatarZoom(false)}
        onShop={() => {
          setAvatarZoom(false);
          router.push('/(kid)/avatar-shop');
        }}
      />
      <AvatarGiftModal
        visible={giftOpen}
        onSkip={() => setGiftOpen(false)}
        onUse={async () => {
          if (!userId) return;
          try {
            const res = await api.equipCosmetic(FREE_AVATAR_ID);
            patchUser(res.kid);
          } catch {
            await api.updateKid(userId, { avatar: FREE_AVATAR_ID });
            await refreshUser();
          }
          setGiftOpen(false);
        }}
      />
    </ThemedScreen>
  );
}
