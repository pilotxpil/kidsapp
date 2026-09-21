import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../lib/auth';
import { api } from '../../../lib/api';
import { useFocusLoad } from '../../../hooks/useFocusLoad';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Celebration } from '../../../components/Celebration';
import { ThemedScreen } from '../../../components/ThemedScreen';
import { KeyboardScroll } from '../../../components/KeyboardSheet';
import { MultipleChoice } from '../../../components/learning/MultipleChoice';
import { SelectAll } from '../../../components/learning/SelectAll';
import { OpenWords } from '../../../components/learning/OpenWords';
import { ReadingPassage } from '../../../components/learning/ReadingPassage';
import { useCelebrateBadges } from '../../../lib/badge-celebration';
import type { LearningPackDetail, PublicLearningActivity } from '@kidsapp/shared';
import {
  packDisplayTitle,
  packDisplaySubtitle,
  resolvePackKind,
  normalizeOpenWord,
} from '@kidsapp/shared';
import { spacing } from '../../../constants/theme';
import { useTheme } from '../../../lib/theme-context';
import { rtl } from '../../../lib/rtl';
import { t } from '../../../lib/i18n';
import { playSfx } from '../../../lib/sfx';

export default function LearnPackScreen() {
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const celebrateBadges = useCelebrateBadges();
  const { colors, pointsEmoji, id: themeId } = useTheme();

  const [detail, setDetail] = useState<LearningPackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityIndex, setActivityIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [correctId, setCorrectId] = useState<string | null>(null);
  const [correctIds, setCorrectIds] = useState<string[] | null>(null);
  const [typedWords, setTypedWords] = useState<string[]>([]);
  const [acceptedWords, setAcceptedWords] = useState<string[] | null>(null);
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null);
  const [packCompletedAfterAnswer, setPackCompletedAfterAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateMsg, setCelebrateMsg] = useState('');
  const [pendingBadges, setPendingBadges] = useState<{ id: string; xpAwarded: number }[]>([]);
  const [finished, setFinished] = useState(false);
  const [showPassageIntro, setShowPassageIntro] = useState(false);
  const [passageExpanded, setPassageExpanded] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.md, flexGrow: 1, paddingBottom: spacing.lg },
        header: { marginBottom: spacing.sm },
        title: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
        progress: {
          color: colors.textMuted,
          fontSize: 12,
          textAlign: 'center',
          marginTop: 2,
        },
        questionCard: { paddingVertical: 10, paddingHorizontal: spacing.sm + 4 },
        feedback: {
          marginTop: spacing.sm,
          paddingVertical: 8,
          paddingHorizontal: spacing.sm,
          borderRadius: 10,
          width: '100%',
        },
        feedbackCorrect: { backgroundColor: colors.success + '33' },
        feedbackWrong: { backgroundColor: colors.danger + '33' },
        feedbackText: { color: colors.text, fontSize: 13, textAlign: 'center', fontWeight: '600' },
        errorBox: {
          marginTop: spacing.sm,
          paddingVertical: 8,
          paddingHorizontal: spacing.sm,
          borderRadius: 10,
          width: '100%',
          backgroundColor: colors.danger + '33',
        },
        errorText: { color: colors.text, fontSize: 13, textAlign: 'center', fontWeight: '600' },
        actions: { marginTop: spacing.sm, gap: 6 },
        actionBtn: { width: '100%', alignSelf: 'stretch' as const },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        doneTitle: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
        doneSub: { color: colors.textMuted, fontSize: 16, textAlign: 'center', marginTop: spacing.sm },
        introHint: {
          color: colors.textMuted,
          fontSize: 13,
          textAlign: 'center',
          marginTop: spacing.sm,
          marginBottom: spacing.md,
        },
        passageToggleWrap: { marginBottom: spacing.sm },
      }),
    [themeId, colors]
  );

  const resetQuestionState = () => {
    setSelectedId(null);
    setSelectedIds([]);
    setCorrectId(null);
    setCorrectIds(null);
    setTypedWords([]);
    setAcceptedWords(null);
    setAnsweredCorrect(null);
    setPackCompletedAfterAnswer(false);
    setSubmitError(null);
  };

  const load = useCallback(async () => {
    if (!packId) return;
    setLoading(true);
    try {
      const res = await api.getLearningPack(packId);
      setDetail(res);
      if (res.completed) {
        setFinished(true);
        setShowPassageIntro(false);
      } else {
        const kind = resolvePackKind(res.pack.kind);
        const needsIntro =
          kind === 'reading' && !!res.pack.passage?.he && res.completedActivityIds.length === 0;
        setShowPassageIntro(needsIntro);
        const firstIncomplete = res.pack.activities.findIndex(
          (a) => !res.completedActivityIds.includes(a.id)
        );
        setActivityIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
        resetQuestionState();
      }
    } finally {
      setLoading(false);
    }
  }, [packId]);

  useFocusLoad(load, !!user && !!packId);

  useEffect(() => {
    setPassageExpanded(false);
    setShowPassageIntro(false);
    resetQuestionState();
  }, [packId]);

  const activities = detail?.pack.activities ?? [];
  const current: PublicLearningActivity | undefined = activities[activityIndex];
  const packKind = resolvePackKind(detail?.pack.kind);
  const passageText = detail?.pack.passage?.he;
  const passageTitle = detail?.pack.passageTitle?.he;
  const locked = answeredCorrect !== null || submitting;

  const applyCheckResult = async (
    activityId: string,
    result: Awaited<ReturnType<typeof api.checkLearningAnswer>>,
    fallbackSingleId?: string
  ) => {
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            completedActivityIds: prev.completedActivityIds.includes(activityId)
              ? prev.completedActivityIds
              : [...prev.completedActivityIds, activityId],
            completed: result.packCompleted,
          }
        : prev
    );

    if (result.correctOptionIds?.length) {
      setCorrectIds(result.correctOptionIds);
    }
    if (result.acceptedWords) {
      setAcceptedWords(result.acceptedWords);
    }
    const revealedCorrectId = result.correctOptionId ?? (result.correct ? fallbackSingleId : null);
    if (revealedCorrectId) setCorrectId(revealedCorrectId);
    setAnsweredCorrect(result.correct);
    setPackCompletedAfterAnswer(result.packCompleted);

    if (result.correct) {
      playSfx(result.packCompleted ? 'cheer' : 'complete');
    } else {
      playSfx('error');
    }

    if (result.newBadges?.length) {
      setPendingBadges((prev) => [...prev, ...result.newBadges!]);
    }

    if (result.packCompleted) {
      await refreshUser();
      const badges = [...pendingBadges, ...(result.newBadges ?? [])];
      const seen = new Set<string>();
      const unique = badges.filter((b) => {
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });
      if (unique.length) celebrateBadges(unique);
      setPendingBadges([]);
      if (result.packPointsEarned && result.packPointsEarned > 0) {
        setCelebrateMsg(`+${result.packPointsEarned} ${pointsEmoji}`);
        setCelebrate(true);
      }
    }
  };

  const handleSelect = async (optionId: string) => {
    if (!packId || !current || locked) return;

    setSelectedId(optionId);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await api.checkLearningAnswer(packId, current.id, optionId);
      await applyCheckResult(current.id, result, optionId);
    } catch (err: unknown) {
      playSfx('error');
      setSelectedId(null);
      const message = err instanceof Error ? err.message : t('learningCheckError');
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSelectAll = (optionId: string) => {
    if (locked) return;
    setSelectedIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  };

  const handleSubmitOpenWords = async () => {
    if (!packId || !current || locked) return;
    const count = current.count ?? 0;
    const words = Array.from({ length: count }, (_, i) => typedWords[i] ?? '').map((w) => w.trim());
    if (words.some((w) => !w)) {
      setSubmitError(t('openWordsNeedPick'));
      return;
    }
    const unique = new Set(words.map((w) => normalizeOpenWord(w)));
    if (unique.size !== words.length) {
      setSubmitError(t('openWordsNeedUnique'));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await api.checkLearningAnswer(packId, current.id, words);
      await applyCheckResult(current.id, result);
    } catch (err: unknown) {
      playSfx('error');
      const message = err instanceof Error ? err.message : t('learningCheckError');
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSelectAll = async () => {
    if (!packId || !current || locked) return;
    if (!selectedIds.length) {
      setSubmitError(t('selectAllNeedPick'));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await api.checkLearningAnswer(packId, current.id, selectedIds);
      await applyCheckResult(current.id, result);
    } catch (err: unknown) {
      playSfx('error');
      const message = err instanceof Error ? err.message : t('learningCheckError');
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (packCompletedAfterAnswer || activityIndex + 1 >= activities.length) {
      setFinished(true);
      return;
    }
    resetQuestionState();
    setPassageExpanded(false);
    setActivityIndex((i) => i + 1);
  };

  if (loading || !detail) {
    return (
      <ThemedScreen tabs>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ThemedScreen>
    );
  }

  if (finished || detail.completed) {
    return (
      <ThemedScreen tabs>
        <ScrollView contentContainerStyle={[styles.scroll, styles.center, rtl.scrollContent]}>
          <Text style={styles.doneTitle}>🎉 {t('packComplete')}</Text>
          <Text style={styles.doneSub}>{packDisplayTitle(detail.pack.title)}</Text>
          <Button
            title={t('backToLearn')}
            onPress={() => router.back()}
            style={{ marginTop: spacing.xl, width: '100%' }}
          />
        </ScrollView>
        <Celebration visible={celebrate} sfx={false} message={celebrateMsg} onDone={() => setCelebrate(false)} />
      </ThemedScreen>
    );
  }

  if (showPassageIntro && passageText) {
    return (
      <ThemedScreen tabs>
        <KeyboardScroll contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
          <View style={styles.header}>
            <Text style={[styles.title, rtl.text]}>{packDisplayTitle(detail.pack.title)}</Text>
            <Text style={[styles.introHint, rtl.text]}>{t('readingIntroHint')}</Text>
          </View>
          <ReadingPassage title={passageTitle} text={passageText} />
          <View style={styles.actions}>
            <Button
              title={t('readingStartQuestions')}
              compact
              onPress={() => {
                playSfx('tap');
                setShowPassageIntro(false);
              }}
              style={styles.actionBtn}
            />
            <Button
              title={t('back')}
              onPress={() => router.back()}
              variant="outline"
              compact
              style={styles.actionBtn}
            />
          </View>
        </KeyboardScroll>
      </ThemedScreen>
    );
  }

  const canShowQuestion =
    !!current &&
    ((current.type === 'multiple_choice' && !!current.options) ||
      (current.type === 'select_all' && !!current.options) ||
      (current.type === 'open_words' && (current.count ?? 0) > 0));

  if (!canShowQuestion || !current) {
    return (
      <ThemedScreen tabs>
        <View style={styles.center}>
          <Text style={styles.doneSub}>{t('activityTypeUnsupported')}</Text>
          <Button title={t('back')} onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
        </View>
      </ThemedScreen>
    );
  }

  return (
    <ThemedScreen tabs>
      <KeyboardScroll contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
        <View style={styles.header}>
          <Text style={[styles.title, rtl.text]}>{packDisplayTitle(detail.pack.title)}</Text>
          {packDisplaySubtitle(detail.pack.title) ? (
            <Text style={styles.progress}>{packDisplaySubtitle(detail.pack.title)}</Text>
          ) : null}
          <Text style={styles.progress}>
            {activityIndex + 1} / {activities.length}
          </Text>
        </View>

        {packKind === 'reading' && passageText ? (
          <View style={styles.passageToggleWrap}>
            {passageExpanded ? (
              <>
                <ReadingPassage title={passageTitle} text={passageText} compact />
                <Button
                  title={t('readingHidePassage')}
                  variant="outline"
                  compact
                  onPress={() => setPassageExpanded(false)}
                  style={{ marginTop: 6, width: '100%', alignSelf: 'stretch' }}
                />
              </>
            ) : (
              <Button
                title={t('readingShowPassage')}
                variant="outline"
                compact
                onPress={() => setPassageExpanded(true)}
                style={{ width: '100%', alignSelf: 'stretch' }}
              />
            )}
          </View>
        ) : null}

        <Card style={styles.questionCard}>
          {current.type === 'open_words' ? (
            <OpenWords
              prompt={current.prompt.text}
              count={current.count ?? 1}
              values={typedWords}
              acceptedWords={acceptedWords}
              disabled={locked}
              onChange={(index, value) => {
                setTypedWords((prev) => {
                  const next = Array.from({ length: current.count ?? 1 }, (_, i) => prev[i] ?? '');
                  next[index] = value;
                  return next;
                });
              }}
            />
          ) : current.type === 'select_all' ? (
            <SelectAll
              prompt={current.prompt.text}
              options={current.options ?? []}
              selectedIds={selectedIds}
              correctIds={correctIds}
              disabled={locked}
              onToggle={handleToggleSelectAll}
            />
          ) : (
            <MultipleChoice
              prompt={current.prompt.text}
              options={current.options ?? []}
              selectedId={selectedId}
              correctId={correctId}
              disabled={locked}
              onSelect={handleSelect}
            />
          )}

          {answeredCorrect !== null ? (
            <View
              style={[
                styles.feedback,
                answeredCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
              ]}
            >
              <Text style={[styles.feedbackText, rtl.text]}>
                {answeredCorrect ? t('answerCorrect') : t('answerIncorrect')}
              </Text>
            </View>
          ) : null}

          {submitError ? (
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, rtl.text]}>{submitError}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {answeredCorrect !== null ? (
              <Button title={t('nextQuestion')} compact onPress={handleNext} style={styles.actionBtn} />
            ) : current.type === 'select_all' ? (
              <Button
                title={t('checkAnswer')}
                compact
                onPress={() => void handleSubmitSelectAll()}
                loading={submitting}
                style={styles.actionBtn}
              />
            ) : current.type === 'open_words' ? (
              <Button
                title={t('checkAnswer')}
                compact
                onPress={() => void handleSubmitOpenWords()}
                loading={submitting}
                style={styles.actionBtn}
              />
            ) : null}
            <Button
              title={t('back')}
              onPress={() => router.back()}
              variant="outline"
              compact
              style={styles.actionBtn}
            />
          </View>
        </Card>
      </KeyboardScroll>

      <Celebration visible={celebrate} sfx={false} message={celebrateMsg} onDone={() => setCelebrate(false)} />
    </ThemedScreen>
  );
}
