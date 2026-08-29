import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeScreen } from "../../components/SafeScreen";
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import type { ParentDashboard, TaskCategory } from '@kidsapp/shared';
import { colors, spacing, borderRadius, gradientBg } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';

import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function ParentDashboardScreen() {
  const { user, logout } = useAuth();
  const { categoryIcon } = useTheme();
  const [dashboard, setDashboard] = useState<ParentDashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleLogout = async () => {
    await logout();
  };

  return (
    <LinearGradient colors={[...gradientBg]} style={styles.container}>
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
          <View style={[styles.header, rtl.headerSplit]}>
            <TouchableOpacity onPress={handleLogout}>
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
                <Text style={styles.statNum}>{dashboard.stats.pendingApprovals}</Text>
                <Text style={styles.statLabel}>{t('pendingApprovals')}</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statNum}>{dashboard.stats.totalTasks}</Text>
                <Text style={styles.statLabel}>{t('totalTasks')}</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statNum}>{dashboard.stats.totalRewards}</Text>
                <Text style={styles.statLabel}>{t('totalRewards')}</Text>
              </Card>
            </View>
          )}

          <Text style={[styles.sectionTitle, rtl.text]}>{t('taskApprovals')}</Text>
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
                    <Text style={styles.approvalTitle}>{c.task?.title}</Text>
                    <Text style={styles.approvalKid}>
                      {c.kid?.displayName} · +{c.task?.points} 💎
                    </Text>
                  </View>
                </View>
                <View style={[styles.approvalActions, rtl.row]}>
                  <Button title={t('approve')} onPress={() => handleApproveCompletion(c._id, 'approve')} variant="success" style={styles.approveBtn} />
                  <Button title={t('reject')} onPress={() => handleApproveCompletion(c._id, 'reject')} variant="danger" style={styles.approveBtn} />
                </View>
              </Card>
            ))
          )}

          <Text style={[styles.sectionTitle, rtl.text]}>{t('rewardApprovals')}</Text>
          {dashboard?.pendingRedemptions.length === 0 ? (
            <Text style={styles.empty}>אין בקשות ממתינות</Text>
          ) : (
            dashboard?.pendingRedemptions.map((r) => (
              <Card key={r._id} style={styles.approvalCard}>
                <View style={[styles.approvalHeader, rtl.row]}>
                  <Text style={styles.approvalIcon}>{r.reward?.icon || '📦'}</Text>
                  <View style={styles.approvalInfo}>
                    <Text style={styles.approvalTitle}>{r.reward?.title}</Text>
                    <Text style={styles.approvalKid}>
                      {r.kid?.displayName} · {r.cost} 💎
                    </Text>
                  </View>
                </View>
                <View style={[styles.approvalActions, rtl.row]}>
                  <Button title={t('approve')} onPress={() => handleApproveRedemption(r._id, 'approve')} variant="success" style={styles.approveBtn} />
                  <Button title={t('reject')} onPress={() => handleApproveRedemption(r._id, 'reject')} variant="danger" style={styles.approveBtn} />
                </View>
              </Card>
            ))
          )}

          <Text style={[styles.sectionTitle, rtl.text]}>{t('manageKids')}</Text>
          <View style={[styles.kidsRow, rtl.row]}>
            {dashboard?.kids.map((kid) => (
              <Card key={kid._id} style={styles.kidCard}>
                <Text style={styles.kidAvatar}>{kid.avatar}</Text>
                <Text style={styles.kidName}>{kid.displayName}</Text>
                <Text style={styles.kidPoints}>{kid.points} XP</Text>
                <Text style={styles.kidLevel}>רמה {kid.level}</Text>
              </Card>
            ))}
          </View>
        </ScrollView>
      </SafeScreen>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
  header: { marginBottom: spacing.lg },
  headerText: { flex: 1, marginRight: spacing.md },
  greeting: { color: colors.textMuted, fontSize: 14 },
  name: { color: colors.text, fontSize: 24, fontWeight: '800' },
  logout: { color: colors.danger, fontSize: 14 },
  statsRow: { gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  statCard: { flex: 1, alignItems: 'center', padding: spacing.md },
  statNum: { color: colors.primaryLight, fontSize: 28, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md, marginTop: spacing.md, width: '100%' },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.md },
  approvalCard: { marginBottom: spacing.md },
  approvalHeader: { marginBottom: spacing.md },
  approvalIcon: { fontSize: 32, marginEnd: spacing.md },
  approvalInfo: { flex: 1 },
  approvalTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  approvalKid: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  approvalActions: { gap: spacing.sm },
  approveBtn: { flex: 1 },
  kidsRow: { flexWrap: 'wrap', gap: spacing.sm },
  kidCard: { width: '47%', alignItems: 'center', padding: spacing.md },
  kidAvatar: { fontSize: 40 },
  kidName: { color: colors.text, fontWeight: '700', marginTop: spacing.sm },
  kidPoints: { color: colors.gold, fontWeight: '700', marginTop: 4 },
  kidLevel: { color: colors.textMuted, fontSize: 12 },
});
