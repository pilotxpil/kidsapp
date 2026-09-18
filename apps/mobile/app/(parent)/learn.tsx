import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemedScreen } from '../../components/ThemedScreen';
import { SectionHeader } from '../../components/ThemedHero';
import {
  LEARNING_CATEGORIES,
  LEARNING_CATEGORY_ORDER,
  LEARNING_DIFFICULTIES,
  LEARNING_DIFFICULTY_LABELS,
  GRADE_OPTIONS,
  formatGradeLabel,
  packDisplayTitle,
  packDisplaySubtitle,
} from '@kidsapp/shared';
import type {
  LearningCatalogItem,
  LearningCategory,
  LearningDifficulty,
  User,
} from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

function groupByCategory(items: LearningCatalogItem[]): Map<LearningCategory, LearningCatalogItem[]> {
  const map = new Map<LearningCategory, LearningCatalogItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return map;
}

export default function ParentLearnScreen() {
  const { colors, borderRadius, cardBorder, pointsEmoji, id: themeId } = useTheme();
  const [items, setItems] = useState<LearningCatalogItem[]>([]);
  const [kids, setKids] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<LearningCategory | null>(null);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [assignItem, setAssignItem] = useState<LearningCatalogItem | null>(null);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [assignPoints, setAssignPoints] = useState('5');
  const [assignDifficulty, setAssignDifficulty] = useState<LearningDifficulty>('medium');
  const [saving, setSaving] = useState(false);
  const [mistakesKidId, setMistakesKidId] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState<import('@kidsapp/shared').LearningMistakeEntry[]>([]);
  const [mistakesLoading, setMistakesLoading] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
        hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
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
        packRow: { gap: spacing.md, alignItems: 'center', width: '100%' },
        packInfo: { flex: 1, minWidth: 0 },
        packTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
        packMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
        assignRow: { marginTop: spacing.sm, gap: spacing.xs },
        kidChip: {
          backgroundColor: colors.bgDeep,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderRadius: borderRadius.sm,
          alignSelf: 'flex-start',
        },
        kidChipText: { color: colors.text, fontSize: 11, fontWeight: '600' },
        empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        modal: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          maxWidth: 480,
          width: '100%',
          alignSelf: 'center',
          ...cardBorder(2),
        },
        modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md },
        kidOption: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          borderRadius: borderRadius.md,
          marginBottom: spacing.sm,
          backgroundColor: colors.bgDeep,
          gap: spacing.sm,
        },
        kidOptionOn: { backgroundColor: colors.primary + '33', borderWidth: 2, borderColor: colors.primary },
        kidAvatar: { fontSize: 24 },
        kidName: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
        modalActions: { marginTop: spacing.lg, gap: spacing.sm },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const loadKids = useCallback(async () => {
    const res = await api.getKids();
    setKids(res.kids);
    setMistakesKidId((prev) => prev || res.kids[0]?._id || null);
  }, []);

  const loadCatalog = useCallback(async () => {
    const res = await api.getLearningCatalog({
      search: search.trim() || undefined,
      category: categoryFilter ?? undefined,
      grade: gradeFilter ?? undefined,
    });
    setItems(res.items);
  }, [search, categoryFilter, gradeFilter]);

  useFocusLoad(loadKids);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCatalog();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadCatalog]);

  useEffect(() => {
    if (!mistakesKidId) {
      setMistakes([]);
      return;
    }
    let cancelled = false;
    setMistakesLoading(true);
    api
      .getLearningMistakes(mistakesKidId)
      .then((res) => {
        if (!cancelled) setMistakes(res.mistakes);
      })
      .catch(() => {
        if (!cancelled) setMistakes([]);
      })
      .finally(() => {
        if (!cancelled) setMistakesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mistakesKidId]);

  const grouped = useMemo(() => groupByCategory(items), [items]);

  const openAssign = (item: LearningCatalogItem) => {
    setAssignItem(item);
    setAssignedIds([...item.assignedKidIds]);
    setAssignPoints(String(item.pointsPerActivity ?? item.defaultPoints));
    setAssignDifficulty(item.difficulty ?? 'medium');
  };

  const toggleKid = (kidId: string) => {
    setAssignedIds((prev) =>
      prev.includes(kidId) ? prev.filter((id) => id !== kidId) : [...prev, kidId]
    );
  };

  const saveAssign = async () => {
    if (!assignItem || saving) return;
    const points = parseInt(assignPoints, 10);
    if (!Number.isFinite(points) || points < 1 || points > 100) {
      alert(t('learningPointsInvalid'));
      return;
    }
    setSaving(true);
    try {
      await api.assignLearningPack(assignItem.id, assignedIds, {
        pointsPerActivity: points,
        difficulty: assignDifficulty,
      });
      setAssignItem(null);
      await loadCatalog();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'שגיאה';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const kidName = (id: string) => kids.find((k) => k._id === id)?.displayName ?? id;

  return (
    <ThemedScreen tabs>
      <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
        <SectionHeader title={t('learningCatalog')} icon="📚" />
        <Text style={[styles.hint, rtl.text]}>{t('learningCatalogHint')}</Text>

        {kids.length > 0 ? (
          <View style={{ marginBottom: spacing.lg }}>
            <SectionHeader title={t('learningMistakes')} icon="📝" />
            <Text style={[styles.hint, rtl.text]}>{t('learningMistakesHint')}</Text>
            <View style={styles.chipRow}>
              {kids.map((kid) => (
                <TouchableOpacity
                  key={kid._id}
                  style={[styles.chip, mistakesKidId === kid._id && styles.chipActive]}
                  onPress={() => setMistakesKidId(kid._id)}
                >
                  <Text style={[styles.chipText, mistakesKidId === kid._id && styles.chipTextActive]}>
                    {kid.avatar} {kid.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {mistakesLoading ? (
              <Text style={styles.empty}>...</Text>
            ) : mistakes.length === 0 ? (
              <Text style={[styles.empty, rtl.text]}>{t('noLearningMistakes')}</Text>
            ) : (
              mistakes.slice(0, 15).map((m) => (
                <Card key={`${m.packId}:${m.activityId}`} style={styles.packCard}>
                  <Text style={[styles.packTitle, rtl.text]}>{m.packTitle}</Text>
                  <Text style={[styles.packMeta, rtl.text]}>{m.questionPreview}</Text>
                  <Text style={[styles.packMeta, rtl.text]}>
                    {t('mistakeCount').replace('{n}', String(m.mistakeCount))}
                  </Text>
                </Card>
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, !categoryFilter && styles.chipActive]}
              onPress={() => setCategoryFilter(null)}
            >
              <Text style={[styles.chipText, !categoryFilter && styles.chipTextActive]}>
                {t('allCategories')}
              </Text>
            </TouchableOpacity>
            {LEARNING_CATEGORY_ORDER.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, categoryFilter === cat && styles.chipActive]}
                onPress={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              >
                <Text style={[styles.chipText, categoryFilter === cat && styles.chipTextActive]}>
                  {LEARNING_CATEGORIES[cat].icon} {LEARNING_CATEGORIES[cat].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, gradeFilter === null && styles.chipActive]}
              onPress={() => setGradeFilter(null)}
            >
              <Text style={[styles.chipText, gradeFilter === null && styles.chipTextActive]}>
                {t('allGrades')}
              </Text>
            </TouchableOpacity>
            {GRADE_OPTIONS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, gradeFilter === g && styles.chipActive]}
                onPress={() => setGradeFilter(gradeFilter === g ? null : g)}
              >
                <Text style={[styles.chipText, gradeFilter === g && styles.chipTextActive]}>
                  {formatGradeLabel(g, t('grade'))}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

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
                  <View style={[styles.packRow, rtl.row]}>
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
                        {item.activityCount} {t('questions')}
                        {item.grade ? ` · ${formatGradeLabel(item.grade, t('grade'))}` : ''}
                        {` · ${item.pointsPerActivity ?? item.defaultPoints} ${pointsEmoji}`}
                        {item.difficulty
                          ? ` · ${LEARNING_DIFFICULTY_LABELS[item.difficulty]}`
                          : ''}
                      </Text>
                      <View style={[styles.assignRow, rtl.row, { flexWrap: 'wrap' }]}>
                        {item.assignedKidIds.length > 0 ? (
                          item.assignedKidIds.map((kidId) => (
                            <View key={kidId} style={styles.kidChip}>
                              <Text style={styles.kidChipText}>{kidName(kidId)}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={[styles.packMeta, rtl.text]}>{t('notAssigned')}</Text>
                        )}
                      </View>
                    </View>
                    <Button
                      title={t('assignLearning')}
                      onPress={() => openAssign(item)}
                      variant="outline"
                    />
                  </View>
                </Card>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!assignItem} transparent animationType="fade" onRequestClose={() => setAssignItem(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAssignItem(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, rtl.text]}>
                {assignItem ? packDisplayTitle(assignItem.title) : ''}
              </Text>

              <Input
                label={t('learningPointsPerQuestion')}
                value={assignPoints}
                onChangeText={setAssignPoints}
                keyboardType="number-pad"
                placeholder={String(assignItem?.defaultPoints ?? 5)}
              />

              <Text style={[styles.packMeta, rtl.text, { marginBottom: spacing.sm }]}>
                {t('learningDifficulty')}
              </Text>
              <View style={[styles.chipRow, { marginBottom: spacing.md }]}>
                {LEARNING_DIFFICULTIES.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.chip, assignDifficulty === level && styles.chipActive]}
                    onPress={() => setAssignDifficulty(level)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        assignDifficulty === level && styles.chipTextActive,
                      ]}
                    >
                      {LEARNING_DIFFICULTY_LABELS[level]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.packMeta, rtl.text, { marginBottom: spacing.md }]}>
                {t('selectKidsToAssign')}
              </Text>
              {kids.length === 0 ? (
                <Text style={styles.packMeta}>{t('addKidFirst')}</Text>
              ) : (
                kids.map((kid) => {
                  const selected = assignedIds.includes(kid._id);
                  return (
                    <TouchableOpacity
                      key={kid._id}
                      style={[styles.kidOption, selected && styles.kidOptionOn]}
                      onPress={() => toggleKid(kid._id)}
                    >
                      <Text style={styles.kidAvatar}>{kid.avatar}</Text>
                      <Text style={[styles.kidName, rtl.text]}>{kid.displayName}</Text>
                      <Text style={styles.packMeta}>{selected ? '✓' : ''}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
              <View style={styles.modalActions}>
                <Button title={t('assignLearningSave')} onPress={saveAssign} loading={saving} />
                <Button title={t('cancel')} onPress={() => setAssignItem(null)} variant="outline" sound={false} />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </ThemedScreen>
  );
}
