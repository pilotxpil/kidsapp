import React, { useState, useCallback, useMemo } from 'react';
import { Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { TaskCard, CategoryTabs } from '../../components/TaskCard';
import { Celebration } from '../../components/Celebration';
import { ThemedScreen } from '../../components/ThemedScreen';
import { SectionHeader } from '../../components/ThemedHero';
import type { Task, TaskCategory } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function KidTasksScreen() {
  const { user } = useAuth();
  const { colors, id: themeId } = useTheme();
  const userId = user?._id;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [category, setCategory] = useState<TaskCategory | 'all'>('all');
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg },
        empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
      }),
    [themeId, colors]
  );

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await api.getTasks(userId);
    setTasks(res.tasks);
  }, [userId]);

  useFocusLoad(load, !!userId);

  const filtered = category === 'all' ? tasks : tasks.filter((tk) => tk.category === category);

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            tintColor={colors.primary}
          />
        }
      >
        <SectionHeader title={t('tasks')} icon="📜" />
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

      <Celebration visible={celebrate} message={t('taskSubmitted')} onDone={() => setCelebrate(false)} />
    </ThemedScreen>
  );
}
