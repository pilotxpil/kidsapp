import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemedScreen } from '../../components/ThemedScreen';
import { TASK_CATEGORIES } from '@kidsapp/shared';
import type { Task, TaskCategory, User } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function ParentTasksScreen() {
  const { colors, borderRadius, cardBorder, categoryIcon, pointsEmoji, id: themeId } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kids, setKids] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('20');
  const [category, setCategory] = useState<TaskCategory>('home');
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
        header: { marginBottom: spacing.lg },
        title: { color: colors.text, fontSize: 24, fontWeight: '800', flex: 1, minWidth: 0 },
        addBtn: { flexShrink: 0 },
        taskCard: { marginBottom: spacing.sm },
        taskRow: { alignItems: 'center', width: '100%' },
        delete: { fontSize: 20 },
        taskInfo: { flex: 1, minWidth: 0 },
        taskTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
        taskMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        modal: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          maxWidth: 500,
          alignSelf: 'center',
          width: '100%',
          ...cardBorder(2),
        },
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
        },
        hint: {
          color: colors.textMuted,
          fontSize: 12,
          marginBottom: spacing.sm,
          width: '100%',
        },
        chips: { flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
        chip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          backgroundColor: colors.bgCardLight,
          borderWidth: 1,
          borderColor: colors.border,
        },
        chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        chipText: { color: colors.text, fontSize: 13, writingDirection: 'rtl' },
        modalActions: { gap: spacing.sm, marginTop: spacing.md },
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
      for (const kid of kidsRes.kids) {
        const res = await api.getTasks(kid._id);
        allTasks.push(...res.tasks);
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

  const openModal = () => {
    setAssignedIds(kids.map((k) => k._id).length ? [kids[0]._id] : []);
    setModalVisible(true);
  };

  const handleCreate = async () => {
    if (!title || assignedIds.length === 0) {
      alert(assignedIds.length === 0 ? 'יש לבחור לפחות ילד אחד' : 'חסרה כותרת');
      return;
    }
    setLoading(true);
    try {
      await api.createTask({
        title,
        description,
        points: parseInt(points) || 20,
        category,
        assignedTo: assignedIds,
        icon: TASK_CATEGORIES[category].icon,
        recurrence: 'daily',
      });
      setModalVisible(false);
      setTitle('');
      setDescription('');
      setPoints('20');
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteTask(id);
    await load();
  };

  const categories = Object.entries(TASK_CATEGORIES) as [TaskCategory, { label: string; icon: string }][];

  return (
    <ThemedScreen tabs>
      <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
        <View style={[styles.header, rtl.headerSplit]}>
          <Button title={`+ ${t('addTask')}`} onPress={openModal} style={styles.addBtn} />
          <Text style={[styles.title, rtl.textFull]}>{t('manageTasks')}</Text>
        </View>

        {tasks.map((task) => {
          const kid = kids.find((k) => k._id === task.assignedTo);
          const cat = TASK_CATEGORIES[task.category];
          return (
            <Card key={task._id} style={styles.taskCard}>
              <View style={[styles.taskRow, rtl.row]}>
                <TouchableOpacity onPress={() => handleDelete(task._id)}>
                  <Text style={styles.delete}>🗑️</Text>
                </TouchableOpacity>
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, rtl.textFull]}>
                    {categoryIcon(task.category)} {task.title}
                  </Text>
                  <Text style={[styles.taskMeta, rtl.textFull]}>
                    {kid?.avatar} {kid?.displayName} · {cat.label} · +{task.points} {pointsEmoji}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('addTask')}</Text>
            <Input label={t('title')} value={title} onChangeText={setTitle} />
            <Input label={t('description')} value={description} onChangeText={setDescription} />
            <Input
              label={t('cost') + ' (נקודות)'}
              value={points}
              onChangeText={setPoints}
              keyboardType="number-pad"
            />

            <Text style={[styles.label, rtl.textFull]}>{t('category')}</Text>
            <View style={[styles.chips, rtl.row]}>
              {categories.map(([key, val]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, category === key && styles.chipActive]}
                  onPress={() => setCategory(key)}
                >
                  <Text style={styles.chipText}>
                    {val.icon} {val.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, rtl.textFull]}>{t('assignTo')}</Text>
            <Text style={[styles.hint, rtl.textFull]}>{t('assignToHint')}</Text>
            <View style={[styles.chips, rtl.row]}>
              {kids.length > 1 && (
                <TouchableOpacity
                  style={[styles.chip, allSelected && styles.chipActive]}
                  onPress={toggleAllKids}
                >
                  <Text style={styles.chipText}>👨‍👩‍👧‍👦 {t('selectAllKids')}</Text>
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
                    <Text style={styles.chipText}>
                      {selected ? '✓ ' : ''}
                      {kid.avatar} {kid.displayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.modalActions, rtl.row]}>
              <Button title={t('save')} onPress={handleCreate} loading={loading} style={{ flex: 1 }} />
              <Button
                title={t('cancel')}
                onPress={() => setModalVisible(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}
