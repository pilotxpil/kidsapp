import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemedScreen } from '../../components/ThemedScreen';
import { SectionHeader } from '../../components/ThemedHero';
import {
  LEARNING_CATEGORIES,
  LEARNING_CATEGORY_ORDER,
  LEARNING_PACK_KINDS,
  LEARNING_PACK_KIND_LABELS,
  GRADE_OPTIONS,
  formatGradeLabel,
} from '@kidsapp/shared';
import type {
  LearningCategory,
  LearningPack,
  LearningPackKind,
  MultipleChoiceActivity,
} from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

type DraftQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string];
  answerIndex: 0 | 1 | 2;
};

function emptyQuestion(): DraftQuestion {
  return {
    id: `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    prompt: '',
    options: ['', '', ''],
    answerIndex: 0,
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
    .filter((a): a is MultipleChoiceActivity => a.type === 'multiple_choice')
    .map((a) => {
      const opts = [...a.options.map((o) => o.text), '', '', ''].slice(0, 3) as [
        string,
        string,
        string,
      ];
      const answerIndex = Math.max(
        0,
        a.options.findIndex((o) => o.id === a.answer)
      ) as 0 | 1 | 2;
      return {
        id: a.id,
        prompt: a.prompt.text,
        options: opts,
        answerIndex: (answerIndex >= 0 && answerIndex <= 2 ? answerIndex : 0) as 0 | 1 | 2,
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
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
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

  const buildActivities = (): MultipleChoiceActivity[] | null => {
    const clean: MultipleChoiceActivity[] = [];
    for (const q of questions) {
      if (!q.prompt.trim()) continue;
      const texts = q.options.map((o) => o.trim()).filter(Boolean);
      if (texts.length < 2) continue;
      const options = texts.map((text, i) => ({
        id: String.fromCharCode(97 + i),
        text,
      }));
      const preferredText = q.options[q.answerIndex]?.trim();
      const answer = options.find((o) => o.text === preferredText)?.id ?? options[0].id;
      clean.push({
        id: q.id,
        type: 'multiple_choice',
        prompt: { text: q.prompt.trim() },
        options,
        answer,
      });
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
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
              <Input
                label={t('questionPrompt')}
                value={q.prompt}
                onChangeText={(v) => updateQuestion(q.id, { prompt: v })}
                multiline
              />
              {q.options.map((opt, oi) => (
                <Input
                  key={oi}
                  label={t('optionLabel').replace('{n}', String(oi + 1))}
                  value={opt}
                  onChangeText={(v) => {
                    const next = [...q.options] as [string, string, string];
                    next[oi] = v;
                    updateQuestion(q.id, { options: next });
                  }}
                />
              ))}
              <Text style={[styles.label, rtl.text]}>{t('correctOption')}</Text>
              <View style={styles.answerRow}>
                {([0, 1, 2] as const).map((i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.chip, q.answerIndex === i && styles.chipActive]}
                    onPress={() => updateQuestion(q.id, { answerIndex: i })}
                  >
                    <Text
                      style={[styles.chipText, q.answerIndex === i && styles.chipTextActive]}
                    >
                      {i + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}
