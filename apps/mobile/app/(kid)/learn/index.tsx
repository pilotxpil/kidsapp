import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/auth';
import { api } from '../../../lib/api';
import { useFocusLoad } from '../../../hooks/useFocusLoad';
import { Card } from '../../../components/Card';
import { PointsBadge } from '../../../components/Card';
import { ThemedScreen } from '../../../components/ThemedScreen';
import { SectionHeader } from '../../../components/ThemedHero';
import { LEARNING_CATEGORIES, LEARNING_CATEGORY_ORDER, LEARNING_PACK_KIND_LABELS, packDisplayTitle, packDisplaySubtitle, formatGradeLabel } from '@kidsapp/shared';
import type { LearningPackSummary, LearningCategory } from '@kidsapp/shared';
import { spacing } from '../../../constants/theme';
import { useTheme } from '../../../lib/theme-context';
import { playSfx } from '../../../lib/sfx';
import { useType } from '../../../lib/typography';
import { rtl } from '../../../lib/rtl';
import { t } from '../../../lib/i18n';
import { PointsMark } from '../../../components/icons/ThemeGlyph';

function groupByCategory(packs: LearningPackSummary[]): Map<LearningCategory, LearningPackSummary[]> {
  const map = new Map<LearningCategory, LearningPackSummary[]>();
  for (const pack of packs) {
    const list = map.get(pack.category) ?? [];
    list.push(pack);
    map.set(pack.category, list);
  }
  return map;
}

export default function LearnIndexScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const { colors, borderRadius, id: themeId } = useTheme();
  const type = useType();
  const [packs, setPacks] = useState<LearningPackSummary[]>([]);
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.md },
        header: { marginBottom: spacing.sm, alignItems: 'flex-start' },
        empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
        categoryBlock: { marginBottom: spacing.md },
        packCard: {
          marginBottom: 6,
          maxWidth: '100%',
          paddingVertical: 10,
          paddingHorizontal: spacing.sm + 4,
        },
        packRow: { gap: spacing.sm, alignItems: 'center', width: '100%', maxWidth: '100%' },
        packInfo: { flex: 1, minWidth: 0, maxWidth: '100%' },
        packTitle: { color: colors.text, fontSize: 15, fontWeight: '800', flexShrink: 1, ...type.title },
        packMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2, ...type.body },
        progressBar: {
          height: 4,
          backgroundColor: colors.bgDeep,
          borderRadius: borderRadius.full,
          marginTop: 4,
          overflow: 'hidden',
        },
        progressFill: {
          height: '100%',
          backgroundColor: colors.success,
          borderRadius: borderRadius.full,
        },
        doneBadge: {
          backgroundColor: colors.success,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderRadius: borderRadius.sm,
        },
        doneText: { color: colors.textDark, fontSize: 11, fontWeight: '700', ...type.ui },
        chevron: { color: colors.textMuted, fontSize: 18, fontWeight: '700' },
        pointsMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' },
      }),
    [themeId, colors, borderRadius, type.title, type.body, type.ui]
  );

  const load = useCallback(async () => {
    const [, res] = await Promise.all([refreshUser(), api.getLearningPacks()]);
    setPacks(res.packs);
    setAssignedOnly(!!res.assignedOnly);
  }, [refreshUser]);

  useFocusLoad(load, !!user);

  const grouped = useMemo(() => groupByCategory(packs), [packs]);

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
        <View style={[styles.header, rtl.headerSplit]}>
          <PointsBadge points={user?.points || 0} />
          <View style={{ flex: 1 }}>
            <SectionHeader title={t('learn')} icon="📚" />
          </View>
        </View>

        {packs.length === 0 ? (
          <Text style={styles.empty}>
            {assignedOnly ? t('noLearningAssignedKid') : t('noLearningPacks')}
          </Text>
        ) : (
          LEARNING_CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((categoryId) => {
            const category = LEARNING_CATEGORIES[categoryId];
            const items = grouped.get(categoryId)!;

            return (
              <View key={categoryId} style={styles.categoryBlock}>
                <SectionHeader title={category.label} icon={category.icon} />
                {items.map((pack) => {
                  const progressPct =
                    pack.activityCount > 0 ? (pack.completedCount / pack.activityCount) * 100 : 0;
                  const displayName = packDisplayTitle(pack.title);
                  const subtitle = packDisplaySubtitle(pack.title);

                  return (
                    <TouchableOpacity
                      key={pack.id}
                      onPress={() => {
                        playSfx('tap');
                        router.push(`/(kid)/learn/${pack.id}`);
                      }}
                      activeOpacity={0.85}
                    >
                      <Card style={styles.packCard} glow={pack.completed}>
                        <View style={[styles.packRow, rtl.row]}>
                          <View style={styles.packInfo}>
                            <Text style={[styles.packTitle, rtl.text]} numberOfLines={1}>
                              {displayName}
                            </Text>
                            {subtitle ? (
                              <Text style={[styles.packMeta, rtl.text]} numberOfLines={1}>
                                {subtitle}
                              </Text>
                            ) : null}
                            <View style={[styles.pointsMeta, rtl.rowInline]}>
                              <Text style={[styles.packMeta, rtl.text, { marginTop: 0 }]} numberOfLines={1}>
                                {LEARNING_PACK_KIND_LABELS[pack.kind]}
                                {' · '}
                                {pack.completedCount}/{pack.activityCount}
                                {pack.grade ? ` · ${formatGradeLabel(pack.grade, t('grade'))}` : ''}
                                {` · ${pack.pointsPerActivity}`}
                              </Text>
                              <PointsMark size={12} />
                            </View>
                            <View style={styles.progressBar}>
                              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                            </View>
                          </View>
                          {pack.completed ? (
                            <View style={styles.doneBadge}>
                              <Text style={styles.doneText}>{t('packDone')}</Text>
                            </View>
                          ) : (
                            <Text style={styles.chevron}>‹</Text>
                          )}
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>
    </ThemedScreen>
  );
}
