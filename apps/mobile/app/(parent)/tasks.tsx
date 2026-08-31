import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemedScreen } from '../../components/ThemedScreen';
import { TASK_CATEGORIES, TASK_TEMPLATES, TASK_RECURRENCE } from '@kidsapp/shared';
import type { Task, TaskCategory, TaskRecurrence, TaskTemplate, User } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

type TaskGroup = {
  key: string;
  ids: string[];
  assignedTo: string[];
  title: string;
  description: string;
  category: TaskCategory;
  points: number;
  recurrence: TaskRecurrence;
  icon: string;
};

function taskGroupKey(task: Pick<Task, 'title' | 'description' | 'category' | 'points' | 'recurrence' | 'icon'>) {
  return [task.title, task.description, task.category, task.points, task.recurrence, task.icon].join('|');
}

function groupTasks(tasks: Task[]): TaskGroup[] {
  const map = new Map<string, TaskGroup>();
  for (const task of tasks) {
    const key = taskGroupKey(task);
    const existing = map.get(key);
    if (existing) {
      existing.ids.push(task._id);
      if (!existing.assignedTo.includes(task.assignedTo)) {
        existing.assignedTo.push(task.assignedTo);
      }
    } else {
      map.set(key, {
        key,
        ids: [task._id],
        assignedTo: [task.assignedTo],
        title: task.title,
        description: task.description,
        category: task.category,
        points: task.points,
        recurrence: task.recurrence,
        icon: task.icon,
      });
    }
  }
  return Array.from(map.values());
}

