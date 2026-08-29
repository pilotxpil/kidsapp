import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ThemedScreen } from '../../components/ThemedScreen';
import { ThemePicker } from '../../components/ThemePicker';
import { SectionHeader } from '../../components/ThemedHero';
import type { ParentDashboard, TaskCategory } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function ParentDashboardScreen() {
  const { user, logout } = useAuth();
  const { colors, borderRadius, cardBorder, pointsEmoji, categoryIcon, id: themeId } = useTheme();
  const [dashboard, setDashboard] = useState<ParentDashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
        header: { marginBottom: spacing.lg },
        headerText: { flex: 1, minWidth: 0 },
        greeting: { color: colors.textMuted, fontSize: 14 },
        name: { color: colors.text, fontSize: 24, fontWeight: '800' },
        logout: { color: colors.danger, fontSize: 14, fontWeight: '600' },
        statsRow: { gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
        statCard: { flex: 1, minWidth: 90 },
        statInner: { alignItems: 'center', width: '100%' },
        statNum: { color: colors.primaryLight, fontSize: 28, fontWeight: '800', textAlign: 'center' },
        statLabel: {
          color: colors.textMuted,
          fontSize: 11,
          textAlign: 'center',
          marginTop: 4,
          writingDirection: 'rtl',
          width: '100%',
        },
        sectionTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: '700',
          marginBottom: spacing.md,
          marginTop: spacing.md,
          width: '100%',
        },
        empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.md, width: '100%' },
        approvalCard: { marginBottom: spacing.md },
        approvalHeader: { marginBottom: spacing.md, width: '100%', alignItems: 'flex-start' },
        approvalIcon: { fontSize: 32 },
        approvalInfo: { flex: 1, minWidth: 0 },
        approvalTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
        approvalKid: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
        approvalActions: { gap: spacing.sm, width: '100%' },
        approveBtn: { flex: 1 },
        kidsRow: { flexWrap: 'wrap', gap: spacing.sm, width: '100%' },
        kidCard: { width: '47%' },
        kidInner: { alignItems: 'center', width: '100%' },
        kidAvatar: { fontSize: 40, textAlign: 'center' },
        kidName: {
          color: colors.text,
          fontWeight: '700',
          marginTop: spacing.sm,
          textAlign: 'center',
          writingDirection: 'rtl',
          width: '100%',
        },
        kidPoints: { color: colors.gold, fontWeight: '700', marginTop: 4, textAlign: 'center', width: '100%' },
        kidLevel: { color: colors.textMuted, fontSize: 12, textAlign: 'center', width: '100%' },
        sectionHint: {
          color: colors.textMuted,
          fontSize: 13,
          marginBottom: spacing.md,
          width: '100%',
        },
        themeSection: { marginTop: spacing.lg, marginBottom: spacing.md },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    const res = await api.getDashboard();
    setDashboard(res.dashboard);
  }, []);

  useFocusLoad(load);

  const handleApproveCompletion = async (id: string, action: 'approve' | 'reject') => {
    await api.approveCompletion(id, action);
    await load();
  };

  const handleApproveRedemption = async (id: string, action: 'approve' | 'reject') => {
    await api.approveRedemption(id, action);
    await load();
  };

  return (
    <ThemedScreen tabs>
      <ScrollView
        contentContainerStyle={[styles.scroll, rtl.scrollContent]}
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
        <View style={[styles.header, rtl.headerSplit]}>
          <TouchableOpacity onPress={() => logout()}>
            <Text style={styles.logout}>{t('logout')}</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, rtl.textFull]}>{t('dashboard')}</Text>
            <Text style={[styles.name, rtl.textFull]}>{user?.displayName}</Text>
          </View>
        </View>

        {dashboard && (
          <View style={[styles.statsRow, rtl.row]}>
            <Card style={styles.statCard}>
              <View style={styles.statInner}>
                <Text style={styles.statNum}>{dashboard.stats.pendingApprovals}</Text>
                <Text style={styles.statLabel}>{t('pendingApprovals')}</Text>
              </View>
            </Card>
            <Card style={styles.statCard}>
              <View style={styles.statInner}>
                <Text style={styles.statNum}>{dashboard.stats.totalTasks}</Text>
                <Text style={styles.statLabel}>{t('totalTasks')}</Text>
              </View>
            </Card>
            <Card style={styles.statCard}>
              <View style={styles.statInner}>
                <Text style={styles.statNum}>{dashboard.stats.totalRewards}</Text>
                <Text style={styles.statLabel}>{t('totalRewards')}</Text>
              </View>
            </Card>
          </View>
        )}

        <Text style={[styles.sectionTitle, rtl.textFull]}>{t('taskApprovals')}</Text>
        {dashboard?.pendingCompletions.length === 0 ? (
          <Text style={styles.empty}>אין בקשות ממתינות</Text>
        ) : (
          dashboard?.pendingCompletions.map((c) => (
            <Card key={c._id} style={styles.approvalCard}>
              <View style={[styles.approvalHeader, rtl.row]}>
                <Text style={styles.approvalIcon}>
                  {c.task?.category ? categoryIcon(c.task.category as TaskCategory) : '🧱'}
                </Text>
                <View style={styles.approvalInfo}>
                  <Text style={[styles.approvalTitle, rtl.textFull]}>{c.task?.title}</Text>
                  <Text style={[styles.approvalKid, rtl.textFull]}>
                    {c.kid?.displayName} · +{c.task?.points} {pointsEmoji}
                  </Text>
                </View>
              </View>
              <View style={[styles.approvalActions, rtl.row]}>
                <Button
                  title={t('approve')}
                  onPress={() => handleApproveCompletion(c._id, 'approve')}
                  variant="success"
                  style={styles.approveBtn}
                />
                <Button
                  title={t('reject')}
                  onPress={() => handleApproveCompletion(c._id, 'reject')}
                  variant="danger"
                  style={styles.approveBtn}
                />
              </View>
            </Card>
          ))
        )}

        <Text style={[styles.sectionTitle, rtl.textFull]}>{t('rewardApprovals')}</Text>
        {dashboard?.pendingRedemptions.length === 0 ? (
          <Text style={styles.empty}>אין בקשות ממתינות</Text>
        ) : (
          dashboard?.pendingRedemptions.map((r) => (
            <Card key={r._id} style={styles.approvalCard}>
              <View style={[styles.approvalHeader, rtl.row]}>
                <Text style={styles.approvalIcon}>{r.reward?.icon || '📦'}</Text>
                <View style={styles.approvalInfo}>
                  <Text style={[styles.approvalTitle, rtl.textFull]}>{r.reward?.title}</Text>
                  <Text style={[styles.approvalKid, rtl.textFull]}>
                    {r.kid?.displayName} · {r.cost} {pointsEmoji}
                  </Text>
                </View>
              </View>
              <View style={[styles.approvalActions, rtl.row]}>
                <Button
                  title={t('approve')}
                  onPress={() => handleApproveRedemption(r._id, 'approve')}
                  variant="success"
                  style={styles.approveBtn}
                />
                <Button
                  title={t('reject')}
                  onPress={() => handleApproveRedemption(r._id, 'reject')}
                  variant="danger"
                  style={styles.approveBtn}
                />
              </View>
            </Card>
          ))
        )}

        <Text style={[styles.sectionTitle, rtl.textFull]}>{t('manageKids')}</Text>
        <View style={[styles.kidsRow, rtl.row]}>
          {dashboard?.kids.map((kid) => (
            <Card key={kid._id} style={styles.kidCard}>
              <View style={styles.kidInner}>
                <Text style={styles.kidAvatar}>{kid.avatar}</Text>
                <Text style={styles.kidName}>{kid.displayName}</Text>
                <Text style={styles.kidPoints}>{kid.points} XP</Text>
                <Text style={styles.kidLevel}>רמה {kid.level}</Text>
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.themeSection}>
          <SectionHeader title={t('uiTheme')} icon="🎨" />
          <Text style={[styles.sectionHint, rtl.textFull]}>{t('uiThemeHint')}</Text>
          <ThemePicker />
        </View>
      </ScrollView>
    </ThemedScreen>
  );
}
