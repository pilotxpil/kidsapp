import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { KeyboardSheet } from '../../components/KeyboardSheet';
import { ThemedScreen } from '../../components/ThemedScreen';
import { ScreenReveal, ScreenSkeleton } from '../../components/ScreenSkeleton';
import { ScreenCacheKey, hasScreenCache, readScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { SectionHeader } from '../../components/ThemedHero';
import {
  LEARNING_CATEGORIES,
  LEARNING_CATEGORY_ORDER,
  LEARNING_DIFFICULTY_LABELS,
  LEARNING_PACK_KIND_LABELS,
  GRADE_OPTIONS,
  GRADE_LETTERS,
  formatGradeLabel,
  packDisplayTitle,
  packDisplaySubtitle,
} from '@kidsapp/shared';
import type {
  LearningCatalogItem,
  LearningCategory,
  LearningPack,
  LearningActivity,
  LearningAnswerReview,
  User,
} from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';
import { KidAvatar } from '../../components/KidAvatar';

function groupByCategory(items: LearningCatalogItem[]): Map<LearningCategory, LearningCatalogItem[]> {
  const map = new Map<LearningCategory, LearningCatalogItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return map;
}

function activityAnswerLabel(activity: LearningActivity): string {
  if (activity.type === 'multiple_choice') {
    return activity.options.find((o) => o.id === activity.answer)?.text ?? activity.answer;
  }
  if (activity.type === 'select_all') {
    return activity.answer
      .map((id) => activity.options.find((o) => o.id === id)?.text ?? id)
      .join(' · ');
  }
  if (activity.type === 'open_words') {
    return activity.accept.map((item) => item.split('|')[0]?.trim() ?? item).join(' · ');
  }
  if (activity.type === 'fill_blank') {
    return activity.answer.join(' / ');
  }
  return activity.answer.text;
}

export default function ParentLearnScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const { colors, borderRadius, cardBorder, pointsEmoji, id: themeId } = useTheme();
  type LearnCache = { kids: User[]; items: LearningCatalogItem[] };
  const hadCache = useRef(hasScreenCache(ScreenCacheKey.parentLearn)).current;
  const cachedLearn = useRef(readScreenCache<LearnCache>(ScreenCacheKey.parentLearn)).current;
  const [items, setItems] = useState<LearningCatalogItem[]>(cachedLearn?.items ?? []);
  const [kids, setKids] = useState<User[]>(cachedLearn?.kids ?? []);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<LearningCategory | null>(null);
  const [gradeFilter, setGradeFilter] = useState<number[]>([]);
  const [previewItem, setPreviewItem] = useState<LearningCatalogItem | null>(null);
  const [previewPack, setPreviewPack] = useState<LearningPack | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [savingPackId, setSavingPackId] = useState<string | null>(null);
  const [resultsKidId, setResultsKidId] = useState<string | null>(null);
  const [results, setResults] = useState<LearningAnswerReview[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsFilter, setResultsFilter] = useState<'all' | 'wrong' | 'correct'>('all');
  const [review, setReview] = useState<LearningAnswerReview | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [catalogReady, setCatalogReady] = useState(hadCache);
  const showSkeleton = !catalogReady && !hadCache;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
        hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
        chipRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
        filterRow: {
          width: '100%',
          marginBottom: spacing.sm,
          gap: 4,
          alignItems: 'center',
        },
        filterChip: {
          flex: 1,
          minWidth: 0,
          paddingVertical: 6,
          paddingHorizontal: 2,
          borderRadius: borderRadius.full,
          backgroundColor: colors.bgCard,
          alignItems: 'center',
          justifyContent: 'center',
          ...cardBorder(1),
        },
        filterChipText: {
          color: colors.textMuted,
          fontSize: 11,
          fontWeight: '700',
          textAlign: 'center',
        },
        gradeLabel: {
          color: colors.text,
          fontSize: 12,
          fontWeight: '800',
          flexShrink: 0,
          paddingHorizontal: 2,
        },
        previewBody: {
          flexShrink: 1,
          minHeight: 0,
          maxHeight: Math.min(520, Math.round(windowHeight * 0.62)),
        },
        previewQ: {
          marginBottom: spacing.md,
          paddingBottom: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        previewPrompt: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: spacing.xs },
        previewOption: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
        previewCorrect: { color: colors.success, fontSize: 13, fontWeight: '800', marginTop: 4 },
        previewPassage: {
          color: colors.text,
          fontSize: 14,
          lineHeight: 22,
          marginBottom: spacing.md,
        },
        chip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          backgroundColor: colors.bgCard,
          ...cardBorder(1),
        },
        chipActive: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
        chipTextActive: { color: colors.textDark },
        categoryBlock: { marginBottom: spacing.lg },
        packCard: { marginBottom: spacing.sm },
        packInfo: { width: '100%' },
        packTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
        packMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
        assignRow: { marginTop: spacing.sm, gap: spacing.xs },
        packActions: {
          marginTop: spacing.sm,
          gap: spacing.sm,
          flexWrap: 'wrap',
          alignItems: 'center',
        },
        packEditBtn: { alignSelf: 'stretch', width: '100%' },
        kidChip: {
          backgroundColor: colors.bgDeep,
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: borderRadius.full,
          alignSelf: 'flex-start',
          alignItems: 'center',
          gap: 4,
          borderWidth: 2,
          borderColor: 'transparent',
        },
        kidChipOn: {
          backgroundColor: colors.primary + '33',
          borderWidth: 2,
          borderColor: colors.primary,
        },
        kidChipText: { color: colors.text, fontSize: 13, fontWeight: '700' },
        kidChipTag: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
        empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        modalBackdrop: { ...StyleSheet.absoluteFill },
        modal: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          maxWidth: 480,
          width: '100%',
          maxHeight: Math.round(windowHeight * 0.88),
          alignSelf: 'center',
          overflow: 'hidden',
          ...cardBorder(2),
        },
        modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md },
        modalActions: { marginTop: spacing.lg, gap: spacing.sm },
        resultBadge: {
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderRadius: borderRadius.sm,
          marginBottom: spacing.xs,
        },
        resultBadgeOk: { backgroundColor: colors.success + '33' },
        resultBadgeBad: { backgroundColor: colors.danger + '33' },
        resultBadgeText: { fontSize: 12, fontWeight: '800', color: colors.text },
        resultLine: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
        resultLineStrong: { color: colors.text, fontSize: 13, marginTop: 4, fontWeight: '600' },
      }),
    [themeId, colors, borderRadius, cardBorder, windowHeight]
  );

  const loadKids = useCallback(async () => {
    const res = await api.getKids();
    setKids(res.kids);
    setResultsKidId((prev) => prev || res.kids[0]?._id || null);
    const prev = readScreenCache<LearnCache>(ScreenCacheKey.parentLearn) ?? { kids: [], items: [] };
    writeScreenCache(ScreenCacheKey.parentLearn, { ...prev, kids: res.kids });
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const res = await api.getLearningCatalog({
        search: search.trim() || undefined,
        category: categoryFilter ?? undefined,
        grades: gradeFilter.length ? gradeFilter : undefined,
      });
      setItems(res.items);
      if (!search.trim() && !categoryFilter && gradeFilter.length === 0) {
        const prev = readScreenCache<LearnCache>(ScreenCacheKey.parentLearn) ?? { kids: [], items: [] };
        writeScreenCache(ScreenCacheKey.parentLearn, { ...prev, items: res.items });
      }
    } finally {
      setCatalogReady(true);
    }
  }, [search, categoryFilter, gradeFilter]);

  useFocusLoad(loadKids);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCatalog();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadCatalog]);

  useEffect(() => {
    if (!resultsKidId) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setResultsLoading(true);
    api
      .getLearningResults(resultsKidId)
      .then((res) => {
        if (!cancelled) setResults(res.results);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setResultsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resultsKidId]);

  const filteredResults = useMemo(() => {
    if (resultsFilter === 'wrong') return results.filter((r) => !r.correct);
    if (resultsFilter === 'correct') return results.filter((r) => r.correct);
    return results;
  }, [results, resultsFilter]);

  const grouped = useMemo(() => groupByCategory(items), [items]);

  const toggleGrade = (grade: number) => {
    setGradeFilter((prev) => {
      const next = prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade].sort();
      return next.length === GRADE_OPTIONS.length ? [] : next;
    });
  };

  const openPreview = async (item: LearningCatalogItem) => {
    setPreviewItem(item);
    setPreviewPack(null);
    setPreviewLoading(true);
    try {
      const res = await api.exportLearningPack(item.id);
      setPreviewPack(res.pack);
    } catch (err: unknown) {
      setPreviewItem(null);
      alert(err instanceof Error ? err.message : 'שגיאה');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewItem(null);
    setPreviewPack(null);
  };

  const openPackFromReview = () => {
    if (!review) return;
    const item = items.find((i) => i.id === review.packId);
    setReview(null);
    if (item) void openPreview(item);
  };

  const toggleKidAssign = async (item: LearningCatalogItem, kidId: string) => {
    if (savingPackId) return;
    const next = item.assignedKidIds.includes(kidId)
      ? item.assignedKidIds.filter((id) => id !== kidId)
      : [...item.assignedKidIds, kidId];
    setSavingPackId(item.id);
    setItems((prev) =>
      prev.map((pack) => (pack.id === item.id ? { ...pack, assignedKidIds: next } : pack))
    );
    try {
      await api.assignLearningPack(item.id, next, {
        pointsPerActivity: item.pointsPerActivity ?? item.defaultPoints,
        difficulty: item.difficulty ?? 'medium',
      });
      await loadCatalog();
    } catch (err: unknown) {
      await loadCatalog();
      alert(err instanceof Error ? err.message : 'שגיאה');
    } finally {
      setSavingPackId(null);
    }
  };

  const handleImportJson = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const parsed = JSON.parse(importText);
      const payload = parsed?.pack ? parsed : parsed;
      const res = await api.importLearningPacks(payload);
      setImportOpen(false);
      setImportText('');
      await loadCatalog();
      alert(t('learningPackImported').replace('{n}', String(res.packs.length)));
      if (res.errors?.length) {
        Alert.alert(t('importLearningPack'), res.errors.join('\n'));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'JSON לא תקין');
    } finally {
      setImporting(false);
    }
  };

  const pickImportFileWeb = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      setImportOpen(true);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setImportText(String(reader.result ?? ''));
        setImportOpen(true);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <ThemedScreen tabs>
      <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
        <SectionHeader title={t('learningCatalog')} icon="📚" />
        <Text style={[styles.hint, rtl.text]}>{t('learningCatalogHint')}</Text>

        <View style={[styles.chipRow, { marginBottom: spacing.lg }]}>
          <Button
            title={t('createLearningPack')}
            onPress={() => router.push('/(parent)/learn-pack-edit')}
            style={{ flexGrow: 1 }}
          />
          <Button
            title={t('importLearningPack')}
            variant="secondary"
            onPress={pickImportFileWeb}
            style={{ flexGrow: 1 }}
          />
        </View>

        {kids.length > 0 ? (
          <View style={{ marginBottom: spacing.lg }}>
            <SectionHeader title={t('learningResults')} icon="📝" />
            <Text style={[styles.hint, rtl.text]}>{t('learningResultsHint')}</Text>
            <View style={[styles.chipRow, rtl.chips]}>
              {kids.map((kid) => (
                <TouchableOpacity
                  key={kid._id}
                  style={[styles.chip, resultsKidId === kid._id && styles.chipActive]}
                  onPress={() => setResultsKidId(kid._id)}
                >
                  <View style={[rtl.rowInline, { gap: 6 }]}>
                    <KidAvatar avatar={kid.avatar} size={22} />
                    <Text style={[styles.chipText, resultsKidId === kid._id && styles.chipTextActive]}>
                      {kid.displayName}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.chipRow, rtl.chips]}>
              {(
                [
                  ['all', t('filterAllAnswers')],
                  ['wrong', t('filterWrongOnly')],
                  ['correct', t('filterCorrectOnly')],
                ] as const
              ).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, resultsFilter === key && styles.chipActive]}
                  onPress={() => setResultsFilter(key)}
                >
                  <Text style={[styles.chipText, resultsFilter === key && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {resultsLoading ? (
              <Text style={styles.empty}>...</Text>
            ) : filteredResults.length === 0 ? (
              <Text style={[styles.empty, rtl.text]}>{t('noLearningResults')}</Text>
            ) : (
              filteredResults.slice(0, 30).map((r) => (
                <Pressable
                  key={`${r.packId}:${r.activityId}:${r.answeredAt}`}
                  onPress={() => setReview(r)}
                  accessibilityRole="button"
                >
                <Card style={styles.packCard}>
                  <View
                    style={[
                      styles.resultBadge,
                      r.correct ? styles.resultBadgeOk : styles.resultBadgeBad,
                    ]}
                  >
                    <Text style={[styles.resultBadgeText, rtl.text]}>
                      {r.correct ? `✓ ${t('answerCorrect')}` : `✗ ${t('answerIncorrect')}`}
                    </Text>
                  </View>
                  <Text style={[styles.packTitle, rtl.text]}>{r.packTitle}</Text>
                  <Text style={[styles.packMeta, rtl.text]}>{r.questionPreview}</Text>
                  <Text style={[styles.resultLineStrong, rtl.text]}>
                    {t('kidAnswered')}: {r.selectedText}
                  </Text>
                  {!r.correct ? (
                    <Text style={[styles.resultLine, rtl.text]}>
                      {t('correctWas')}: {r.correctText}
                    </Text>
                  ) : null}
                  <Text style={[styles.packMeta, rtl.text]}>{t('tapToReviewMistake')}</Text>
                </Card>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        <Input
          label={t('searchLearning')}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />

        <View style={[styles.filterRow, rtl.chips]}>
          <Pressable
            style={[styles.filterChip, !categoryFilter && styles.chipActive]}
            onPress={() => setCategoryFilter(null)}
          >
            <Text
              numberOfLines={1}
              style={[styles.filterChipText, !categoryFilter && styles.chipTextActive]}
            >
              {t('allCategories')}
            </Text>
          </Pressable>
          {LEARNING_CATEGORY_ORDER.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.filterChip, categoryFilter === cat && styles.chipActive]}
              onPress={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
            >
              <Text
                numberOfLines={1}
                style={[styles.filterChipText, categoryFilter === cat && styles.chipTextActive]}
              >
                {LEARNING_CATEGORIES[cat].label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.filterRow, rtl.chips, { marginBottom: spacing.md }]}>
          <Text style={[styles.gradeLabel, rtl.text]}>{t('grade')}</Text>
          {GRADE_OPTIONS.map((g) => {
            const on = gradeFilter.includes(g);
            return (
              <Pressable
                key={g}
                style={[styles.filterChip, on && styles.chipActive]}
                onPress={() => toggleGrade(g)}
              >
                <Text numberOfLines={1} style={[styles.filterChipText, on && styles.chipTextActive]}>
                  {GRADE_LETTERS[g]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {showSkeleton ? (
          <ScreenSkeleton cards={5} />
        ) : (
          <ScreenReveal animate={!hadCache}>
        {items.length === 0 ? (
          <Text style={styles.empty}>{t('noCatalogResults')}</Text>
        ) : (
          LEARNING_CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((categoryId) => (
            <View key={categoryId} style={styles.categoryBlock}>
              <SectionHeader
                title={LEARNING_CATEGORIES[categoryId].label}
                icon={LEARNING_CATEGORIES[categoryId].icon}
              />
              {grouped.get(categoryId)!.map((item) => (
                <Card key={item.id} style={styles.packCard}>
                  <Pressable onPress={() => void openPreview(item)} accessibilityRole="button">
                    <View style={styles.packInfo}>
                      <Text style={[styles.packTitle, rtl.text]}>
                        {packDisplayTitle(item.title)}
                      </Text>
                      {packDisplaySubtitle(item.title) ? (
                        <Text style={[styles.packMeta, rtl.text]}>
                          {packDisplaySubtitle(item.title)}
                        </Text>
                      ) : null}
                      <Text style={[styles.packMeta, rtl.text]}>
                        {item.isCustom ? `${t('customPackBadge')} · ` : ''}
                        {LEARNING_PACK_KIND_LABELS[item.kind]}
                        {' · '}
                        {item.activityCount} {t('questions')}
                        {item.grade ? ` · ${formatGradeLabel(item.grade, t('grade'))}` : ''}
                        {` · ${item.pointsPerActivity ?? item.defaultPoints} ${pointsEmoji}`}
                        {item.difficulty
                          ? ` · ${LEARNING_DIFFICULTY_LABELS[item.difficulty]}`
                          : ''}
                      </Text>
                    </View>
                  </Pressable>
                  <View style={styles.assignRow}>
                    {kids.length === 0 || item.assignedKidIds.length === 0 ? (
                      <Text style={[styles.packMeta, rtl.text]}>{t('notAssigned')}</Text>
                    ) : null}
                    <View style={[rtl.chips, { gap: 6 }]}>
                      {kids.map((kid) => {
                        const assigned = item.assignedKidIds.includes(kid._id);
                        const done = (item.completedKidIds ?? []).includes(kid._id);
                        const past = (item.pastKidIds ?? []).includes(kid._id);
                        const tag = done ? t('packKidDone') : past ? t('packKidPast') : null;
                        return (
                          <Pressable
                            key={kid._id}
                            style={[styles.kidChip, { flexDirection: 'row-reverse' }, assigned && styles.kidChipOn]}
                            onPress={() => void toggleKidAssign(item, kid._id)}
                            disabled={savingPackId === item.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected: assigned }}
                          >
                            <KidAvatar avatar={kid.avatar} size={18} />
                            <Text style={[styles.kidChipText, rtl.text]}>{kid.displayName}</Text>
                            {tag ? (
                              <Text style={[styles.kidChipTag, rtl.text]}>{tag}</Text>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <View style={[styles.packActions, rtl.row]}>
                    <Button
                      title={t('editLearningPack')}
                      variant="outline"
                      onPress={() =>
                        router.push({
                          pathname: '/(parent)/learn-pack-edit',
                          params: { packId: item.id },
                        })
                      }
                      style={styles.packEditBtn}
                    />
                  </View>
                </Card>
              ))}
            </View>
          ))
        )}
          </ScreenReveal>
        )}
      </ScrollView>

      <Modal visible={!!previewItem} transparent animationType="fade" onRequestClose={closePreview}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closePreview} />
          <View style={styles.modal}>
            <Text style={[styles.modalTitle, rtl.text]}>
              {previewItem ? packDisplayTitle(previewItem.title) : ''}
            </Text>
            {previewLoading || !previewPack ? (
              <Text style={[styles.packMeta, rtl.text]}>{t('learningPreviewLoading')}</Text>
            ) : (
              <ScrollView style={styles.previewBody} nestedScrollEnabled showsVerticalScrollIndicator>
                {previewPack.passage?.he ? (
                  <Text style={[styles.previewPassage, rtl.text]}>{previewPack.passage.he}</Text>
                ) : null}
                {previewPack.activities.map((activity, index) => (
                  <View key={activity.id} style={styles.previewQ}>
                    <Text style={[styles.previewPrompt, rtl.text]}>
                      {index + 1}. {activity.prompt.text}
                    </Text>
                    {activity.type === 'select_all' ? (
                      <Text style={[styles.previewCorrect, rtl.text]}>{t('selectAllHint')}</Text>
                    ) : null}
                    {activity.type === 'open_words' ? (
                      <Text style={[styles.previewCorrect, rtl.text]}>{t('openWordsHint')}</Text>
                    ) : null}
                    {activity.type === 'multiple_choice' || activity.type === 'select_all'
                      ? activity.options.map((option) => {
                          const correct =
                            activity.type === 'select_all'
                              ? activity.answer.includes(option.id)
                              : option.id === activity.answer;
                          return (
                            <Text
                              key={option.id}
                              style={[
                                correct ? styles.previewCorrect : styles.previewOption,
                                rtl.text,
                              ]}
                            >
                              {correct ? '✓ ' : '• '}
                              {option.text}
                              {correct ? ` · ${t('correctOption')}` : ''}
                            </Text>
                          );
                        })
                      : (
                          <Text style={[styles.previewCorrect, rtl.text]}>
                            {t('correctWas')}: {activityAnswerLabel(activity)}
                          </Text>
                        )}
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              <Button title={t('close')} onPress={closePreview} variant="outline" sound={false} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!review} transparent animationType="fade" onRequestClose={() => setReview(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setReview(null)} />
          <View style={styles.modal}>
            <Text style={[styles.modalTitle, rtl.text]}>{review?.packTitle ?? ''}</Text>
            {review ? (
              <ScrollView style={styles.previewBody} nestedScrollEnabled showsVerticalScrollIndicator>
                <View
                  style={[
                    styles.resultBadge,
                    review.correct ? styles.resultBadgeOk : styles.resultBadgeBad,
                    { marginBottom: spacing.sm },
                  ]}
                >
                  <Text style={[styles.resultBadgeText, rtl.text]}>
                    {review.correct ? `✓ ${t('answerCorrect')}` : `✗ ${t('answerIncorrect')}`}
                  </Text>
                </View>
                <Text style={[styles.previewPrompt, rtl.text]}>{review.questionPreview}</Text>
                <Text style={[styles.resultLineStrong, rtl.text]}>
                  {t('kidAnswered')}: {review.selectedText}
                </Text>
                <Text style={[styles.previewCorrect, rtl.text]}>
                  {t('correctWas')}: {review.correctText}
                </Text>
                {!review.correct ? (
                  <>
                    {review.explanationHe ? (
                      <>
                        <Text style={[styles.previewPrompt, rtl.text, { marginTop: spacing.md }]}>
                          {t('whyThisMistake')}
                        </Text>
                        <Text style={[styles.previewPassage, rtl.text]}>{review.explanationHe}</Text>
                      </>
                    ) : null}
                    <Text style={[styles.previewPrompt, rtl.text]}>{t('whatToImprove')}</Text>
                    <Text style={[styles.previewPassage, rtl.text]}>
                      {review.kind === 'reading' ? t('parentImproveReading') : t('parentImproveQuiz')}
                    </Text>
                  </>
                ) : null}
                {review.passageHe ? (
                  <>
                    <Text style={[styles.previewPrompt, rtl.text]}>
                      {review.passageTitleHe || t('readPassageTogether')}
                    </Text>
                    <Text style={[styles.previewPassage, rtl.text]}>{review.passageHe}</Text>
                  </>
                ) : null}
              </ScrollView>
            ) : null}
            <View style={styles.modalActions}>
              {review && items.some((i) => i.id === review.packId) ? (
                <Button title={t('openFullPack')} onPress={openPackFromReview} sound={false} />
              ) : null}
              <Button title={t('close')} onPress={() => setReview(null)} variant="outline" sound={false} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={importOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setImportOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setImportOpen(false)}>
          <KeyboardSheet>
            <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, rtl.text]}>{t('importLearningPack')}</Text>
              <Text style={[styles.packMeta, rtl.text, { marginBottom: spacing.md }]}>
                {t('learningImportPasteHint')}
              </Text>
              <Input
                value={importText}
                onChangeText={setImportText}
                multiline
                numberOfLines={10}
                style={{ minHeight: 160, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
              />
              <View style={styles.modalActions}>
                <Button
                  title={t('learningImportDo')}
                  onPress={() => void handleImportJson()}
                  loading={importing}
                />
                <Button
                  title={t('cancel')}
                  onPress={() => setImportOpen(false)}
                  variant="outline"
                  sound={false}
                />
              </View>
            </Pressable>
          </KeyboardSheet>
        </Pressable>
      </Modal>
    </ThemedScreen>
  );
}
