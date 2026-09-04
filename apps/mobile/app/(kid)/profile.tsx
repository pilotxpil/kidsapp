import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { Card, PointsBadge, LevelBar, StreakBadge } from '../../components/Card';
import { Button } from '../../components/Button';
import { ThemePicker } from '../../components/ThemePicker';
import { AvatarPickerModal } from '../../components/AvatarPicker';
import { ThemedScreen } from '../../components/ThemedScreen';
import { AvatarFrame, SectionHeader } from '../../components/ThemedHero';
import { PointsMark } from '../../components/icons/ThemeGlyph';
import { BADGES, BADGE_REWARDS } from '@kidsapp/shared';
import type { KidProfile } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { getThemeArt } from '../../constants/theme-art';
import { useTheme } from '../../lib/theme-context';
import { useType } from '../../lib/typography';
import { rtl } from '../../lib/rtl';
import { isSfxMuted, setSfxMuted, playSfx } from '../../lib/sfx';
import { isBgmMuted, setBgmMuted, startBgm } from '../../lib/bgm';
import { t } from '../../lib/i18n';

export default function KidProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const { colors, borderRadius, cardBorder, pointsEmoji, id: themeId } = useTheme();
  const type = useType();
  const art = getThemeArt(themeId);
  const ember = themeId === 'ember';
  const userId = user?._id;
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg },
        section: { width: '100%', marginTop: spacing.lg },
        stackCard: { marginBottom: spacing.md },
        avatarSection: { alignItems: 'center' },
        name: {
          color: colors.text,
          fontSize: 24,
          fontWeight: '800',
          marginTop: spacing.md,
          marginBottom: spacing.md,
          width: '100%',
          textAlign: 'center',
          ...type.display,
        },
        statsRow: { gap: spacing.md, marginBottom: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
        levelWrap: { width: '100%' },
        sectionHint: {
          color: colors.textMuted,
          fontSize: 13,
          marginBottom: spacing.md,
          width: '100%',
        },
        badgesGrid: { width: '100%', gap: spacing.md },
        badgeCard: { width: '30%', flexGrow: 0, flexShrink: 1, maxWidth: '32%', overflow: 'hidden' },
        badgeInner: { width: '100%', alignItems: 'center' },
        badgeLocked: { opacity: 0.4 },
        badgeIcon: { fontSize: 28, marginBottom: 4, textAlign: 'center' },
        badgeArt: { width: 40, height: 40, marginBottom: 4 },
        badgeLabel: {
          color: colors.text,
          fontSize: 11,
          fontWeight: '600',
          width: '100%',
          textAlign: 'center',
          writingDirection: 'rtl',
          ...type.ui,
        },
        badgeLabelLocked: { color: colors.textMuted },
        lbRow: { alignItems: 'center', gap: spacing.sm },
        lbHighlight: { borderTopColor: colors.primary, borderLeftColor: colors.primary },
        lbRank: { color: colors.gold, fontWeight: '800', fontSize: 16, width: 30, ...type.title },
        lbAvatar: { fontSize: 24 },
        lbHelm: { width: 32, height: 32 },
        lbName: { color: colors.text, flex: 1, fontWeight: '600', minWidth: 0, ...type.heading },
        lbPoints: { color: colors.emerald, fontWeight: '700', ...type.title },
        txRow: { alignItems: 'center', gap: spacing.md },
        txAmount: { fontWeight: '800', fontSize: 16, width: 50, textAlign: 'center' },
        txPositive: { color: colors.success },
        txNegative: { color: colors.danger },
        txInfo: { flex: 1, minWidth: 0 },
        txDesc: { color: colors.text, fontWeight: '600' },
        txDate: { color: colors.textMuted, fontSize: 12 },
        settingsRow: ember
          ? {
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(12,8,6,0.72)',
              borderRadius: 18,
              padding: spacing.md,
              width: '100%',
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.32)',
            }
          : {
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: colors.bgCard,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              width: '100%',
              ...cardBorder(2),
            },
        settingsLabel: { color: colors.text, fontWeight: '600', flex: 1, ...type.body },
        settingsValue: { color: colors.primary, fontWeight: '700', flexShrink: 0, ...type.heading },
        avatarEditBtn: {
          marginTop: spacing.sm,
          marginBottom: spacing.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: borderRadius.full,
          borderWidth: ember ? 1 : 2,
          borderColor: colors.primary,
        },
        avatarEditText: { color: colors.primary, fontWeight: '700', fontSize: 14, ...type.ui },
        settingsStack: { width: '100%', marginTop: spacing.lg, gap: spacing.md },
        logout: { marginTop: spacing.md, marginBottom: spacing.xl },
        badgeModalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        },
        badgeModalCard: ember
          ? {
              backgroundColor: 'rgba(12,8,6,0.94)',
              borderRadius: 24,
              padding: spacing.xl,
              width: '100%',
              maxWidth: 320,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.45)',
            }
          : {
              backgroundColor: colors.bgCard,
              borderRadius: borderRadius.lg,
              padding: spacing.xl,
              width: '100%',
              maxWidth: 320,
              alignItems: 'center',
              ...cardBorder(3),
            },
        badgeModalIcon: { fontSize: 56, marginBottom: spacing.md },
        badgeModalArt: { width: 72, height: 72, marginBottom: spacing.md },
        badgeModalTitle: {
          color: colors.text,
          fontSize: 20,
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: spacing.sm,
          ...type.display,
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
        badgeModalCloseText: { color: colors.primary, fontWeight: '700', fontSize: 16, ...type.heading },
      }),
    [themeId, colors, borderRadius, cardBorder, ember, type.display, type.ui, type.title, type.heading, type.body]
  );

  const load = useCallback(async () => {
    if (!userId) return;
    const [, profileRes, lbRes] = await Promise.all([
      refreshUser(),
      api.getKidProfile(userId),
      api.getLeaderboard(),
    ]);
    setProfile(profileRes.profile);
    setLeaderboard(lbRes.leaderboard);
  }, [userId, refreshUser]);

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
          <TouchableOpacity activeOpacity={0.85} onPress={() => { playSfx('tap'); setAvatarOpen(true); }}>
            <AvatarFrame avatar={user?.avatar ?? '🎮'} size="lg" />
          </TouchableOpacity>
          <Text style={styles.name}>{user?.displayName}</Text>
          <TouchableOpacity
            style={styles.avatarEditBtn}
            onPress={() => { playSfx('tap'); setAvatarOpen(true); }}
          >
            <Text style={styles.avatarEditText}>{t('selectAvatar')}</Text>
          </TouchableOpacity>
          <View style={[styles.statsRow, rtl.row]}>
            <PointsBadge points={profile?.points ?? user?.points ?? 0} />
            <StreakBadge streak={user?.streak || 0} />
          </View>
          {profile && (
            <View style={styles.levelWrap}>
              <LevelBar level={profile.level} progress={profile.xpProgress} max={profile.xpToNextLevel} />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title={t('uiTheme')} icon="🎨" />
          <Text style={[styles.sectionHint, rtl.textFull]}>{t('uiThemeHint')}</Text>
          <ThemePicker />
        </View>

        <View style={styles.section}>
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
                    {ember && art?.gem ? (
                      <Image
                        source={art.gem}
                        style={[styles.badgeArt, !earned && { opacity: 0.35 }]}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.badgeIcon}>{earned ? badge.icon : '🔒'}</Text>
                    )}
                    <Text style={[styles.badgeLabel, !earned && styles.badgeLabelLocked]} numberOfLines={2}>
                      {badge.label}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title={t('leaderboard')} icon="🏆" />
          {leaderboard.map((entry) => (
            <Card
              key={entry._id}
              style={[styles.stackCard, entry._id === user?._id ? styles.lbHighlight : undefined]}
            >
            <View style={[styles.lbRow, rtl.row]}>
              <Text style={styles.lbRank}>#{entry.rank}</Text>
              {ember && art?.icons?.profile ? (
                <Image source={art.icons.profile} style={styles.lbHelm} resizeMode="contain" />
              ) : (
                <Text style={styles.lbAvatar}>{entry.avatar}</Text>
              )}
              <Text style={[styles.lbName, rtl.text]} numberOfLines={1}>
                {entry.displayName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.lbPoints}>{entry.points}</Text>
                {ember ? <PointsMark size={14} /> : <Text style={styles.lbPoints}> {pointsEmoji}</Text>}
              </View>
            </View>
          </Card>
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader title={t('history')} icon="📜" />
          {profile?.recentTransactions?.map((tx) => (
            <Card key={tx._id} style={styles.stackCard}>
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
        </View>

        <View style={styles.settingsStack}>
          <TouchableOpacity style={[styles.settingsRow, rtl.rowBetween]} onPress={toggleSound}>
            <Text style={[styles.settingsLabel, rtl.textFull]}>{t('soundEffects')}</Text>
            <Text style={[styles.settingsValue, rtl.text]}>{soundOn ? t('on') : t('off')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsRow, rtl.rowBetween]} onPress={toggleMusic}>
            <Text style={[styles.settingsLabel, rtl.textFull]}>{t('backgroundMusic')}</Text>
            <Text style={[styles.settingsValue, rtl.text]}>{musicOn ? t('on') : t('off')}</Text>
          </TouchableOpacity>

          <Button title={t('privacyPolicy')} variant="outline" onPress={() => router.push('/privacy')} />
          <Button title={t('logout')} onPress={handleLogout} variant="outline" style={styles.logout} sound={false} />
        </View>
      </ScrollView>

      <Modal visible={!!selectedBadgeData} transparent animationType="fade" onRequestClose={() => setSelectedBadge(null)}>
        <Pressable style={styles.badgeModalOverlay} onPress={() => setSelectedBadge(null)}>
          <Pressable style={styles.badgeModalCard} onPress={(e) => e.stopPropagation()}>
            {ember && art?.gem ? (
              <Image
                source={art.gem}
                style={[styles.badgeModalArt, !selectedEarned && { opacity: 0.4 }]}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.badgeModalIcon}>
                {selectedEarned ? selectedBadgeData!.icon : '🔒'}
              </Text>
            )}
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

      <AvatarPickerModal visible={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </ThemedScreen>
  );
}
