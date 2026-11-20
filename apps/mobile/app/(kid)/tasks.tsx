import React, { useCallback, useMemo, useState } from 'react';
import type { Task } from '@kidsapp/shared';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { c } from '../../lib/i18n';
import { ScreenCacheKey, readScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { EmptyState, KidScreen, SectionTitle, Sticker } from '../../components/ui';
import { KidSkyTitle } from '../../components/kid/KidSky';
import { QuestCard } from '../../components/kid/QuestCard';
import { useCompleteTask } from '../../components/kid/CompleteTaskSheet';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';

export default function KidTasksScreen() {
  const { user } = useAuth();
  const userId = user?._id;
  const [tasks, setTasks] = useState<Task[]>(() => readScreenCache<Task[]>(ScreenCacheKey.kidTasks) ?? []);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await api.getTasks(userId);
    setTasks(res.tasks);
    writeScreenCache(ScreenCacheKey.kidTasks, res.tasks);
  }, [userId]);
  const ready = useFocusLoad(load, !!userId);

  const complete = useCompleteTask((id) =>
    setTasks((prev) => prev.map((t) => (t._id === id ? { ...t, completionStatus: 'pending' as const } : t)))
  );

  const groups = useMemo(() => {
    const byDaily = (a: Task, b: Task) => (a.recurrence === 'daily' ? -1 : 0) - (b.recurrence === 'daily' ? -1 : 0);
    return {
      todo: tasks.filter((t) => (t.completionStatus ?? 'available') === 'available').sort(byDaily),
      pending: tasks.filter((t) => t.completionStatus === 'pending'),
      done: tasks.filter((t) => t.completionStatus === 'completed'),
    };
  }, [tasks]);

  return (
    <KidScreen
      compactSky
      sky={<KidSkyTitle title={c.kid.tasksTitle} sub={tasks.length ? c.kid.todayProgress.replace('{done}', String(groups.pending.length + groups.done.length)).replace('{total}', String(tasks.length)) : undefined} points={user?.points ?? 0} />}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load().catch(() => {});
        setRefreshing(false);
      }}
      overlay={complete.ui}
    >
      {!ready && !tasks.length ? (
        <ScreenSkeleton cards={3} />
      ) : tasks.length === 0 ? (
        <Sticker>
          <EmptyState title={c.kid.noTasks} body={c.kid.noTasksBody} mood="sleepy" />
        </Sticker>
      ) : (
        <>
          {groups.todo.length ? <SectionTitle title={c.kid.toDo} count={groups.todo.length} /> : null}
          {groups.todo.map((t) => (
            <QuestCard key={t._id} task={t} onComplete={complete.start} busy={complete.busyId === t._id} />
          ))}
          {groups.pending.length ? <SectionTitle title={c.kid.pending} /> : null}
          {groups.pending.map((t) => (
            <QuestCard key={t._id} task={t} />
          ))}
          {groups.done.length ? <SectionTitle title={c.kid.finished} /> : null}
          {groups.done.map((t) => (
            <QuestCard key={t._id} task={t} compact />
          ))}
        </>
      )}
    </KidScreen>
  );
}
