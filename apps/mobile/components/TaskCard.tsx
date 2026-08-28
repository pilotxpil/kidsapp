import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TASK_CATEGORIES, taskCategoryIcon } from '@kidsapp/shared';
import type { Task, TaskCategory } from '@kidsapp/shared';
import { Card } from './Card';
import { Button } from './Button';
import { RtlText } from './RtlText';
import { FadeInUp } from './animations/FadeInUp';
import { colors, spacing, borderRadius, blockBorder } from '../constants/theme';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';

interface TaskCardProps {
  task: Task;
  onComplete: (task: Task) => void;
  loading?: boolean;
  pending?: boolean;
  index?: number;
}

export function TaskCard({ task, onComplete, loading, pending, index = 0 }: TaskCardProps) {
  const cat = TASK_CATEGORIES[task.category as TaskCategory];
  const categoryIcon = taskCategoryIcon(task.category as TaskCategory);

  return (
    <FadeInUp index={index} style={styles.cardWrap}>
      <Card style={styles.card} glow={pending}>
        <View style={styles.header}>
          <RtlText style={styles.title}>{task.title}</RtlText>
          {task.description ? (
            <RtlText style={styles.description}>{task.description}</RtlText>
          ) : null}
          <View style={[styles.meta, rtl.row]}>
            <Text style={styles.points}>+{task.points} 💎</Text>
            <View style={styles.categoryBadge}>
              <Text style={[styles.categoryText, rtl.text]}>
                {categoryIcon} {cat?.label}
              </Text>
            </View>
          </View>
        </View>
        {pending ? (
          <View style={styles.pendingBadge}>
            <Text style={[styles.pendingText, rtl.textCenter]}>⏳ {t('pending')}</Text>
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
  const categories: (TaskCategory | 'all')[] = ['all', 'home', 'school', 'social', 'hobby', 'sport'];

  return (
    <View style={[styles.tabs, rtl.tabs]}>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat}
          style={[styles.tab, selected === cat && styles.tabActive]}
          onPress={() => onSelect(cat)}
        >
          <Text style={[styles.tabText, rtl.text, selected === cat && styles.tabTextActive]}>
            {cat === 'all' ? `🧱 ${t('allCategories')}` : `${TASK_CATEGORIES[cat].icon} ${TASK_CATEGORIES[cat].label}`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    width: '100%',
    alignSelf: 'stretch',
  },
  card: {
    marginBottom: spacing.md,
    alignSelf: 'stretch',
  },
  header: {
    marginBottom: spacing.md,
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  meta: {
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.bgCardLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    ...blockBorder(1),
  },
  categoryText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  points: {
    color: colors.emerald,
    fontWeight: '700',
    fontSize: 14,
  },
  button: {
    marginTop: spacing.sm,
  },
  pendingBadge: {
    backgroundColor: colors.secondary,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    ...blockBorder(1),
  },
  pendingText: {
    color: colors.text,
    fontWeight: '600',
  },
  tabs: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgCard,
    ...blockBorder(1),
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderTopColor: colors.primaryLight,
    borderLeftColor: colors.primaryLight,
    borderBottomColor: colors.primaryDark,
    borderRightColor: colors.primaryDark,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.text,
  },
});
