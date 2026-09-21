import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemedScreen } from '../../components/ThemedScreen';
import { KeyboardScroll } from '../../components/KeyboardSheet';
import { SectionHeader } from '../../components/ThemedHero';
import {
  LEARNING_CATEGORIES,
  LEARNING_CATEGORY_ORDER,
  LEARNING_PACK_KINDS,
  LEARNING_PACK_KIND_LABELS,
  GRADE_OPTIONS,
  formatGradeLabel,
  parseOpenWordList,
} from '@kidsapp/shared';
import type {
  LearningCategory,
  LearningPack,
  LearningPackKind,
  LearningActivity,
  MultipleChoiceActivity,
  SelectAllActivity,
  OpenWordsActivity,
} from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

type DraftQuestion = {
  id: string;
  type: 'multiple_choice' | 'select_all' | 'open_words';
  prompt: string;
  options: string[];
  answerIndex: number;
  answerIndexes: number[];
  acceptText: string;
  count: number;
};

function emptyQuestion(
  type: 'multiple_choice' | 'select_all' | 'open_words' = 'multiple_choice'
): DraftQuestion {
  return {
    id: `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    type,
    prompt: '',
    options: type === 'select_all' ? ['', '', '', ''] : type === 'open_words' ? [] : ['', '', ''],
    answerIndex: 0,
    answerIndexes: type === 'select_all' ? [0, 1] : [0],
    acceptText: '',
    count: 3,
  };
}

function packToDraft(pack: LearningPack): {
  title: string;
  category: LearningCategory;
  kind: LearningPackKind;
  grade: number | null;
  points: string;
  passageTitle: string;
  passage: string;
  questions: DraftQuestion[];
} {
  const questions: DraftQuestion[] = pack.activities
    .filter(
      (a): a is MultipleChoiceActivity | SelectAllActivity | OpenWordsActivity =>
        a.type === 'multiple_choice' || a.type === 'select_all' || a.type === 'open_words'
    )
    .map((a) => {
      if (a.type === 'open_words') {
        return {
          id: a.id,
          type: 'open_words' as const,
          prompt: a.prompt.text,
          options: [],
          answerIndex: 0,
          answerIndexes: [],
          acceptText: a.accept.join(', '),
          count: a.count,
        };
      }
      const slotCount = a.type === 'select_all' ? 4 : 3;
      const opts = [...a.options.map((o) => o.text), ...Array(slotCount).fill('')].slice(
        0,
        slotCount
      );
      if (a.type === 'select_all') {
        const answerIndexes = a.answer
          .map((id) => a.options.findIndex((o) => o.id === id))
          .filter((i) => i >= 0);
        return {
          id: a.id,
          type: 'select_all' as const,
          prompt: a.prompt.text,
          options: opts,
          answerIndex: answerIndexes[0] ?? 0,
          answerIndexes: answerIndexes.length ? answerIndexes : [0, 1],
          acceptText: '',
          count: 3,
        };
      }
      const answerIndex = Math.max(
        0,
        a.options.findIndex((o) => o.id === a.answer)
      );
      return {
        id: a.id,
        type: 'multiple_choice' as const,
        prompt: a.prompt.text,
        options: opts,
        answerIndex,
        answerIndexes: [answerIndex],
        acceptText: '',
        count: 3,
      };
    });

  return {
    title: pack.title.he,
    category: pack.category,
    kind: pack.kind === 'reading' ? 'reading' : 'quiz',
    grade: pack.grade ?? null,
    points: String(pack.defaultPoints),
    passageTitle: pack.passageTitle?.he ?? '',
    passage: pack.passage?.he ?? '',
    questions: questions.length ? questions : [emptyQuestion()],
  };
}

export default function LearnPackEditScreen() {
  const { packId } = useLocalSearchParams<{ packId?: string }>();
  const router = useRouter();
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();
  const editing = !!packId;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<LearningCategory>('language');
  const [kind, setKind] = useState<LearningPackKind>('quiz');
  const [grade, setGrade] = useState<number | null>(4);
  const [points, setPoints] = useState('5');
  const [passageTitle, setPassageTitle] = useState('');
  const [passage, setPassage] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [loading, setLoading] = useState(!!packId);
  const [saving, setSaving] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, maxWidth: 720, alignSelf: 'center', width: '100%' },
        chipRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
        chip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          backgroundColor: colors.bgCard,
          ...cardBorder(1),
        },
        chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
        chipTextActive: { color: colors.textDark },
        label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
        questionCard: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
          ...cardBorder(1),
        },
        questionHeader: {
          color: colors.text,
          fontWeight: '800',
          fontSize: 15,
          marginBottom: spacing.sm,
        },
        answerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
        actions: { gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.xl },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    if (!packId) return;
    setLoading(true);
    try {
      const res = await api.exportLearningPack(packId);
      const draft = packToDraft(res.pack);
      setTitle(draft.title);
      setCategory(draft.category);
      setKind(draft.kind);
      setGrade(draft.grade);
      setPoints(draft.points);
      setPassageTitle(draft.passageTitle);
      setPassage(draft.passage);
      setQuestions(draft.questions);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'שגיאה');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [packId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateQuestion = (id: string, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const buildActivities = (): LearningActivity[] | null => {
    const clean: LearningActivity[] = [];
    for (const q of questions) {
      if (!q.prompt.trim()) continue;
      if (q.type === 'open_words') {
        const accept = parseOpenWordList(q.acceptText);
        const count = Math.min(8, Math.max(1, Math.round(q.count)));
        if (accept.length < count || count < 1) continue;
        clean.push({
          id: q.id,
          type: 'open_words',
          prompt: { text: q.prompt.trim() },
          accept,
          count,
        });
        continue;
      }
      const kept: { text: string; orig: number }[] = [];
      q.options.forEach((text, i) => {
        if (text.trim()) kept.push({ text: text.trim(), orig: i });
      });
      if (q.type === 'select_all') {
        if (kept.length < 3) continue;
        const options = kept.map((k, i) => ({
          id: String.fromCharCode(97 + i),
          text: k.text,
        }));
        const answer = kept
          .map((k, i) => (q.answerIndexes.includes(k.orig) ? options[i].id : null))
          .filter((id): id is string => !!id);
        if (answer.length < 2 || answer.length >= options.length) continue;
        clean.push({
          id: q.id,
          type: 'select_all',
          prompt: { text: q.prompt.trim() },
          options,
          answer,
        });
      } else {
        if (kept.length < 2) continue;
        const options = kept.map((k, i) => ({
          id: String.fromCharCode(97 + i),
          text: k.text,
        }));
        const preferred = q.options[q.answerIndex]?.trim();
        const answer = options.find((o) => o.text === preferred)?.id ?? options[0].id;
        clean.push({
          id: q.id,
          type: 'multiple_choice',
          prompt: { text: q.prompt.trim() },
          options,
          answer,
        });
      }
    }
    return clean.length ? clean : null;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert(t('packTitleHe'));
      return;
    }
    const pts = parseInt(points, 10);
    if (!Number.isFinite(pts) || pts < 1 || pts > 100) {
      alert(t('learningPointsInvalid'));
      return;
    }
    const activities = buildActivities();
    if (!activities) {
      alert(t('learningPackNeedQuestion'));
      return;
    }
    const badSelectAll = questions.some(
      (q) => q.prompt.trim() && q.type === 'select_all' && q.answerIndexes.length < 2
    );
    const badOpen = questions.some((q) => {
      if (!q.prompt.trim() || q.type !== 'open_words') return false;
      const accept = parseOpenWordList(q.acceptText);
      return accept.length < q.count || q.count < 1;
    });
    if (badSelectAll) {
      alert(t('selectAllNeedTwoCorrect'));
      return;
    }
    if (badOpen) {
      alert(t('openWordsNeed'));
      return;
    }
    if (kind === 'reading' && !passage.trim()) {
      alert(t('passageBody'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: { he: title.trim() },
        category,
        kind,
        grade: grade ?? undefined,
        defaultPoints: pts,
        activities,
        ...(kind === 'reading'
          ? {
              passage: { he: passage.trim() },
              passageTitle: passageTitle.trim()
                ? { he: passageTitle.trim() }
                : undefined,
            }
          : {}),
      };
      if (editing && packId) {
        await api.updateCustomLearningPack(packId, payload);
      } else {
        await api.createCustomLearningPack(payload);
      }
      alert(t('learningPackSaved'));
      router.back();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'שגיאה');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedScreen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted }}>{t('loading')}</Text>
        </View>
      </ThemedScreen>
    );
  }

  return (
    <ThemedScreen>
      <KeyboardScroll contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
          <SectionHeader
            title={editing ? t('editLearningPack') : t('createLearningPack')}
            icon="📝"
          />

          <Input label={t('packTitleHe')} value={title} onChangeText={setTitle} />

          <Text style={[styles.label, rtl.text]}>{t('category')}</Text>
          <View style={styles.chipRow}>
            {LEARNING_CATEGORY_ORDER.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {LEARNING_CATEGORIES[cat].icon} {LEARNING_CATEGORIES[cat].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, rtl.text]}>{t('packKind')}</Text>
          <View style={styles.chipRow}>
            {LEARNING_PACK_KINDS.map((k) => (
              <TouchableOpacity
                key={k}
                style={[styles.chip, kind === k && styles.chipActive]}
                onPress={() => setKind(k)}
              >
                <Text style={[styles.chipText, kind === k && styles.chipTextActive]}>
                  {LEARNING_PACK_KIND_LABELS[k]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, rtl.text]}>{t('grade')}</Text>
          <View style={styles.chipRow}>
            {GRADE_OPTIONS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, grade === g && styles.chipActive]}
                onPress={() => setGrade(g)}
              >
                <Text style={[styles.chipText, grade === g && styles.chipTextActive]}>
                  {formatGradeLabel(g, t('grade'))}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label={t('packPoints')}
            value={points}
            onChangeText={setPoints}
            keyboardType="number-pad"
          />

          {kind === 'reading' ? (
            <>
              <Input
                label={t('passageTitle')}
                value={passageTitle}
                onChangeText={setPassageTitle}
              />
              <Input
                label={t('passageBody')}
                value={passage}
                onChangeText={setPassage}
                multiline
                numberOfLines={8}
                style={{ minHeight: 140, textAlignVertical: 'top' }}
              />
            </>
          ) : null}

          <SectionHeader title={t('questions')} icon="❓" />
          {questions.map((q, index) => (
            <View key={q.id} style={styles.questionCard}>
              <Text style={[styles.questionHeader, rtl.text]}>
                {t('questions')} {index + 1}
              </Text>
              <Text style={[styles.label, rtl.text]}>{t('packKind')}</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, q.type === 'multiple_choice' && styles.chipActive]}
                  onPress={() =>
                    updateQuestion(q.id, {
                      type: 'multiple_choice',
                      options: [...q.options, '', '', ''].slice(0, 3),
                      answerIndex: 0,
                      answerIndexes: [0],
                    })
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      q.type === 'multiple_choice' && styles.chipTextActive,
                    ]}
                  >
                    {t('singleAnswerType')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, q.type === 'select_all' && styles.chipActive]}
                  onPress={() =>
                    updateQuestion(q.id, {
                      type: 'select_all',
                      options: [...q.options, '', '', '', ''].slice(0, 4),
                      answerIndexes: q.answerIndexes.length >= 2 ? q.answerIndexes : [0, 1],
                    })
                  }
                >
                  <Text
                    style={[styles.chipText, q.type === 'select_all' && styles.chipTextActive]}
                  >
                    {t('selectAllType')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, q.type === 'open_words' && styles.chipActive]}
                  onPress={() =>
                    updateQuestion(q.id, {
                      type: 'open_words',
                      options: [],
                      acceptText: q.acceptText,
                      count: q.count || 3,
                    })
                  }
                >
                  <Text
                    style={[styles.chipText, q.type === 'open_words' && styles.chipTextActive]}
                  >
                    {t('openWordsType')}
                  </Text>
                </TouchableOpacity>
              </View>
              <Input
                label={t('questionPrompt')}
                value={q.prompt}
                onChangeText={(v) => updateQuestion(q.id, { prompt: v })}
                multiline
              />
              {q.type === 'open_words' ? (
                <>
                  <Input
                    label={t('openWordsCount')}
                    value={String(q.count)}
                    onChangeText={(v) =>
                      updateQuestion(q.id, {
                        count: Math.min(8, Math.max(1, parseInt(v, 10) || 1)),
                      })
                    }
                    keyboardType="number-pad"
                  />
                  <Input
                    label={t('openWordsAccept')}
                    value={q.acceptText}
                    onChangeText={(v) => updateQuestion(q.id, { acceptText: v })}
                    multiline
                    numberOfLines={4}
                    style={{ minHeight: 90, textAlignVertical: 'top' }}
                  />
                  <Text style={[styles.label, rtl.text]}>{t('openWordsAcceptHint')}</Text>
                </>
              ) : (
                <>
              {q.options.map((opt, oi) => (
                <Input
                  key={oi}
                  label={t('optionLabel').replace('{n}', String(oi + 1))}
                  value={opt}
                  onChangeText={(v) => {
                    const next = [...q.options];
                    next[oi] = v;
                    updateQuestion(q.id, { options: next });
                  }}
                />
              ))}
              <Text style={[styles.label, rtl.text]}>
                {q.type === 'select_all' ? t('selectAllHint') : t('correctOption')}
              </Text>
              <View style={styles.answerRow}>
                {q.options.map((_, i) => {
                  const active =
                    q.type === 'select_all' ? q.answerIndexes.includes(i) : q.answerIndex === i;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => {
                        if (q.type === 'select_all') {
                          const next = q.answerIndexes.includes(i)
                            ? q.answerIndexes.filter((x) => x !== i)
                            : [...q.answerIndexes, i];
                          updateQuestion(q.id, { answerIndexes: next });
                        } else {
                          updateQuestion(q.id, { answerIndex: i });
                        }
                      }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {i + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
                </>
              )}
              {questions.length > 1 ? (
                <Button
                  title={t('delete')}
                  variant="outline"
                  onPress={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                  sound={false}
                />
              ) : null}
            </View>
          ))}

          <Button
            title={t('addQuestion')}
            variant="secondary"
            onPress={() => setQuestions((prev) => [...prev, emptyQuestion()])}
          />

          <View style={styles.actions}>
            <Button title={t('saveLearningPack')} onPress={handleSave} loading={saving} />
            <Button title={t('cancel')} variant="outline" onPress={() => router.back()} sound={false} />
            {editing && packId ? (
              <Button
                title={t('deleteLearningPack')}
                variant="danger"
                onPress={() => {
                  Alert.alert(t('deleteLearningPack'), t('deleteLearningPackConfirm'), [
                    { text: t('cancel'), style: 'cancel' },
                    {
                      text: t('delete'),
                      style: 'destructive',
                      onPress: () => {
                        void (async () => {
                          try {
                            await api.deleteCustomLearningPack(packId);
                            router.back();
                          } catch (err: unknown) {
                            alert(err instanceof Error ? err.message : 'שגיאה');
                          }
                        })();
                      },
                    },
                  ]);
                }}
                sound={false}
              />
            ) : null}
          </View>
        </KeyboardScroll>
    </ThemedScreen>
  );
}
