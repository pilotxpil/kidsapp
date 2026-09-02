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
  packDisplayTitle,
  packDisplaySubtitle,
} from '@kidsapp/shared';
import type { LearningCatalogItem, LearningCategory, User } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6];

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
  const [saving, setSaving] = useState(false);

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

  const grouped = useMemo(() => groupByCategory(items), [items]);

  const openAssign = (item: LearningCatalogItem) => {
    setAssignItem(item);
    setAssignedIds([...item.assignedKidIds]);
  };

  const toggleKid = (kidId: string) => {
    setAssignedIds((prev) =>
      prev.includes(kidId) ? prev.filter((id) => id !== kidId) : [...prev, kidId]
    );
  };

  const saveAssign = async () => {
    if (!assignItem || saving) return;
    setSaving(true);
    try {
      await api.assignLearningPack(assignItem.id, assignedIds);
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
                  {t('grade')} {g}
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
                        {item.grade ? ` · ${t('grade')} ${item.grade}` : ''}
                        {` · ${item.defaultPoints} ${pointsEmoji}`}
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
