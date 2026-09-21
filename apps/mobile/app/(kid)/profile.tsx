import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, Modal, Pressable, Image, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { Card, PointsBadge, LevelBar, StreakBadge } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemePicker } from '../../components/ThemePicker';
import { AudioSettings } from '../../components/AudioSettings';
import { AvatarPickerModal } from '../../components/AvatarPicker';
import { ThemedScreen } from '../../components/ThemedScreen';
import { KeyboardScroll } from '../../components/KeyboardSheet';
import { AvatarFrame, SectionHeader } from '../../components/ThemedHero';
import { KidAvatar } from '../../components/KidAvatar';
import { AppVersionLabel } from '../../components/AppVersionLabel';
import { PointsMark } from '../../components/icons/ThemeGlyph';
import { BADGES, BADGE_REWARDS, MAX_HERO_LINE, UI_THEME_IDS } from '@kidsapp/shared';
import type { KidProfile } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { getThemeArt } from '../../constants/theme-art';
import { THEMES } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';
import { useType } from '../../lib/typography';
import { rtl } from '../../lib/rtl';
import { playSfx } from '../../lib/sfx';
import { t } from '../../lib/i18n';

/** Kid leaderboard stays in code; hide until we want siblings to compare. */
const SHOW_KID_LEADERBOARD = false;

