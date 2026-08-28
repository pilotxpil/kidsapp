import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { PointsBadge, LevelBar, StreakBadge } from '../../components/Card';
import { TaskCard } from '../../components/TaskCard';
import { Celebration } from '../../components/Celebration';
import { RtlText } from '../../components/RtlText';
import type { Task, KidProfile } from '@kidsapp/shared';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function KidHomeScreen() {
  const { user } = useAuth();
  const userId = user?._id;
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const [profileRes, tasksRes] = await Promise.all([
      api.getKidProfile(userId),
      api.getTasks(userId),
    ]);
    setProfile(profileRes.profile);
    setTasks(tasksRes.tasks.slice(0, 5));
  }, [userId]);

  useFocusLoad(load);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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
    <LinearGradient colors={[colors.bg, '#1a0a2e', colors.bg]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={[styles.scroll, rtl.scrollContent]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <View style={styles.content}>
          <View style={[styles.header, rtl.headerSplit]}>
            <StreakBadge streak={profile?.streak ?? user?.streak ?? 0} />
            <View style={styles.welcomeBlock}>
              <RtlText style={styles.greeting}>{t('welcome')},</RtlText>
              <RtlText style={styles.name}>{user?.avatar} {user?.displayName}</RtlText>
            </View>
          </View>

          <View style={styles.pointsCard}>
            <RtlText style={styles.pointsLabel}>{t('points')}</RtlText>
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

          <RtlText style={styles.sectionTitle}>📋 משימות היום</RtlText>
          {tasks.length === 0 ? (
            <Text style={styles.empty}>{t('noTasks')}</Text>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onComplete={handleComplete}
                loading={completingId === task._id}
                pending={pendingIds.has(task._id)}
              />
            ))
          )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Celebration
        visible={celebrate}
        message={t('taskSubmitted')}
        onDone={() => setCelebrate(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, width: '100%' },
  content: { width: '100%', alignSelf: 'stretch' },
  header: {
    marginBottom: spacing.lg,
  },
  welcomeBlock: {
    flex: 1,
    marginRight: spacing.md,
    alignItems: 'stretch',
  },
  greeting: { color: colors.textMuted, fontSize: 16 },
  name: { color: colors.text, fontSize: 28, fontWeight: '800' },
  pointsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pointsLabel: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.sm, width: '100%' },
  levelSection: { width: '100%', marginTop: spacing.md },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
    width: '100%',
  },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
});
