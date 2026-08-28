import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeScreen } from "../../components/SafeScreen";
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { TASK_CATEGORIES } from '@kidsapp/shared';
import type { Task, TaskCategory, User } from '@kidsapp/shared';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function ParentTasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kids, setKids] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('20');
  const [category, setCategory] = useState<TaskCategory>('home');
  const [assignedTo, setAssignedTo] = useState('');
  const [icon, setIcon] = useState('⭐');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const kidsRes = await api.getKids();
    setKids(kidsRes.kids);
    if (kidsRes.kids.length > 0 && !assignedTo) {
      setAssignedTo(kidsRes.kids[0]._id);
    }
    if (kidsRes.kids.length > 0) {
      const allTasks: Task[] = [];
      for (const kid of kidsRes.kids) {
        const res = await api.getTasks(kid._id);
        allTasks.push(...res.tasks);
      }
      setTasks(allTasks);
    }
  }, []);

  useFocusLoad(load);

  const handleCreate = async () => {
    if (!title || !assignedTo) return;
    setLoading(true);
    try {
      await api.createTask({
        title,
        description,
        points: parseInt(points) || 20,
        category,
        assignedTo,
        icon,
        recurrence: 'daily',
      });
      setModalVisible(false);
      setTitle('');
      setDescription('');
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
    <LinearGradient colors={[colors.bg, '#0f172a']} style={styles.container}>
      <SafeScreen tabs style={styles.safe}>
        <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
          <View style={[styles.header, rtl.headerSplit]}>
            <Button title={`+ ${t('addTask')}`} onPress={() => setModalVisible(true)} style={styles.addBtn} />
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
                    <Text style={styles.taskTitle}>{task.icon} {task.title}</Text>
                    <Text style={styles.taskMeta}>
                      {kid?.displayName} · {cat.label} · +{task.points} XP
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
              <Input label={t('cost') + ' (נקודות)'} value={points} onChangeText={setPoints} keyboardType="number-pad" />

              <Text style={styles.label}>{t('category')}</Text>
              <View style={[styles.chips, rtl.row]}>
                {categories.map(([key, val]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.chip, category === key && styles.chipActive]}
                    onPress={() => { setCategory(key); setIcon(val.icon); }}
                  >
                    <Text style={styles.chipText}>{val.icon} {val.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{t('assignTo')}</Text>
              <View style={[styles.chips, rtl.row]}>
                {kids.map((kid) => (
                  <TouchableOpacity
                    key={kid._id}
                    style={[styles.chip, assignedTo === kid._id && styles.chipActive]}
                    onPress={() => setAssignedTo(kid._id)}
                  >
                    <Text style={styles.chipText}>{kid.avatar} {kid.displayName}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.modalActions, rtl.row]}>
                <Button title={t('save')} onPress={handleCreate} loading={loading} style={{ flex: 1 }} />
                <Button title={t('cancel')} onPress={() => setModalVisible(false)} variant="outline" style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </Modal>
      </SafeScreen>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
  header: { marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', flex: 1, marginRight: spacing.md },
  addBtn: { paddingHorizontal: spacing.md },
  taskCard: { marginBottom: spacing.sm },
  taskRow: { alignItems: 'center' },
  delete: { fontSize: 20, marginEnd: spacing.md },
  taskInfo: { flex: 1 },
  taskTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  taskMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.bgCard, borderRadius: borderRadius.xl, padding: spacing.lg, maxWidth: 500, alignSelf: 'center', width: '100%' },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: spacing.lg },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  chips: { flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.bgCardLight, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  modalActions: { gap: spacing.sm, marginTop: spacing.md },
});
