import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { FamilyTaskTemplate, Task, User } from '@kidsapp/shared';
import { TASK_RECURRENCE, displayTaskIcon } from '@kidsapp/shared';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { useErrorHandler } from '../../lib/premium';
import { loadParentTasksSnapshot } from '../../lib/prefetch-tabs';
import { ScreenCacheKey, readScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { haptic } from '../../lib/haptics';
import { INK } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';
import {
  AvatarSticker,
  CalmScreen,
  ChoiceChip,
  Coin,
  Dialog,
  EmptyState,
  Pill,
  Row,
  Sticker,
  ToyButton,
  Txt,
  toast,
} from '../../components/ui';
import { TaskEditor, emptyDraft, type TaskDraft } from '../../components/parent/TaskEditor';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';

type Snap = Awaited<ReturnType<typeof loadParentTasksSnapshot>>;

type Group = {
  key: string;
  ids: string[];
  assignedTo: string[];
  task: Task;
};

function groupTasks(tasks: Task[]): Group[] {
  const map = new Map<string, Group>();
  for (const t of tasks) {
    const key = [t.title, t.description, t.category, t.points, t.recurrence, t.icon, t.learningPackId ?? ''].join('|');
    const g = map.get(key);
    if (g) {
      g.ids.push(t._id);
      if (!g.assignedTo.includes(t.assignedTo)) g.assignedTo.push(t.assignedTo);
    } else {
      map.set(key, { key, ids: [t._id], assignedTo: [t.assignedTo], task: t });
    }
  }
  return [...map.values()];
}

export default function ParentTasksScreen() {
  const params = useLocalSearchParams<{ new?: string }>();
  const router = useRouter();
  const { world } = useTheme();
  const onError = useErrorHandler();
  const cached = readScreenCache<Snap>(ScreenCacheKey.parentTasks);
  const [tasks, setTasks] = useState<Task[]>(cached?.tasks ?? []);
  const [kids, setKids] = useState<User[]>(cached?.kids ?? []);
  const [templates, setTemplates] = useState<FamilyTaskTemplate[]>(cached?.familyTemplates ?? []);
  const [packs, setPacks] = useState<{ id: string; title: string }[]>(cached?.learningPacks ?? []);
  const [filter, setFilter] = useState<string>('all');
  const [editor, setEditor] = useState<{ group: Group | null; draft: TaskDraft } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Group | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const snap = await loadParentTasksSnapshot();
    setTasks(snap.tasks);
    setKids(snap.kids);
    setTemplates(snap.familyTemplates);
    setPacks(snap.learningPacks);
    writeScreenCache(ScreenCacheKey.parentTasks, snap);
  }, []);
  const ready = useFocusLoad(load);

  const openNew = useCallback(() => {
    if (!kids.length) {
      toast('קודם מוסיפים ילד/ה במסך "משפחה"', 'info');
      router.push('/(parent)/kids');
      return;
    }
    setEditor({ group: null, draft: emptyDraft(filter !== 'all' ? kids.filter((k) => k._id === filter) : kids) });
  }, [kids, filter, router]);

  useEffect(() => {
    if (params.new && ready && kids.length) {
      openNew();
      router.setParams({ new: undefined });
    }
  }, [params.new, ready, kids.length, openNew, router]);

  const groups = useMemo(() => {
    const visible = filter === 'all' ? tasks : tasks.filter((t) => t.assignedTo === filter);
    return groupTasks(visible);
  }, [tasks, filter]);
  const kidById = useMemo(() => new Map(kids.map((k) => [k._id, k])), [kids]);

  const save = async (d: TaskDraft) => {
    setSaving(true);
    const payload = {
      title: d.title,
      description: d.description,
      points: d.points,
      category: d.category,
      recurrence: d.recurrence,
      icon: d.icon,
      learningPackId: d.learningPackId,
    };
    try {
      const g = editor?.group;
      if (g) {
        const byKid = new Map(g.ids.map((id) => [tasks.find((t) => t._id === id)?.assignedTo, id]));
        const keep = g.assignedTo.filter((k) => d.assignedTo.includes(k));
        const remove = g.assignedTo.filter((k) => !d.assignedTo.includes(k));
        const add = d.assignedTo.filter((k) => !g.assignedTo.includes(k));
        await Promise.all(keep.map((k) => api.updateTask(byKid.get(k)!, payload)));
        await Promise.all(remove.map((k) => api.deleteTask(byKid.get(k)!)));
        if (add.length) await api.createTask({ ...payload, assignedTo: add });
        toast('המשימה עודכנה');
      } else {
        await api.createTask({ ...payload, assignedTo: d.assignedTo, saveAsTemplate: d.saveAsTemplate });
        haptic.success();
        toast('המשימה נוספה! הילדים יקבלו התראה');
      }
      setEditor(null);
      await load();
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (g: Group) => {
    try {
      await Promise.all(g.ids.map((id) => api.deleteTask(id)));
      setConfirmDelete(null);
      setEditor(null);
      toast('המשימה נמחקה', 'info');
      await load();
    } catch (e) {
      onError(e);
    }
  };

  return (
    <CalmScreen
      title="משימות"
      subtitle="מה הילדים צריכים לעשות, וכמה זה שווה"
      action={<ToyButton icon="plus" size="sm" accessibilityLabel="משימה חדשה" onPress={openNew} />}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load().catch(() => {});
        setRefreshing(false);
      }}
      overlay={
        <>
          <TaskEditor
            visible={!!editor}
            editing={!!editor?.group}
            initial={editor?.draft ?? emptyDraft(kids)}
            kids={kids}
            familyTemplates={templates}
            learningPacks={packs}
            saving={saving}
            onSave={save}
            onDelete={editor?.group ? () => setConfirmDelete(editor.group) : undefined}
            onDeleteTemplate={async (id) => {
              await api.deleteTaskTemplate(id).catch(onError);
              setTemplates((p) => p.filter((t) => t._id !== id));
              toast('המשימה המוכנה הוסרה', 'info');
            }}
            onClose={() => setEditor(null)}
          />
          <Dialog
            visible={!!confirmDelete}
            title="למחוק את המשימה?"
            message="היא תיעלם אצל כל הילדים שקיבלו אותה. המטבעות שכבר הרוויחו נשארים."
            confirmLabel="מחיקה"
            destructive
            onConfirm={() => confirmDelete && remove(confirmDelete)}
            onCancel={() => setConfirmDelete(null)}
          />
        </>
      }
    >
      {kids.length > 1 ? (
        <Row gap={8} wrap>
          <ChoiceChip label="כולם" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {kids.map((k) => (
            <ChoiceChip key={k._id} label={k.displayName} selected={filter === k._id} onPress={() => setFilter(k._id)} />
          ))}
        </Row>
      ) : null}

      {!ready && !tasks.length ? (
        <ScreenSkeleton cards={3} />
      ) : groups.length === 0 ? (
        <Sticker tone="calm">
          <EmptyState
            title={kids.length ? 'עוד אין משימות' : 'קודם מוסיפים ילד/ה'}
            body={kids.length ? 'בחרו משימה מוכנה או כתבו אחת משלכם. לוקח 10 שניות.' : 'אחרי שתוסיפו ילד/ה, תוכלו לתת משימות.'}
            action={kids.length ? 'משימה ראשונה' : 'למסך המשפחה'}
            onAction={kids.length ? openNew : () => router.push('/(parent)/kids')}
          />
        </Sticker>
      ) : (
        groups.map((g) => (
          <Sticker
            key={g.key}
            tone="calm"
            pad={14}
            onPress={() =>
              setEditor({
                group: g,
                draft: {
                  title: g.task.title,
                  description: g.task.description,
                  icon: displayTaskIcon(g.task.icon, g.task.category),
                  points: g.task.points,
                  recurrence: g.task.recurrence,
                  category: g.task.category,
                  assignedTo: [...g.assignedTo],
                  learningPackId: g.task.learningPackId,
                  saveAsTemplate: false,
                },
              })
            }
            accessibilityLabel={g.task.title}
          >
            <Row gap={12}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: world.accentSoft, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' }}>
                <Txt size={26} align="center" style={{ lineHeight: 32 }}>
                  {displayTaskIcon(g.task.icon, g.task.category)}
                </Txt>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt v="title" numberOfLines={2}>
                  {g.task.title}
                </Txt>
                <Row gap={8} wrap>
                  <Row gap={3}>
                    <Coin size={15} />
                    <Txt v="caption" num>
                      {g.task.points}
                    </Txt>
                  </Row>
                  <Pill label={TASK_RECURRENCE[g.task.recurrence]?.label ?? ''} />
                  {g.task.learningPackId ? <Pill label="שיעורי בית" bg="#E3F7EC" color="#11915D" /> : null}
                </Row>
              </View>
              <Row>
                {g.assignedTo.slice(0, 3).map((id, i) => (
                  <View key={id} style={{ marginHorizontal: i ? -6 : 0 }}>
                    <AvatarSticker avatar={kidById.get(id)?.avatar ?? '🙂'} size={32} />
                  </View>
                ))}
              </Row>
            </Row>
          </Sticker>
        ))
      )}
    </CalmScreen>
  );
}
