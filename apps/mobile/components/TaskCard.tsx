import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TASK_CATEGORIES } from '@kidsapp/shared';
import type { Task, TaskCategory } from '@kidsapp/shared';
import { Card } from './Card';
import { Button } from './Button';
import { RtlText } from './RtlText';
import { colors, spacing, borderRadius } from '../constants/theme';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';

interface TaskCardProps {
  task: Task;
  onComplete: (task: Task) => void;
  loading?: boolean;
  pending?: boolean;
}

export function TaskCard({ task, onComplete, loading, pending }: TaskCardProps) {
  const cat = TASK_CATEGORIES[task.category as TaskCategory];

  return (
    <Card style={styles.card} glow={pending}>
      <View style={[styles.header, rtl.cardRow]}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>{task.icon || cat?.icon || '⭐'}</Text>
        </View>
        <View style={styles.info}>
          <RtlText style={styles.title}>{task.title}</RtlText>
          {task.description ? (
            <RtlText style={styles.description}>{task.description}</RtlText>
          ) : null}
          <View style={[styles.meta, rtl.row]}>
            <Text style={styles.points}>+{task.points} ⭐</Text>
            <View style={styles.categoryBadge}>
              <Text style={[styles.categoryText, rtl.text]}>{cat?.label}</Text>
            </View>
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
            {cat === 'all' ? t('allCategories') : TASK_CATEGORIES[cat].icon}{' '}
            {cat === 'all' ? '' : TASK_CATEGORIES[cat].label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    alignSelf: 'stretch',
  },
  header: {
    marginBottom: spacing.md,
    width: '100%',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgCardLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: spacing.md,
  },
  icon: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
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
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  points: {
    color: colors.gold,
    fontWeight: '700',
    fontSize: 14,
  },
  button: {
    marginTop: spacing.sm,
  },
  pendingBadge: {
    backgroundColor: '#422006',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  pendingText: {
    color: colors.secondary,
    fontWeight: '600',
  },
  tabs: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