export default function ParentTasksScreen() {
  const insets = useSafeAreaInsets();
  const { colors, borderRadius, cardBorder, categoryIcon, pointsEmoji, id: themeId } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kids, setKids] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TaskGroup | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('20');
  const [category, setCategory] = useState<TaskCategory>('home');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('daily');
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const savingRef = useRef(false);

  const modalMaxHeight = Dimensions.get('window').height - insets.top - insets.bottom - spacing.lg * 2;
  const taskGroups = useMemo(() => groupTasks(tasks), [tasks]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
        header: { marginBottom: spacing.lg, gap: spacing.sm },
        headerActions: { gap: spacing.sm, flexWrap: 'wrap', width: '100%' },
        headerBtn: { flexGrow: 1, flexBasis: '45%' },
        title: { color: colors.text, fontSize: 24, fontWeight: '800', width: '100%' },
        taskCard: { marginBottom: spacing.sm },
        taskRow: { alignItems: 'flex-start', width: '100%', gap: spacing.sm },
        actions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexShrink: 0 },
        actionIcon: { fontSize: 20 },
        taskInfo: { flex: 1, minWidth: 0 },
        taskTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
        taskMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        modalBackdrop: { ...StyleSheet.absoluteFillObject },
        modal: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.xl,
          maxWidth: 500,
          alignSelf: 'center',
          width: '100%',
          overflow: 'hidden',
          ...cardBorder(2),
        },
        modalScroll: { padding: spacing.lg, paddingBottom: spacing.sm },
        modalTitle: {
          color: colors.text,
          fontSize: 22,
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: spacing.lg,
          writingDirection: 'rtl',
        },
        label: {
          color: colors.text,
          fontSize: 14,
          fontWeight: '600',
          marginBottom: spacing.xs,
          width: '100%',
          textAlign: 'right',
          writingDirection: 'rtl',
        },
        hint: {
          color: colors.textMuted,
          fontSize: 12,
          marginBottom: spacing.sm,
          width: '100%',
          textAlign: 'right',
          writingDirection: 'rtl',
        },
        chipRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.md,
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          width: '100%',
          ...(Platform.OS === 'web' ? { direction: 'rtl' as const } : {}),
        },
        chip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          backgroundColor: colors.bgCardLight,
          borderWidth: 1,
          borderColor: colors.border,
          alignSelf: 'flex-end',
        },
        chipContent: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          ...(Platform.OS === 'web' ? { direction: 'rtl' as const } : {}),
        },
        chipIcon: { fontSize: 13 },
        chipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
        chipText: {
          color: colors.text,
          fontSize: 13,
          textAlign: 'right',
          writingDirection: 'rtl',
        },
        chipTextActive: { color: colors.text, fontWeight: '700' },
        modalActions: {
          gap: spacing.sm,
          padding: spacing.lg,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        templateChip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderRadius: borderRadius.md,
          backgroundColor: colors.bgCardLight,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.sm,
          alignItems: 'flex-end',
          width: '100%',
        },
        templateTitle: {
          color: colors.text,
          fontSize: 15,
          fontWeight: '700',
          textAlign: 'right',
          writingDirection: 'rtl',
          width: '100%',
        },
        templateMeta: {
          color: colors.textMuted,
          fontSize: 12,
          marginTop: 4,
          textAlign: 'right',
          writingDirection: 'rtl',
          width: '100%',
        },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    const kidsRes = await api.getKids();
    setKids(kidsRes.kids);
    setAssignedIds((prev) => {
      if (prev.length > 0) return prev.filter((id) => kidsRes.kids.some((k) => k._id === id));
      return kidsRes.kids[0] ? [kidsRes.kids[0]._id] : [];
    });
    if (kidsRes.kids.length > 0) {
      const allTasks: Task[] = [];
      const seen = new Set<string>();
      for (const kid of kidsRes.kids) {
        const res = await api.getTasks(kid._id);
        for (const task of res.tasks) {
          if (!seen.has(task._id)) {
            seen.add(task._id);
            allTasks.push(task);
          }
        }
      }
      setTasks(allTasks);
    } else {
      setTasks([]);
    }
  }, []);

  useFocusLoad(load);

  const allSelected = kids.length > 0 && assignedIds.length === kids.length;

  const toggleKid = (kidId: string) => {
    setAssignedIds((prev) =>
      prev.includes(kidId) ? prev.filter((id) => id !== kidId) : [...prev, kidId]
    );
  };

  const toggleAllKids = () => {
    setAssignedIds(allSelected ? [] : kids.map((k) => k._id));
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPoints('20');
    setCategory('home');
    setRecurrence('daily');
    setAssignedIds(kids[0] ? [kids[0]._id] : []);
    setEditingGroup(null);
  };

  const kidsMissingTask = (taskTitle: string) =>
    kids.filter((kid) => !tasks.some((task) => task.title === taskTitle && task.assignedTo === kid._id));

  const openCreateModal = (template?: TaskTemplate) => {
    if (kids.length === 0) {
      alert(t('addKidFirst'));
      return;
    }

    setEditingGroup(null);
    if (template) {
      setTitle(template.title);
      setDescription(template.description);
      setPoints(String(template.points));
      setCategory(template.category);
      setRecurrence('daily');
      const missing = kidsMissingTask(template.title);
      setAssignedIds(missing.length > 0 ? missing.map((k) => k._id) : [kids[0]._id]);
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const openEditModal = (group: TaskGroup) => {
    setEditingGroup(group);
    setTitle(group.title);
    setDescription(group.description);
    setPoints(String(group.points));
    setCategory(group.category);
    setRecurrence(group.recurrence);
    setAssignedIds([...group.assignedTo]);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const selectTemplate = (template: TaskTemplate) => {
    setTemplatesModalVisible(false);
    openCreateModal(template);
  };

  const handleSave = async () => {
    if (savingRef.current || loading) return;
    if (!title.trim() || assignedIds.length === 0) {
      alert(assignedIds.length === 0 ? 'יש לבחור לפחות ילד אחד' : 'חסרה כותרת');
      return;
    }

    savingRef.current = true;
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description,
        points: parseInt(points) || 20,
        category,
        recurrence,
        icon: TASK_CATEGORIES[category].icon,
      };

      if (editingGroup) {
        const byKid = new Map<string, string>();
        for (const id of editingGroup.ids) {
          const task = tasks.find((t) => t._id === id);
          if (task) byKid.set(task.assignedTo, id);
        }

        const toRemove = editingGroup.assignedTo.filter((id) => !assignedIds.includes(id));
        const toKeep = editingGroup.assignedTo.filter((id) => assignedIds.includes(id));
        const toAdd = assignedIds.filter((id) => !editingGroup.assignedTo.includes(id));

        await Promise.all(
          toKeep.map((kidId) => {
            const taskId = byKid.get(kidId);
            return taskId ? api.updateTask(taskId, payload) : Promise.resolve();
          })
        );
        await Promise.all(
          toRemove.map((kidId) => {
            const taskId = byKid.get(kidId);
            return taskId ? api.deleteTask(taskId) : Promise.resolve();
          })
        );
        if (toAdd.length > 0) {
          await api.createTask({ ...payload, assignedTo: toAdd });
        }
      } else {
        await api.createTask({ ...payload, assignedTo: assignedIds });
      }

      closeModal();
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  };

  const handleDelete = async (group: TaskGroup) => {
    await Promise.all(group.ids.map((id) => api.deleteTask(id)));
    await load();
  };

  const categories = Object.entries(TASK_CATEGORIES) as [TaskCategory, { label: string; icon: string }][];
  const recurrences = Object.entries(TASK_RECURRENCE) as [TaskRecurrence, { label: string; icon: string }][];

  return (
    <ThemedScreen tabs>
      <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
        <View style={styles.header}>
          <Text style={[styles.title, rtl.textFull]}>{t('manageTasks')}</Text>
          <View style={[styles.headerActions, rtl.row]}>
            <Button title={`+ ${t('addTask')}`} onPress={() => openCreateModal()} style={styles.headerBtn} />
            {kids.length > 0 && (
              <Button
                title={t('showQuickTasks')}
                onPress={() => setTemplatesModalVisible(true)}
                variant="secondary"
                style={styles.headerBtn}
              />
            )}
          </View>
        </View>

        {taskGroups.map((group) => {
          const assignedKids = kids.filter((k) => group.assignedTo.includes(k._id));
          const kidsLabel =
            assignedKids.length === kids.length && kids.length > 1
              ? t('selectAllKids')
              : assignedKids.map((k) => `${k.avatar} ${k.displayName}`).join(' · ');
          const cat = TASK_CATEGORIES[group.category];
          const rec = TASK_RECURRENCE[group.recurrence];
          return (
            <Card key={group.key} style={styles.taskCard}>
              <View style={[styles.taskRow, rtl.row]}>
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, rtl.textFull]}>
                    {categoryIcon(group.category)} {group.title}
                  </Text>
                  <Text style={[styles.taskMeta, rtl.textFull]}>
                    {t('assignedKids')}: {kidsLabel}
                  </Text>
                  <Text style={[styles.taskMeta, rtl.textFull]}>
                    {cat.label} · {rec.icon} {rec.label} · +{group.points} {pointsEmoji}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => openEditModal(group)}>
                    <Text style={styles.actionIcon}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(group)}>
                    <Text style={styles.actionIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>

      <Modal
        visible={templatesModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTemplatesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setTemplatesModalVisible(false)} />
          <View style={[styles.modal, { maxHeight: modalMaxHeight }]}>
            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator>
              <Text style={styles.modalTitle}>{t('quickTasks')}</Text>
              <Text style={styles.hint}>{t('quickTasksHint')}</Text>
              {TASK_TEMPLATES.map((template) => {
                const missing = kidsMissingTask(template.title).length;
                return (
                  <TouchableOpacity
                    key={template.title}
                    style={styles.templateChip}
                    onPress={() => selectTemplate(template)}
                  >
                    <Text style={styles.templateTitle}>
                      {categoryIcon(template.category)} {template.title}
                    </Text>
                    <Text style={styles.templateMeta}>
                      {template.description}
                    </Text>
                    <Text style={styles.templateMeta}>
                      +{template.points} {pointsEmoji} · {TASK_RECURRENCE.daily.icon}{' '}
                      {TASK_RECURRENCE.daily.label}
                      {missing === 0 ? ` · ${t('taskExists')}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <Button title={t('cancel')} onPress={() => setTemplatesModalVisible(false)} variant="outline" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View style={[styles.modal, { maxHeight: modalMaxHeight }]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              contentContainerStyle={styles.modalScroll}
            >
              <Text style={styles.modalTitle}>{editingGroup ? t('editTask') : t('addTask')}</Text>

              <Input label={t('title')} value={title} onChangeText={setTitle} />
              <Input label={t('description')} value={description} onChangeText={setDescription} />
              <Input
                label={t('cost') + ' (נקודות)'}
                value={points}
                onChangeText={setPoints}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>{t('category')}</Text>
              <View style={styles.chipRow}>
                {categories.map(([key, val]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.chip, category === key && styles.chipActive]}
                    onPress={() => setCategory(key)}
                  >
                    <View style={styles.chipContent}>
                      <Text style={styles.chipIcon}>{val.icon}</Text>
                      <Text style={[styles.chipText, category === key && styles.chipTextActive]}>
                        {val.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{t('taskRecurrence')}</Text>
              <Text style={styles.hint}>{t('recurrenceDaily')}</Text>
              <View style={styles.chipRow}>
                {recurrences.map(([key, val]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.chip, recurrence === key && styles.chipActive]}
                    onPress={() => setRecurrence(key)}
                  >
                    <View style={styles.chipContent}>
                      <Text style={styles.chipIcon}>{val.icon}</Text>
                      <Text style={[styles.chipText, recurrence === key && styles.chipTextActive]}>
                        {val.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{t('assignTo')}</Text>
              <Text style={styles.hint}>{t('assignToHint')}</Text>
              <View style={styles.chipRow}>
                {kids.length > 1 && (
                  <TouchableOpacity
                    style={[styles.chip, allSelected && styles.chipActive]}
                    onPress={toggleAllKids}
                  >
                    <View style={styles.chipContent}>
                      <Text style={styles.chipIcon}>👨‍👩‍👧‍👦</Text>
                      <Text style={[styles.chipText, allSelected && styles.chipTextActive]}>
                        {t('selectAllKids')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                {kids.map((kid) => {
                  const selected = assignedIds.includes(kid._id);
                  return (
                    <TouchableOpacity
                      key={kid._id}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => toggleKid(kid._id)}
                    >
                      <View style={styles.chipContent}>
                        {selected ? <Text style={styles.chipIcon}>✓</Text> : null}
                        <Text style={styles.chipIcon}>{kid.avatar}</Text>
                        <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                          {kid.displayName}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={[styles.modalActions, rtl.row]}>
              <Button title={t('save')} onPress={handleSave} loading={loading} style={{ flex: 1 }} />
              <Button title={t('cancel')} onPress={closeModal} variant="outline" style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedScreen>
  );
}