export default function KidProfileScreen() {
  const { user, logout, refreshUser, patchUser } = useAuth();
  const router = useRouter();
  const { colors, borderRadius, cardBorder, pointsEmoji, id: themeId, heroTagline } = useTheme();
  const type = useType();
  const art = getThemeArt(themeId);
  const ember = themeId === 'ember';
  const userId = user?._id;
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [heroLine, setHeroLine] = useState(user?.heroLine ?? '');
  const [heroSaving, setHeroSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const historySectionY = useRef(0);

  const HISTORY_PREVIEW = 5;
  const allTransactions = profile?.recentTransactions ?? [];
  const visibleTransactions = historyExpanded
    ? allTransactions
    : allTransactions.slice(0, HISTORY_PREVIEW);
  const hasMoreHistory = allTransactions.length > HISTORY_PREVIEW;

  const toggleHistoryExpanded = () => {
    playSfx('tap');
    const collapsing = historyExpanded;
    setHistoryExpanded(!historyExpanded);
    if (collapsing) {
      // Content shortens; keep the history section on screen so collapse is visible.
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, historySectionY.current - spacing.md),
          animated: true,
        });
      });
    }
  };

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
        badgesGrid: {
          width: '100%',
          flexDirection: 'row-reverse',
          flexWrap: 'wrap',
          rowGap: spacing.sm,
        },
        badgeCard: {
          width: '33.333%',
          paddingHorizontal: spacing.xs,
          paddingBottom: spacing.sm,
          flexGrow: 0,
          flexShrink: 0,
          overflow: 'hidden',
        },
        badgeCardInner: {
          width: '100%',
          minHeight: 96,
          justifyContent: 'center',
        },
        badgeInner: {
          width: '100%',
          alignItems: 'center',
          justifyContent: 'flex-start',
          minHeight: 72,
        },
        badgeLocked: { opacity: 0.4 },
        badgeIcon: { fontSize: 28, marginBottom: 4, textAlign: 'center', height: 32, lineHeight: 32 },
        badgeArt: { width: 40, height: 40, marginBottom: 4 },
        badgeLabel: {
          color: colors.text,
          fontSize: 11,
          fontWeight: '600',
          width: '100%',
          height: 28,
          lineHeight: 14,
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
        chipWrap: {
          width: '100%',
          flexDirection: 'row-reverse',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.md,
        },
        chip: {
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: borderRadius.md,
          borderWidth: ember ? 1 : 2,
          borderColor: colors.primary,
          backgroundColor: ember ? 'rgba(12,8,6,0.72)' : colors.bgCard,
        },
        chipOn: {
          backgroundColor: colors.primary,
        },
        chipText: { color: colors.text, fontWeight: '700', fontSize: 12, ...type.ui },
        chipTextOn: { color: ember ? '#1A0A06' : colors.bgDeep },
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
      SHOW_KID_LEADERBOARD ? api.getLeaderboard() : Promise.resolve({ leaderboard: [] }),
    ]);
    setProfile(profileRes.profile);
    setLeaderboard(lbRes.leaderboard);
  }, [userId, refreshUser]);

  useFocusLoad(load, !!userId);

  useEffect(() => {
    setHeroLine(user?.heroLine ?? '');
  }, [user?.heroLine]);

  const saveHeroLine = async (next: string) => {
    const line = next.trim().slice(0, MAX_HERO_LINE);
    setHeroLine(line);
    setHeroSaving(true);
    try {
      const { user: updated } = await api.updateMe({ heroLine: line });
      patchUser({ heroLine: updated.heroLine });
      playSfx('tap');
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
    } finally {
      setHeroSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const selectedBadgeData = selectedBadge ? BADGES[selectedBadge] : null;
  const selectedEarned = selectedBadge ? user?.badges?.includes(selectedBadge) : false;
  const selectedReward = selectedBadge ? BADGE_REWARDS[selectedBadge] ?? 0 : 0;

  return (
    <ThemedScreen tabs>
      <KeyboardScroll
        ref={scrollRef}
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
          <SectionHeader title={t('heroLine')} icon="💬" />
          <Text style={[styles.sectionHint, rtl.textFull]}>{t('heroLineHint')}</Text>
          <Text style={[styles.sectionHint, rtl.textFull]}>{t('heroLinePresets')}</Text>
          <View style={styles.chipWrap}>
            {[heroTagline, ...UI_THEME_IDS.map((id) => THEMES[id].heroTagline).filter((line) => line !== heroTagline)].map(
              (line) => {
                const on = (heroLine.trim() || heroTagline) === line;
                return (
                  <Pressable
                    key={line}
                    onPress={() => {
                      playSfx('tap');
                      void saveHeroLine(line);
                    }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{line}</Text>
                  </Pressable>
                );
              }
            )}
          </View>
          <Input
            label={t('heroLine')}
            value={heroLine}
            onChangeText={(text) => setHeroLine(text.slice(0, MAX_HERO_LINE))}
            placeholder={t('heroLinePlaceholder')}
            maxLength={MAX_HERO_LINE}
          />
          <Button
            title={t('saveHeroLine')}
            onPress={() => void saveHeroLine(heroLine)}
            loading={heroSaving}
          />
        </View>

        <AudioSettings />

        <View style={styles.section}>
          <SectionHeader title={t('badges')} icon="🏅" />
          <View style={styles.badgesGrid}>
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
                <Card style={styles.badgeCardInner}>
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
                    <Text
                      style={[styles.badgeLabel, !earned && styles.badgeLabelLocked]}
                      numberOfLines={2}
                    >
                      {badge.label}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
          </View>
        </View>

        {SHOW_KID_LEADERBOARD ? (
        <View style={styles.section}>
          <SectionHeader title={t('leaderboard')} icon="🏆" />
          {leaderboard.map((entry) => (
            <Card
              key={entry._id}
              style={[styles.stackCard, entry._id === user?._id ? styles.lbHighlight : undefined]}
            >
            <View style={[styles.lbRow, rtl.row]}>
              <Text style={styles.lbRank}>#{entry.rank}</Text>
              <KidAvatar avatar={entry.avatar ?? '🎮'} size={32} />
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
        ) : null}

        <View
          style={styles.section}
          onLayout={(e) => {
            historySectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <SectionHeader title={t('history')} icon="📜" />
          {allTransactions.length === 0 ? (
            <Text style={[styles.sectionHint, rtl.textFull]}>{t('historyEmpty')}</Text>
          ) : (
            <>
              {hasMoreHistory ? (
                <Button
                  title={historyExpanded ? t('showLessHistory') : t('showMoreHistory')}
                  variant="outline"
                  onPress={toggleHistoryExpanded}
                  style={{ marginBottom: spacing.md }}
                  sound={false}
                />
              ) : null}
              {visibleTransactions.map((tx) => (
                <Card key={tx._id} style={styles.stackCard}>
                  <View style={[styles.txRow, rtl.row]}>
                    <View style={styles.txInfo}>
                      <Text style={[styles.txDesc, rtl.textFull]}>{tx.description}</Text>
                      <Text style={[styles.txDate, rtl.textFull]}>
                        {new Date(tx.createdAt).toLocaleDateString('he-IL')}
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
              ))}
              {hasMoreHistory && historyExpanded ? (
                <Button
                  title={t('showLessHistory')}
                  variant="outline"
                  onPress={toggleHistoryExpanded}
                  sound={false}
                />
              ) : null}
            </>
          )}
        </View>

        <View style={styles.settingsStack}>
          <Button title={t('privacyPolicy')} variant="outline" onPress={() => router.push('/privacy')} />
          <Button title={t('logout')} onPress={handleLogout} variant="outline" style={styles.logout} sound={false} />
          <AppVersionLabel />
        </View>
      </KeyboardScroll>

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

      <AvatarPickerModal
        visible={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        mode="kid"
        onOpenShop={() => router.push('/(kid)/avatar-shop')}
      />
    </ThemedScreen>
  );
}
