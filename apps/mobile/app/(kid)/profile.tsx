import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeScreen } from "../../components/SafeScreen";
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { Card, PointsBadge, LevelBar, StreakBadge } from '../../components/Card';
import { Button } from '../../components/Button';
import { BADGES } from '@kidsapp/shared';
import type { KidProfile } from '@kidsapp/shared';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { rtl } from '../../lib/rtl';
import { isSfxMuted, setSfxMuted, playSfx } from '../../lib/sfx';
import { t } from '../../lib/i18n';

export default function KidProfileScreen() {
  const { user, logout } = useAuth();
  const userId = user?._id;
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

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
  }, []);

  const toggleSound = async () => {
    const next = !soundOn;
    setSoundOn(next);
    await setSfxMuted(!next);
    if (next) playSfx('tap');
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <LinearGradient colors={[colors.bg, '#0f172a']} style={styles.container}>
      <SafeScreen tabs style={styles.safe}>
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
            <Text style={styles.avatar}>{user?.avatar}</Text>
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

          <Text style={[styles.sectionTitle, rtl.textFull]}>{t('badges')}</Text>
          <View style={[styles.badgesGrid, rtl.row]}>
            {Object.entries(BADGES).map(([key, badge]) => {
              const earned = user?.badges?.includes(key);
              return (
                <Card key={key} style={earned ? styles.badgeCard : [styles.badgeCard, styles.badgeLocked]}>
                  <Text style={styles.badgeIcon}>{earned ? badge.icon : '🔒'}</Text>
                  <Text style={[styles.badgeLabel, !earned && styles.badgeLabelLocked]}>{badge.label}</Text>
                </Card>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, rtl.textFull]}>{t('leaderboard')}</Text>
          {leaderboard.map((entry) => (
            <Card key={entry._id} style={entry._id === user?._id ? [styles.lbRow, styles.lbHighlight, rtl.row] : [styles.lbRow, rtl.row]}>
              <Text style={styles.lbRank}>#{entry.rank}</Text>
              <Text style={styles.lbAvatar}>{entry.avatar}</Text>
              <Text style={styles.lbName}>{entry.displayName}</Text>
              <Text style={styles.lbPoints}>{entry.points} XP</Text>
            </Card>
          ))}

          <Text style={[styles.sectionTitle, rtl.textFull]}>{t('history')}</Text>
          {profile?.recentTransactions?.map((tx) => (
            <Card key={tx._id} style={[styles.txRow, rtl.row]}>
              <View style={styles.txInfo}>
                <Text style={[styles.txDesc, rtl.text]}>{tx.description}</Text>
                <Text style={[styles.txDate, rtl.text]}>{new Date(tx.createdAt).toLocaleDateString('he-IL')}</Text>
              </View>
              <Text style={[styles.txAmount, tx.amount > 0 ? styles.txPositive : styles.txNegative]}>
                {tx.amount > 0 ? '+' : ''}{tx.amount}
              </Text>
            </Card>
          ))}

          <TouchableOpacity style={styles.soundRow} onPress={toggleSound}>
            <Text style={styles.soundLabel}>צלילים</Text>
            <Text style={styles.soundValue}>{soundOn ? 'פועל' : 'כבוי'}</Text>
          </TouchableOpacity>

          <Button title={t('logout')} onPress={handleLogout} variant="outline" style={styles.logout} sound={false} />
        </ScrollView>
      </SafeScreen>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  avatarSection: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: { fontSize: 56, marginBottom: spacing.sm },
  name: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.md },
  statsRow: { gap: spacing.md, marginBottom: spacing.md },
  levelWrap: { width: '100%' },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
    marginTop: spacing.md,
    width: '100%',
  },
  badgesGrid: { flexWrap: 'wrap', gap: spacing.sm },
  badgeCard: { width: '30%', alignItems: 'center', padding: spacing.sm },
  badgeLocked: { opacity: 0.4 },
  badgeIcon: { fontSize: 28, marginBottom: 4 },
  badgeLabel: { color: colors.text, fontSize: 11, textAlign: 'center', fontWeight: '600' },
  badgeLabelLocked: { color: colors.textMuted },
  lbRow: { alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  lbHighlight: { borderColor: colors.primary },
  lbRank: { color: colors.gold, fontWeight: '800', fontSize: 16, width: 30 },
  lbAvatar: { fontSize: 24 },
  lbName: { color: colors.text, flex: 1, fontWeight: '600' },
  lbPoints: { color: colors.gold, fontWeight: '700' },
  txRow: { alignItems: 'center', marginBottom: spacing.sm, gap: spacing.md },
  txAmount: { fontWeight: '800', fontSize: 16, width: 50, textAlign: 'center' },
  txPositive: { color: colors.success },
  txNegative: { color: colors.danger },
  txInfo: { flex: 1 },
  txDesc: { color: colors.text, fontWeight: '600' },
  txDate: { color: colors.textMuted, fontSize: 12 },
  soundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  soundLabel: { color: colors.text, fontWeight: '600' },
  soundValue: { color: colors.primary, fontWeight: '700' },
  logout: { marginTop: spacing.md, marginBottom: spacing.xl },
});
