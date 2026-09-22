import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { TaskSectionHeader } from '../../components/TaskCard';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemedScreen } from '../../components/ThemedScreen';
import { ScreenReveal, ScreenSkeleton } from '../../components/ScreenSkeleton';
import { ScreenCacheKey, hasScreenCache, readScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { loadParentTasksSnapshot } from '../../lib/prefetch-tabs';
import { KeyboardSheet, KeyboardScroll, useKeyboardHeight } from '../../components/KeyboardSheet';
import { TASK_CATEGORIES, TASK_TEMPLATES, TASK_RECURRENCE } from '@kidsapp/shared';
import type { FamilyTaskTemplate, Task, TaskCategory, TaskRecurrence, TaskTemplate, User } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';
import { groupByTaskSection } from '../../lib/task-sections';

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
  learningPackId?: string;
};

function taskGroupKey(task: Pick<Task, 'title' | 'description' | 'category' | 'points' | 'recurrence' | 'icon' | 'learningPackId'>) {
  return [task.title, task.description, task.category, task.points, task.recurrence, task.icon, task.learningPackId || ''].join('|');
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
        learningPackId: task.learningPackId,
      });
    }
  }
  return Array.from(map.values());
}

export default function ParentTasksScreen() {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const modalMaxHeight =
    Dimensions.get('window').height -
    insets.top -
    insets.bottom -
    spacing.lg * 2 -
    (Platform.OS === 'android' ? keyboardHeight : 0);
  const { colors, borderRadius, cardBorder, categoryIcon, pointsEmoji, id: themeId } = useTheme();
  type TasksCache = Awaited<ReturnType<typeof loadParentTasksSnapshot>>;
  const hadCache = useRef(hasScreenCache(ScreenCacheKey.parentTasks)).current;
  const cachedTasks = useRef(readScreenCache<TasksCache>(ScreenCacheKey.parentTasks)).current;
  const [tasks, setTasks] = useState<Task[]>(cachedTasks?.tasks ?? []);
  const [kids, setKids] = useState<User[]>(cachedTasks?.kids ?? []);
  const [modalVisible, setModalVisible] = useState(false);
  const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TaskGroup | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('20');
  const [category, setCategory] = useState<TaskCategory>('home');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('daily');
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [familyTemplates, setFamilyTemplates] = useState<FamilyTaskTemplate[]>(cachedTasks?.familyTemplates ?? []);
  const [learningPackId, setLearningPackId] = useState<string | null>(null);
  const [learningPacks, setLearningPacks] = useState<{ id: string; title: string }[]>(
    cachedTasks?.learningPacks ?? []
  );
  const [loading, setLoading] = useState(false);
  const savingRef = useRef(false);

  const taskGroups = useMemo(() => groupTasks(tasks), [tasks]);
  const taskSections = useMemo(() => groupByTaskSection(taskGroups), [taskGroups]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
        header: { marginBottom: spacing.lg, gap: spacing.sm },
        headerActions: { gap: spacing.sm, width: '100%', alignItems: 'stretch' },
        headerBtnWrap: { flex: 1, minWidth: 0 },
        headerBtn: { width: '100%', alignSelf: 'stretch' },
        title: { color: colors.text, fontSize: 24, fontWeight: '800', width: '100%' },
        taskCard: { marginBottom: spacing.sm },
        firstSection: { marginTop: 0 },
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
        modalBackdrop: { ...StyleSheet.absoluteFill },
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
          flexDirection: 'row-reverse',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.md,
          justifyContent: 'flex-start',
          alignItems: 'flex-end',
          width: '100%',
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
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 4,
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
          alignItems: 'flex-end',
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
        templateSection: {
          color: colors.text,
          fontSize: 15,
          fontWeight: '800',
          textAlign: 'right',
          writingDirection: 'rtl',
          width: '100%',
          marginTop: spacing.sm,
          marginBottom: spacing.sm,
        },
        templateRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.sm,
          width: '100%',
        },
        templateBody: {
          flex: 1,
          minWidth: 0,
        },
        templateDelete: {
          padding: spacing.sm,
        },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    const snap = await loadParentTasksSnapshot();
    writeScreenCache(ScreenCacheKey.parentTasks, snap);
    setKids(snap.kids);
    setAssignedIds((prev) => {
      if (prev.length > 0) return prev.filter((id) => snap.kids.some((k) => k._id === id));
      return snap.kids[0] ? [snap.kids[0]._id] : [];
    });
    setTasks(snap.tasks);
    setFamilyTemplates(snap.familyTemplates);
    setLearningPacks(snap.learningPacks);
  }, []);

  const ready = useFocusLoad(load);
  const showSkeleton = !ready && !hadCache;

  const builtinTemplates = useMemo(
    () => TASK_TEMPLATES.filter((tpl) => !familyTemplates.some((custom) => custom.title === tpl.title)),
    [familyTemplates]
  );

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
    setSaveAsTemplate(true);
    setLearningPackId(null);
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
    setSaveAsTemplate(true);
    if (template) {
      setTitle(template.title);
      setDescription(template.description);
      setPoints(String(template.points));
      setCategory(template.category);
      setRecurrence(template.recurrence ?? 'daily');
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
    setLearningPackId(group.learningPackId || null);
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
        learningPackId: learningPackId || undefined,
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
        await api.createTask({ ...payload, assignedTo: assignedIds, saveAsTemplate });
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

  const handleDeleteTemplate = async (id: string) => {
    await api.deleteTaskTemplate(id);
    setFamilyTemplates((prev) => prev.filter((tpl) => tpl._id !== id));
  };

  const renderTemplateItem = (template: TaskTemplate & { _id?: string; recurrence?: TaskRecurrence }) => {
    const missing = kidsMissingTask(template.title).length;
    const rec = TASK_RECURRENCE[template.recurrence ?? 'daily'];
    return (
      <View key={template._id ?? template.title} style={[styles.templateRow, rtl.row]}>
        <TouchableOpacity style={[styles.templateChip, styles.templateBody]} onPress={() => selectTemplate(template)}>
          <Text style={styles.templateTitle}>
            {categoryIcon(template.category)} {template.title}
          </Text>
          <Text style={styles.templateMeta}>{template.description}</Text>
          <Text style={styles.templateMeta}>
            +{template.points} {pointsEmoji} · {rec.icon} {rec.label}
            {missing === 0 ? ` · ${t('taskExists')}` : ''}
          </Text>
        </TouchableOpacity>
        {template._id ? (
          <TouchableOpacity style={styles.templateDelete} onPress={() => handleDeleteTemplate(template._id!)}>
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const categories = Object.entries(TASK_CATEGORIES) as [TaskCategory, { label: string; icon: string }][];
  const recurrences = Object.entries(TASK_RECURRENCE) as [TaskRecurrence, { label: string; icon: string }][];

  return (
    <ThemedScreen tabs>
      <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
        <View style={styles.header}>
          <Text style={[styles.title, rtl.textFull]}>{t('manageTasks')}</Text>
          <View style={[styles.headerActions, rtl.row]}>
            <View style={styles.headerBtnWrap}>
              <Button title={`+ ${t('addTask')}`} onPress={() => openCreateModal()} style={styles.headerBtn} />
            </View>
            {kids.length > 0 && (
              <View style={styles.headerBtnWrap}>
                <Button
                  title={t('showQuickTasks')}
                  onPress={() => setTemplatesModalVisible(true)}
                  variant="secondary"
                  style={styles.headerBtn}
                />
              </View>
            )}
          </View>
        </View>

        {showSkeleton ? (
          <ScreenSkeleton cards={5} />
        ) : (
          <ScreenReveal animate={!hadCache}>
        {taskSections.map((section, sectionIndex) => (
          <View key={section.key}>
            <TaskSectionHeader
              title={section.title}
              icon={section.icon}
              count={section.items.length}
              style={sectionIndex === 0 ? styles.firstSection : undefined}
            />
            {section.items.map((group) => {
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
          </View>
        ))}
          </ScreenReveal>
        )}
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
              {familyTemplates.length > 0 && (
                <>
                  <Text style={styles.templateSection}>{t('customQuickTasks')}</Text>
                  {familyTemplates.map(renderTemplateItem)}
                  {builtinTemplates.length > 0 ? (
                    <Text style={styles.templateSection}>{t('builtinQuickTasks')}</Text>
                  ) : null}
                </>
              )}
              {builtinTemplates.map(renderTemplateItem)}
            </ScrollView>
            <View style={styles.modalActions}>
              <Button title={t('cancel')} onPress={() => setTemplatesModalVisible(false)} variant="outline" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardSheet style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View style={[styles.modal, { maxHeight: modalMaxHeight }]}>
            <KeyboardScroll
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

              <Text style={styles.label}>{t('homeworkPack')}</Text>
              <Text style={styles.hint}>{t('homeworkPackHint')}</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, !learningPackId && styles.chipActive]}
                  onPress={() => setLearningPackId(null)}
                >
                  <View style={styles.chipContent}>
                    <Text style={[styles.chipText, !learningPackId && styles.chipTextActive]}>
                      {t('noHomeworkPack')}
                    </Text>
                  </View>
                </TouchableOpacity>
                {learningPacks.map((pack) => (
                  <TouchableOpacity
                    key={pack.id}
                    style={[styles.chip, learningPackId === pack.id && styles.chipActive]}
                    onPress={() => setLearningPackId(pack.id)}
                  >
                    <View style={styles.chipContent}>
                      <Text style={styles.chipIcon}>📚</Text>
                      <Text
                        style={[styles.chipText, learningPackId === pack.id && styles.chipTextActive]}
                        numberOfLines={1}
                      >
                        {pack.title}
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

              {!editingGroup && (
                <>
                  <Text style={styles.label}>{t('saveAsQuickTask')}</Text>
                  <Text style={styles.hint}>{t('saveAsQuickTaskHint')}</Text>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.chip, saveAsTemplate && styles.chipActive]}
                      onPress={() => setSaveAsTemplate((prev) => !prev)}
                    >
                      <View style={styles.chipContent}>
                        {saveAsTemplate ? <Text style={styles.chipIcon}>✓</Text> : null}
                        <Text style={styles.chipIcon}>📌</Text>
                        <Text style={[styles.chipText, saveAsTemplate && styles.chipTextActive]}>
                          {saveAsTemplate ? t('on') : t('off')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </KeyboardScroll>

            <View style={styles.modalActions}>
              <Button title={t('save')} onPress={handleSave} loading={loading} />
              <Button title={t('cancel')} onPress={closeModal} variant="outline" />
            </View>
          </View>
        </KeyboardSheet>
      </Modal>
    </ThemedScreen>
  );
}
