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
import { playSfx } from '../lib/sfx';
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
        cardWrap: { width: '100%', alignSelf: 'stretch', overflow: 'visible' },
        card: {
          marginBottom: spacing.sm,
          alignSelf: 'stretch',
          paddingVertical: 12,
          paddingHorizontal: spacing.sm + 4,
          overflow: 'visible',
        },
        info: { width: '100%', alignItems: 'stretch' },
        title: {
          color: colors.text,
          fontSize: 15,
          fontWeight: '800',
          lineHeight: 22,
          width: '100%',
          ...type.title,
        },
        description: {
          color: colors.textMuted,
          fontSize: 12,
          lineHeight: 18,
          marginTop: 2,
          width: '100%',
          ...type.body,
        },
        footer: {
          width: '100%',
          marginTop: 8,
          gap: spacing.sm,
          alignItems: 'center',
        },
        meta: {
          flex: 1,
          minWidth: 0,
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
        },
        points: { color: colors.gold, fontWeight: '800', fontSize: 13, lineHeight: 18, ...type.title },
        pointsRow: { gap: 3, flexGrow: 0, flexShrink: 0 },
        categoryText: { color: colors.textMuted, fontSize: 11, fontWeight: '700', lineHeight: 16, ...type.ui },
        action: { flexShrink: 0 },
        statusBadge: ember
          ? {
              paddingHorizontal: spacing.sm,
              paddingVertical: 5,
              borderRadius: 999,
              gap: 4,
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.28)',
              flexGrow: 0,
            }
          : {
              paddingHorizontal: spacing.sm,
              paddingVertical: 5,
              borderRadius: borderRadius.full,
              gap: 4,
              flexGrow: 0,
              ...cardBorder(1),
            },
        pendingBadge: { backgroundColor: colors.secondary },
        completedBadge: { backgroundColor: colors.bgCardLight },
        statusText: { color: colors.text, fontWeight: '600', fontSize: 12, ...type.ui },
      }),
    [themeId, colors, borderRadius, cardBorder, ember, type.title, type.body, type.ui]
  );

  const action = isPending ? (
    <View style={[styles.statusBadge, styles.pendingBadge, rtl.rowInline]}>
      {chrome === 'vector' ? <ThemeGlyph name="pending" size={14} color={colors.text} /> : null}
      <Text style={styles.statusText}>{t('pending')}</Text>
    </View>
  ) : isCompleted ? (
    <View style={[styles.statusBadge, styles.completedBadge, rtl.rowInline]}>
      {chrome === 'vector' ? <ThemeGlyph name="check" size={14} color={colors.success} /> : null}
      <Text style={styles.statusText}>{completedLabel(task.recurrence)}</Text>
    </View>
  ) : (
    <Button title={t('complete')} onPress={() => onComplete(task)} loading={loading} compact />
  );

  return (
    <FadeInUp index={index} style={styles.cardWrap}>
      <Card style={styles.card} glow={isPending}>
        <View style={styles.info}>
          <RtlText style={styles.title} numberOfLines={3}>
            {task.title}
          </RtlText>
          {task.description ? (
            <RtlText style={styles.description} numberOfLines={2}>
              {task.description}
            </RtlText>
          ) : null}
          <View style={[styles.footer, rtl.headerSplit]}>
            <View style={styles.action}>{action}</View>
            <View style={[styles.meta, rtl.rowInline]}>
              <View style={[styles.pointsRow, rtl.rowInline]}>
                <Text style={styles.points}>+{task.points}</Text>
                <PointsMark size={12} />
              </View>
              <CategoryGlyph category={task.category as TaskCategory} size={12} color={colors.accent} />
              <Text style={styles.categoryText}>{cat?.label}</Text>
              {task.recurrence === 'daily' ? (
                <Text style={styles.categoryText}>· {TASK_RECURRENCE.daily.label}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </Card>
    </FadeInUp>
  );
}

interface TaskSectionHeaderProps {
  title: string;
  icon: string;
  count: number;
  style?: object;
}

export function TaskSectionHeader({ title, icon, count, style }: TaskSectionHeaderProps) {
  const { colors, id: themeId } = useTheme();
  const type = useType();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width: '100%',
          marginTop: spacing.sm,
          marginBottom: 6,
          paddingBottom: 4,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        title: {
          color: colors.text,
          fontSize: 14,
          fontWeight: '800',
          lineHeight: 20,
          flexShrink: 1,
          ...type.title,
        },
        icon: { fontSize: 14 },
        count: {
          color: colors.textMuted,
          fontSize: 12,
          fontWeight: '700',
          ...type.ui,
        },
        lead: { alignItems: 'center', gap: 6 },
      }),
    [themeId, colors, type.title, type.ui]
  );

  return (
    <View style={[styles.wrap, rtl.headerSplit, style]}>
      <Text style={styles.count}>{count}</Text>
      <View style={[styles.lead, rtl.rowInline]}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.title, rtl.text]}>{title}</Text>
      </View>
    </View>
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
        tabs: { gap: 6, marginBottom: spacing.sm },
        tab: ember
          ? {
              paddingHorizontal: spacing.sm,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(12,8,6,0.7)',
              gap: 4,
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.28)',
              alignSelf: 'flex-start',
              flexGrow: 0,
              flexShrink: 0,
            }
          : {
              paddingHorizontal: spacing.sm,
              paddingVertical: 5,
              borderRadius: borderRadius.sm,
              backgroundColor: colors.bgCard,
              gap: 4,
              alignSelf: 'flex-start',
              flexGrow: 0,
              flexShrink: 0,
              ...cardBorder(1),
            },
        tabActive: ember
          ? {
              backgroundColor: colors.primary,
              borderColor: colors.primaryLight,
            }
          : {
              backgroundColor: colors.primary,
              borderTopColor: colors.primaryLight,
              borderLeftColor: colors.primaryLight,
              borderBottomColor: colors.primaryDark,
              borderRightColor: colors.primaryDark,
            },
        tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '600', ...type.ui },
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
          onPress={() => {
            playSfx('tap');
            onSelect(cat);
          }}
        >
          <CategoryGlyph
            category={cat}
            size={12}
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
