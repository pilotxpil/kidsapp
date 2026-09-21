import React, { useState, useCallback, useMemo } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  View,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { TaskCard, TaskSectionHeader } from '../../components/TaskCard';
import { Celebration } from '../../components/Celebration';
import { ThemedScreen } from '../../components/ThemedScreen';
import { SectionHeader } from '../../components/ThemedHero';
import { Button } from '../../components/Button';
import type { Task } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';
import { groupByTaskSection } from '../../lib/task-sections';

export default function KidTasksScreen() {
  const { user } = useAuth();
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();
  const userId = user?._id;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [proofTask, setProofTask] = useState<Task | null>(null);
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.md },
        empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
        firstSection: { marginTop: 0 },
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        modalCard: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          ...cardBorder(2),
        },
        modalTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: '700',
          marginBottom: spacing.md,
          writingDirection: 'rtl',
          textAlign: 'right',
        },
        preview: {
          width: '100%',
          height: 180,
          borderRadius: borderRadius.md,
          marginBottom: spacing.md,
          backgroundColor: colors.bg,
        },
        actions: { gap: spacing.sm },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await api.getTasks(userId);
    setTasks(res.tasks);
  }, [userId]);

  useFocusLoad(load, !!userId);

  const sections = useMemo(() => {
    const rank = (status: Task['completionStatus']) =>
      status === 'pending' ? 1 : status === 'completed' ? 2 : 0;
    return groupByTaskSection(tasks).map((section) => ({
      ...section,
      items: [...section.items].sort(
        (a, b) => rank(a.completionStatus) - rank(b.completionStatus)
      ),
    }));
  }, [tasks]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('cameraPermissionNeeded'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.4,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mime = asset.mimeType || 'image/jpeg';
    if (!asset.base64) {
      Alert.alert('שגיאה', 'לא הצלחנו לקרוא את התמונה');
      return;
    }
    setProofPhoto(`data:${mime};base64,${asset.base64}`);
  };

  const openComplete = (task: Task) => {
    setProofTask(task);
    setProofPhoto(null);
  };

  const submitComplete = async (withPhoto: boolean) => {
    if (!proofTask) return;
    setCompletingId(proofTask._id);
    try {
      await api.completeTask(proofTask._id, withPhoto && proofPhoto ? proofPhoto : undefined);
      setTasks((prev) =>
        prev.map((tk) =>
          tk._id === proofTask._id ? { ...tk, completionStatus: 'pending' as const } : tk
        )
      );
      setProofTask(null);
      setProofPhoto(null);
      setCelebrate(true);
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
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
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
      >
        <SectionHeader title={t('tasks')} icon="📜" />

        {sections.length === 0 ? (
          <Text style={styles.empty}>{t('noTasks')}</Text>
        ) : (
          sections.map((section, sectionIndex) => (
            <View key={section.key}>
              <TaskSectionHeader
                title={section.title}
                icon={section.icon}
                count={section.items.length}
                style={sectionIndex === 0 ? styles.firstSection : undefined}
              />
              {section.items.map((task, i) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  index={i}
                  onComplete={openComplete}
                  loading={completingId === task._id}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!proofTask} transparent animationType="fade" onRequestClose={() => setProofTask(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {proofTask?.title} — {t('proofPhoto')}
            </Text>
            {proofPhoto ? (
              <TouchableOpacity onPress={pickPhoto}>
                <Image source={{ uri: proofPhoto }} style={styles.preview} />
              </TouchableOpacity>
            ) : null}
            <View style={styles.actions}>
              <Button
                title={proofPhoto ? t('removeProofPhoto') : t('addProofPhoto')}
                onPress={proofPhoto ? () => setProofPhoto(null) : pickPhoto}
                variant="secondary"
              />
              <Button
                title={t('complete')}
                onPress={() => submitComplete(true)}
                loading={!!completingId}
              />
              <Button title={t('cancel')} onPress={() => setProofTask(null)} variant="secondary" />
            </View>
          </View>
        </View>
      </Modal>

      <Celebration visible={celebrate} sfx="cheer" message={t('taskSubmitted')} onDone={() => setCelebrate(false)} />
    </ThemedScreen>
  );
}
