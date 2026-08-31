import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { Card, PointsBadge, LevelBar, StreakBadge } from '../../components/Card';
import { Button } from '../../components/Button';
import { ThemePicker } from '../../components/ThemePicker';
import { ThemedScreen } from '../../components/ThemedScreen';
import { AvatarFrame, SectionHeader } from '../../components/ThemedHero';
import { BADGES, BADGE_REWARDS } from '@kidsapp/shared';
import type { KidProfile } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { isSfxMuted, setSfxMuted, playSfx } from '../../lib/sfx';
import { isBgmMuted, setBgmMuted, startBgm } from '../../lib/bgm';
import { t } from '../../lib/i18n';

export default function KidProfileScreen() {
  const { user, logout } = useAuth();
  const { colors, borderRadius, cardBorder, pointsEmoji, id: themeId } = useTheme();
  const userId = user?._id;
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg },
        avatarSection: { alignItems: 'center', marginBottom: spacing.lg },
        name: {
          color: colors.text,
          fontSize: 24,
          fontWeight: '800',
          marginTop: spacing.md,
          marginBottom: spacing.md,
          width: '100%',
          textAlign: 'center',
        },
        statsRow: { gap: spacing.md, marginBottom: spacing.md },
        levelWrap: { width: '100%' },
        sectionHint: {
          color: colors.textMuted,
          fontSize: 13,
          marginBottom: spacing.md,
          width: '100%',
        },
        badgesGrid: { width: '100%', gap: spacing.sm },
        badgeCard: { width: '30%', flexGrow: 0, flexShrink: 0 },
        badgeInner: { width: '100%', alignItems: 'center' },
        badgeLocked: { opacity: 0.4 },
        badgeIcon: { fontSize: 28, marginBottom: 4, textAlign: 'center' },
        badgeLabel: {
          color: colors.text,
          fontSize: 11,
          fontWeight: '600',
          width: '100%',
          textAlign: 'center',
          writingDirection: 'rtl',
        },
        badgeLabelLocked: { color: colors.textMuted },
        lbRow: { alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
        lbHighlight: { borderTopColor: colors.primary, borderLeftColor: colors.primary },
        lbRank: { color: colors.gold, fontWeight: '800', fontSize: 16, width: 30 },
        lbAvatar: { fontSize: 24 },
        lbName: { color: colors.text, flex: 1, fontWeight: '600', minWidth: 0 },
        lbPoints: { color: colors.emerald, fontWeight: '700' },
        txRow: { alignItems: 'center', marginBottom: spacing.sm, gap: spacing.md },
        txAmount: { fontWeight: '800', fontSize: 16, width: 50, textAlign: 'center' },
        txPositive: { color: colors.success },
        txNegative: { color: colors.danger },
        txInfo: { flex: 1, minWidth: 0 },
        txDesc: { color: colors.text, fontWeight: '600' },
        txDate: { color: colors.textMuted, fontSize: 12 },
        settingsRow: {
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginTop: spacing.md,
          width: '100%',
          ...cardBorder(2),
        },
        settingsLabel: { color: colors.text, fontWeight: '600', flex: 1 },
        settingsValue: { color: colors.primary, fontWeight: '700', flexShrink: 0 },
        logout: { marginTop: spacing.md, marginBottom: spacing.xl },
        badgeModalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        },
        badgeModalCard: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
          width: '100%',
          maxWidth: 320,
          alignItems: 'center',
          ...cardBorder(3),
        },
        badgeModalIcon: { fontSize: 56, marginBottom: spacing.md },
        badgeModalTitle: {
          color: colors.text,
          fontSize: 20,
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: spacing.sm,
        },
        badgeModalDesc: {
          color: colors.textMuted,
          fontSize: 15,
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: spacing.md,
        },
        badgeModalReward: {
          color: colors.emerald,
          fontSize: 16,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: spacing.md,
        },
        badgeModalLocked: {
          color: colors.gold,
          fontSize: 13,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: spacing.xs,
        },
        badgeModalClose: {
          marginTop: spacing.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.xl,
        },
        badgeModalCloseText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    if (!userId) return;
    const [profileRes, lbRes] = await Promise.all([
      api.getKidProfile(userId),
      api.getLeaderboard(),
    ]);
    setProfile(profileRes.profile);
    setLeaderboard(lbRes.leaderboard);
  }, [userId]);

  useFocusLoad(load, !!userId);

  useEffect(() => {
    setSoundOn(!isSfxMuted());
    setMusicOn(!isBgmMuted());
  }, []);

  const toggleSound = async () => {
    const next = !soundOn;
    setSoundOn(next);
    await setSfxMuted(!next);
    if (next) playSfx('tap');
  };

  const toggleMusic = async () => {
    const next = !musicOn;
    setMusicOn(next);
    await setBgmMuted(!next);
    if (next) void startBgm();
  };

  const handleLogout = async () => {
    await logout();
  };

  const selectedBadgeData = selectedBadge ? BADGES[selectedBadge] : null;
  const selectedEarned = selectedBadge ? user?.badges?.includes(selectedBadge) : false;
  const selectedReward = selectedBadge ? BADGE_REWARDS[selectedBadge] ?? 0 : 0;

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
        <View style={styles.avatarSection}>
          <AvatarFrame avatar={user?.avatar ?? '🎮'} size="lg" />
          <Text style={styles.name}>{user?.displayName}</Text>
          <View style={[styles.statsRow, rtl.row]}>
            <PointsBadge points={user?.points || 0} />
            <StreakBadge streak={user?.streak || 0} />
          </View>
          {profile && (
            <View style={styles.levelWrap}>
              <LevelBar level={profile.level} progress={profile.xpProgress} max={profile.xpToNextLevel} />
            </View>
          )}
        </View>

        <SectionHeader title={t('uiTheme')} icon="🎨" />
        <Text style={[styles.sectionHint, rtl.textFull]}>{t('uiThemeHint')}</Text>
        <ThemePicker />

        <SectionHeader title={t('badges')} icon="🏅" />
        <View style={[styles.badgesGrid, rtl.tabs]}>
          {Object.entries(BADGES).map(([key, badge]) => {
            const earned = user?.badges?.includes(key);
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.75}
                onPress={() => {
                  playSfx('tap');
                  setSelectedBadge(key);
                }}
                style={earned ? styles.badgeCard : [styles.badgeCard, styles.badgeLocked]}
              >
                <Card style={{ width: '100%' }}>
                  <View style={styles.badgeInner}>
                    <Text style={styles.badgeIcon}>{earned ? badge.icon : '🔒'}</Text>
                    <Text style={[styles.badgeLabel, !earned && styles.badgeLabelLocked]}>{badge.label}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionHeader title={t('leaderboard')} icon="🏆" />
        {leaderboard.map((entry) => (
          <Card key={entry._id} style={entry._id === user?._id ? styles.lbHighlight : undefined}>
            <View style={[styles.lbRow, rtl.row]}>
              <Text style={styles.lbRank}>#{entry.rank}</Text>
              <Text style={styles.lbAvatar}>{entry.avatar}</Text>
              <Text style={[styles.lbName, rtl.text]}>{entry.displayName}</Text>
              <Text style={styles.lbPoints}>{entry.points} {pointsEmoji}</Text>
            </View>
          </Card>
        ))}

        <SectionHeader title={t('history')} icon="📜" />
        {profile?.recentTransactions?.map((tx) => (
          <Card key={tx._id}>
            <View style={[styles.txRow, rtl.row]}>
              <View style={styles.txInfo}>
                <Text style={[styles.txDesc, rtl.textFull]}>{tx.description}</Text>
                <Text style={[styles.txDate, rtl.textFull]}>{new Date(tx.createdAt).toLocaleDateString('he-IL')}</Text>
              </View>
              <Text style={[styles.txAmount, tx.amount > 0 ? styles.txPositive : styles.txNegative]}>
                {tx.amount > 0 ? '+' : ''}{tx.amount}
              </Text>
            </View>
          </Card>
        ))}

        <TouchableOpacity style={[styles.settingsRow, rtl.rowBetween]} onPress={toggleSound}>
          <Text style={[styles.settingsLabel, rtl.textFull]}>{t('soundEffects')}</Text>
          <Text style={[styles.settingsValue, rtl.text]}>{soundOn ? t('on') : t('off')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingsRow, rtl.rowBetween]} onPress={toggleMusic}>
          <Text style={[styles.settingsLabel, rtl.textFull]}>{t('backgroundMusic')}</Text>
          <Text style={[styles.settingsValue, rtl.text]}>{musicOn ? t('on') : t('off')}</Text>
        </TouchableOpacity>

        <Button title={t('logout')} onPress={handleLogout} variant="outline" style={styles.logout} sound={false} />
      </ScrollView>

      <Modal visible={!!selectedBadgeData} transparent animationType="fade" onRequestClose={() => setSelectedBadge(null)}>
        <Pressable style={styles.badgeModalOverlay} onPress={() => setSelectedBadge(null)}>
          <Pressable style={styles.badgeModalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.badgeModalIcon}>
              {selectedEarned ? selectedBadgeData!.icon : '🔒'}
            </Text>
            <Text style={styles.badgeModalTitle}>{selectedBadgeData?.label}</Text>
            {!selectedEarned && (
              <Text style={styles.badgeModalLocked}>{t('badgeHowToUnlock')}</Text>
            )}
            <Text style={styles.badgeModalDesc}>{selectedBadgeData?.description}</Text>
            {selectedEarned && selectedReward > 0 && (
              <Text style={styles.badgeModalReward}>
                {t('badgeEarnedXp').replace('{n}', String(selectedReward))}
              </Text>
            )}
            <TouchableOpacity style={styles.badgeModalClose} onPress={() => setSelectedBadge(null)}>
              <Text style={styles.badgeModalCloseText}>{t('close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedScreen>
  );
}
