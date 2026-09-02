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
import { LEARNING_CATEGORIES, LEARNING_CATEGORY_ORDER, packDisplayTitle, packDisplaySubtitle } from '@kidsapp/shared';
import type { LearningPackSummary, LearningCategory } from '@kidsapp/shared';
import { spacing } from '../../../constants/theme';
import { useTheme } from '../../../lib/theme-context';
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
  const { user } = useAuth();
  const router = useRouter();
  const { colors, borderRadius, id: themeId } = useTheme();
  const type = useType();
  const [packs, setPacks] = useState<LearningPackSummary[]>([]);
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg },
        header: { marginBottom: spacing.sm, alignItems: 'flex-start' },
        empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
        categoryBlock: { marginBottom: spacing.lg },
        packCard: { marginBottom: spacing.sm },
        packRow: { gap: spacing.md, alignItems: 'center', width: '100%' },
        packInfo: { flex: 1, minWidth: 0 },
        packTitle: { color: colors.text, fontSize: 17, fontWeight: '700', ...type.title },
        packMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4, ...type.body },
        progressBar: {
          height: 5,
          backgroundColor: colors.bgDeep,
          borderRadius: borderRadius.full,
          marginTop: spacing.sm,
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
        pointsMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
      }),
    [themeId, colors, borderRadius, type.title, type.body, type.ui]
  );

  const load = useCallback(async () => {
    const res = await api.getLearningPacks();
    setPacks(res.packs);
    setAssignedOnly(!!res.assignedOnly);
  }, []);

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
                      onPress={() => router.push(`/(kid)/learn/${pack.id}`)}
                      activeOpacity={0.85}
                    >
                      <Card style={styles.packCard} glow={pack.completed}>
                        <View style={[styles.packRow, rtl.row]}>
                          <View style={styles.packInfo}>
                            <Text style={[styles.packTitle, rtl.text]}>{displayName}</Text>
                            {subtitle ? (
                              <Text style={[styles.packMeta, rtl.text]}>{subtitle}</Text>
                            ) : null}
                            <View style={[styles.pointsMeta, rtl.row]}>
                              <Text style={[styles.packMeta, rtl.text, { marginTop: 0 }]}>
                                {pack.activityCount} {t('questions')}
                                {pack.grade ? ` · ${t('grade')} ${pack.grade}` : ''}
                                {' · '}
                                {pack.defaultPoints}
                              </Text>
                              <PointsMark size={14} />
                            </View>
                            <View style={styles.progressBar}>
                              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                            </View>
                            <Text style={[styles.packMeta, rtl.text]}>
                              {pack.completedCount}/{pack.activityCount} {t('completed')}
                            </Text>
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
