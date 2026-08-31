import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TASK_CATEGORIES, TASK_RECURRENCE } from '@kidsapp/shared';
import type { Task, TaskCategory, TaskRecurrence } from '@kidsapp/shared';
import { Card } from './Card';
import { Button } from './Button';
import { RtlText } from './RtlText';
import { FadeInUp } from './animations/FadeInUp';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';

interface TaskCardProps {
  task: Task;
  onComplete: (task: Task) => void;
  loading?: boolean;
  index?: number;
}

function completedLabel(recurrence: TaskRecurrence): string {
  if (recurrence === 'daily') return t('completedToday');
  if (recurrence === 'weekly') return t('completedThisWeek');
  return t('completedOnce');
}

export function TaskCard({ task, onComplete, loading, index = 0 }: TaskCardProps) {
  const { colors, borderRadius, cardBorder, categoryIcon, pointsEmoji, id: themeId } = useTheme();
  const cat = TASK_CATEGORIES[task.category as TaskCategory];
  const icon = categoryIcon(task.category as TaskCategory);
  const isPending = task.completionStatus === 'pending';
  const isCompleted = task.completionStatus === 'completed';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cardWrap: { width: '100%', alignSelf: 'stretch' },
        card: { marginBottom: spacing.md, alignSelf: 'stretch' },
        header: { marginBottom: spacing.md, width: '100%' },
        title: { color: colors.text, fontSize: 19, fontWeight: '800' },
        description: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
        meta: { alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
        categoryBadge: {
          backgroundColor: colors.bgCardLight,
          paddingHorizontal: spacing.sm,
          paddingVertical: 5,
          borderRadius: borderRadius.sm,
          ...cardBorder(1),
          shadowColor: colors.glow,
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        points: { color: colors.gold, fontWeight: '800', fontSize: 15 },
        categoryText: { color: colors.text, fontSize: 12, fontWeight: '700' },
        button: { marginTop: spacing.sm },
        statusBadge: {
          padding: spacing.sm,
          borderRadius: borderRadius.sm,
          alignItems: 'center',
          ...cardBorder(1),
        },
        pendingBadge: {
          backgroundColor: colors.secondary,
        },
        completedBadge: {
          backgroundColor: colors.bgCardLight,
        },
        statusText: { color: colors.text, fontWeight: '600' },
        tabs: { gap: spacing.sm, marginBottom: spacing.md },
        tab: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.bgCard,
          ...cardBorder(1),
        },
        tabActive: {
          backgroundColor: colors.primary,
          borderTopColor: colors.primaryLight,
          borderLeftColor: colors.primaryLight,
          borderBottomColor: colors.primaryDark,
          borderRightColor: colors.primaryDark,
        },
        tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
        tabTextActive: { color: colors.text },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  return (
    <FadeInUp index={index} style={styles.cardWrap}>
      <Card style={styles.card} glow={isPending}>
        <View style={styles.header}>
          <RtlText style={styles.title}>{task.title}</RtlText>
          {task.description ? (
            <RtlText style={styles.description}>{task.description}</RtlText>
          ) : null}
          <View style={[styles.meta, rtl.row]}>
            <Text style={styles.points}>+{task.points} {pointsEmoji}</Text>
            <View style={styles.categoryBadge}>
              <Text style={[styles.categoryText, rtl.text]}>
                {icon} {cat?.label}
              </Text>
            </View>
            {task.recurrence === 'daily' ? (
              <View style={styles.categoryBadge}>
                <Text style={[styles.categoryText, rtl.text]}>🔁 {TASK_RECURRENCE.daily.label}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {isPending ? (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <Text style={[styles.statusText, rtl.textCenter]}>⏳ {t('pending')}</Text>
          </View>
        ) : isCompleted ? (
          <View style={[styles.statusBadge, styles.completedBadge]}>
            <Text style={[styles.statusText, rtl.textCenter]}>✓ {completedLabel(task.recurrence)}</Text>
          </View>
        ) : (
          <Button
            title={t('complete')}
            onPress={() => onComplete(task)}
            loading={loading}
            style={styles.button}
          />
        )}
      </Card>
    </FadeInUp>
  );
}

interface CategoryTabsProps {
  selected: TaskCategory | 'all';
  onSelect: (cat: TaskCategory | 'all') => void;
}

export function CategoryTabs({ selected, onSelect }: CategoryTabsProps) {
  const { colors, borderRadius, cardBorder, allCategoryIcon, taskCategoryIcons, id: themeId } = useTheme();
  const categories: (TaskCategory | 'all')[] = ['all', 'home', 'school', 'social', 'hobby', 'sport'];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tabs: { gap: spacing.sm, marginBottom: spacing.md },
        tab: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.bgCard,
          ...cardBorder(1),
        },
        tabActive: {
          backgroundColor: colors.primary,
          borderTopColor: colors.primaryLight,
          borderLeftColor: colors.primaryLight,
          borderBottomColor: colors.primaryDark,
          borderRightColor: colors.primaryDark,
        },
        tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
        tabTextActive: { color: colors.text },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  return (
    <View style={[styles.tabs, rtl.tabs]}>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat}
          style={[styles.tab, selected === cat && styles.tabActive]}
          onPress={() => onSelect(cat)}
        >
          <Text style={[styles.tabText, rtl.text, selected === cat && styles.tabTextActive]}>
            {cat === 'all'
              ? `${allCategoryIcon} ${t('allCategories')}`
              : `${taskCategoryIcons[cat]} ${TASK_CATEGORIES[cat].label}`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
