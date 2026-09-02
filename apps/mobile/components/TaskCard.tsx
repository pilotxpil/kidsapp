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
import { useType } from '../lib/typography';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';
import { CategoryGlyph, PointsMark, ThemeGlyph } from './icons/ThemeGlyph';

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
  const { colors, borderRadius, cardBorder, id: themeId, chrome } = useTheme();
  const type = useType();
  const ember = themeId === 'ember';
  const cat = TASK_CATEGORIES[task.category as TaskCategory];
  const isPending = task.completionStatus === 'pending';
  const isCompleted = task.completionStatus === 'completed';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cardWrap: { width: '100%', alignSelf: 'stretch' },
        card: { marginBottom: spacing.md, alignSelf: 'stretch' },
        header: { marginBottom: spacing.md, width: '100%', maxWidth: '100%' },
        title: { color: colors.text, fontSize: 19, fontWeight: '800', ...type.title },
        description: { color: colors.textMuted, fontSize: 14, marginTop: 4, ...type.body },
        meta: {
          alignItems: 'flex-start',
          marginTop: spacing.sm,
          gap: spacing.sm,
          flexWrap: 'wrap',
          width: '100%',
        },
        categoryBadge: ember
          ? {
              backgroundColor: 'rgba(255,90,0,0.12)',
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
              borderRadius: 999,
              gap: 4,
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.32)',
              alignSelf: 'flex-start',
              flexGrow: 0,
              flexShrink: 0,
            }
          : {
              backgroundColor: colors.bgCardLight,
              paddingHorizontal: spacing.sm,
              paddingVertical: 5,
              borderRadius: borderRadius.sm,
              gap: 4,
              alignSelf: 'flex-start',
              flexGrow: 0,
              flexShrink: 0,
              ...cardBorder(1),
              shadowColor: colors.glow,
              shadowOpacity: 0.2,
              shadowRadius: 4,
            },
        points: { color: colors.gold, fontWeight: '800', fontSize: 15, ...type.title },
        pointsRow: { gap: 4, alignSelf: 'flex-start', flexGrow: 0, flexShrink: 0 },
        categoryText: { color: colors.text, fontSize: 12, fontWeight: '700', ...type.ui },
        button: { marginTop: spacing.sm, alignSelf: 'stretch', width: '100%' },
        statusBadge: ember
          ? {
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: 999,
              gap: 6,
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.28)',
              alignSelf: 'flex-start',
              flexGrow: 0,
            }
          : {
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.full,
              gap: 6,
              alignSelf: 'flex-start',
              flexGrow: 0,
              ...cardBorder(1),
            },
        pendingBadge: {
          backgroundColor: colors.secondary,
        },
        completedBadge: {
          backgroundColor: colors.bgCardLight,
        },
        statusText: { color: colors.text, fontWeight: '600', ...type.ui },
      }),
    [themeId, colors, borderRadius, cardBorder, ember, type.title, type.body, type.ui]
  );

  return (
    <FadeInUp index={index} style={styles.cardWrap}>
      <Card style={styles.card} glow={isPending}>
        <View style={styles.header}>
          <RtlText style={styles.title} numberOfLines={3}>
            {task.title}
          </RtlText>
          {task.description ? (
            <RtlText style={styles.description}>{task.description}</RtlText>
          ) : null}
          <View style={[styles.meta, rtl.row]}>
            <View style={[styles.pointsRow, rtl.rowInline]}>
              <Text style={styles.points}>+{task.points}</Text>
              <PointsMark size={14} />
            </View>
            <View style={[styles.categoryBadge, rtl.rowInline]}>
              <CategoryGlyph category={task.category as TaskCategory} size={14} color={colors.accent} />
              <Text style={styles.categoryText}>{cat?.label}</Text>
            </View>
            {task.recurrence === 'daily' ? (
              <View style={[styles.categoryBadge, rtl.rowInline]}>
                <Text style={styles.categoryText}>{TASK_RECURRENCE.daily.label}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {isPending ? (
          <View style={[styles.statusBadge, styles.pendingBadge, rtl.rowInline]}>
            {chrome === 'vector' ? <ThemeGlyph name="pending" size={16} color={colors.text} /> : null}
            <Text style={styles.statusText}>{t('pending')}</Text>
          </View>
        ) : isCompleted ? (
          <View style={[styles.statusBadge, styles.completedBadge, rtl.rowInline]}>
            {chrome === 'vector' ? <ThemeGlyph name="check" size={16} color={colors.success} /> : null}
            <Text style={styles.statusText}>{completedLabel(task.recurrence)}</Text>
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
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();
  const type = useType();
  const ember = themeId === 'ember';
  const categories: (TaskCategory | 'all')[] = ['all', 'home', 'school', 'social', 'hobby', 'sport'];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tabs: { gap: spacing.sm, marginBottom: spacing.md },
        tab: ember
          ? {
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: 999,
              backgroundColor: 'rgba(12,8,6,0.7)',
              gap: 6,
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.28)',
              alignSelf: 'flex-start',
              flexGrow: 0,
              flexShrink: 0,
            }
          : {
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.sm,
              backgroundColor: colors.bgCard,
              gap: 6,
              alignSelf: 'flex-start',
              flexGrow: 0,
              flexShrink: 0,
              ...cardBorder(1),
            },
        tabActive: ember
          ? {
              backgroundColor: colors.primary,
              borderColor: colors.primaryLight,
              shadowColor: colors.glow,
              shadowOpacity: 0.75,
              shadowRadius: 10,
              elevation: 8,
            }
          : {
              backgroundColor: colors.primary,
              borderTopColor: colors.primaryLight,
              borderLeftColor: colors.primaryLight,
              borderBottomColor: colors.primaryDark,
              borderRightColor: colors.primaryDark,
            },
        tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600', ...type.ui },
        tabTextActive: { color: ember ? colors.textDark : colors.text },
      }),
    [themeId, colors, borderRadius, cardBorder, ember, type.ui]
  );

  return (
    <View style={[styles.tabs, rtl.tabs]}>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat}
          style={[styles.tab, selected === cat && styles.tabActive, rtl.rowInline]}
          onPress={() => onSelect(cat)}
        >
          <CategoryGlyph
            category={cat}
            size={14}
            color={selected === cat ? colors.textDark : colors.textMuted}
          />
          <Text style={[styles.tabText, rtl.text, selected === cat && styles.tabTextActive]}>
            {cat === 'all' ? t('allCategories') : TASK_CATEGORIES[cat].label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
