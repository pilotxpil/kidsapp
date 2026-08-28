import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeScreen } from "../../components/SafeScreen";
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { TaskCard, CategoryTabs } from '../../components/TaskCard';
import { Celebration } from '../../components/Celebration';
import { RtlText } from '../../components/RtlText';
import { FadeInUp } from '../../components/animations/FadeInUp';
import type { Task, TaskCategory } from '@kidsapp/shared';
import { colors, spacing } from '../../constants/theme';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function KidTasksScreen() {
  const { user } = useAuth();
  const userId = user?._id;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [category, setCategory] = useState<TaskCategory | 'all'>('all');
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await api.getTasks(userId);
    setTasks(res.tasks);
  }, [userId]);

  useFocusLoad(load, !!userId);

  const filtered = category === 'all' ? tasks : tasks.filter((t) => t.category === category);

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
          <FadeInUp index={0}>
            <RtlText style={styles.title}>{t('tasks')}</RtlText>
          </FadeInUp>
          <CategoryTabs selected={category} onSelect={setCategory} />

          {filtered.length === 0 ? (
            <Text style={styles.empty}>{t('noTasks')}</Text>
          ) : (
            filtered.map((task, i) => (
              <TaskCard
                key={task._id}
                task={task}
                index={i}
                onComplete={handleComplete}
                loading={completingId === task._id}
                pending={pendingIds.has(task._id)}
              />
            ))
          )}
        </ScrollView>
      </SafeScreen>

      <Celebration visible={celebrate} message={t('taskSubmitted')} onDone={() => setCelebrate(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: spacing.md, width: '100%' },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
});
