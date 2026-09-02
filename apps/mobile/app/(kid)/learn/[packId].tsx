import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../lib/auth';
import { api } from '../../../lib/api';
import { useFocusLoad } from '../../../hooks/useFocusLoad';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Celebration } from '../../../components/Celebration';
import { ThemedScreen } from '../../../components/ThemedScreen';
import { MultipleChoice } from '../../../components/learning/MultipleChoice';
import { useCelebrateBadges } from '../../../lib/badge-celebration';
import type { LearningPackDetail, PublicLearningActivity } from '@kidsapp/shared';
import { packDisplayTitle, packDisplaySubtitle } from '@kidsapp/shared';
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
  const [correctId, setCorrectId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateMsg, setCelebrateMsg] = useState('');
  const [finished, setFinished] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, flexGrow: 1 },
        header: { marginBottom: spacing.lg },
        title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
        progress: {
          color: colors.textMuted,
          fontSize: 14,
          textAlign: 'center',
          marginTop: spacing.xs,
        },
        feedback: {
          marginTop: spacing.md,
          padding: spacing.md,
          borderRadius: 12,
          width: '100%',
        },
        feedbackCorrect: { backgroundColor: colors.success + '33' },
        feedbackWrong: { backgroundColor: colors.danger + '33' },
        feedbackText: { color: colors.text, fontSize: 15, textAlign: 'center', fontWeight: '600' },
        actions: { marginTop: spacing.lg, gap: spacing.sm },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        doneTitle: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
        doneSub: { color: colors.textMuted, fontSize: 16, textAlign: 'center', marginTop: spacing.sm },
      }),
    [themeId, colors]
  );

  const load = useCallback(async () => {
    if (!packId) return;
    setLoading(true);
    try {
      const res = await api.getLearningPack(packId);
      setDetail(res);
      if (res.completed) {
        setFinished(true);
      } else {
        const firstIncomplete = res.pack.activities.findIndex(
          (a) => !res.completedActivityIds.includes(a.id)
        );
        setActivityIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
      }
    } finally {
      setLoading(false);
    }
  }, [packId]);

  useFocusLoad(load, !!user && !!packId);

  const activities = detail?.pack.activities ?? [];
  const current: PublicLearningActivity | undefined = activities[activityIndex];
  const completedIds = detail?.completedActivityIds ?? [];

  const resetQuestionState = () => {
    setSelectedId(null);
    setCorrectId(null);
    setExplanation(null);
  };

  const handleCheck = async () => {
    if (!packId || !current || !selectedId || checking) return;

    setChecking(true);
    try {
      const result = await api.checkLearningAnswer(packId, current.id, selectedId);
      await refreshUser();

      if (result.correct) {
        setCorrectId(selectedId);
        playSfx('complete');
        if (result.explanation?.he) {
          setExplanation(result.explanation.he);
        }
        if (result.pointsAwarded > 0) {
          setCelebrateMsg(`+${result.pointsAwarded} ${pointsEmoji}`);
          setCelebrate(true);
        }
        if (result.newBadges?.length) {
          celebrateBadges(result.newBadges);
        }
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                completedActivityIds: [...prev.completedActivityIds, current.id],
                completed: result.packCompleted,
              }
            : prev
        );
      } else {
        playSfx('error');
        if (result.correctOptionId) {
          setCorrectId(result.correctOptionId);
        }
        if (result.explanation?.he) {
          setExplanation(result.explanation.he);
        } else {
          setExplanation(t('tryAgain'));
        }
      }
    } catch (err: unknown) {
      playSfx('error');
      const message = err instanceof Error ? err.message : t('learningCheckError');
      setExplanation(message);
    } finally {
      setChecking(false);
    }
  };

  const handleNext = () => {
    resetQuestionState();
    if (activityIndex + 1 >= activities.length) {
      setFinished(true);
      return;
    }
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
      </ThemedScreen>
    );
  }

  if (!current || current.type !== 'multiple_choice' || !current.options) {
    return (
      <ThemedScreen tabs>
        <View style={styles.center}>
          <Text style={styles.doneSub}>{t('activityTypeUnsupported')}</Text>
          <Button title={t('back')} onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
        </View>
      </ThemedScreen>
    );
  }

  const alreadyDone = completedIds.includes(current.id);
  const answered = correctId !== null || alreadyDone;

  return (
    <ThemedScreen tabs>
      <ScrollView contentContainerStyle={[styles.scroll, rtl.scrollContent]}>
        <View style={styles.header}>
          <Text style={[styles.title, rtl.text]}>{packDisplayTitle(detail.pack.title)}</Text>
          {packDisplaySubtitle(detail.pack.title) ? (
            <Text style={styles.progress}>{packDisplaySubtitle(detail.pack.title)}</Text>
          ) : null}
          <Text style={styles.progress}>
            {activityIndex + 1} / {activities.length}
          </Text>
        </View>

        <Card>
          <MultipleChoice
            prompt={current.prompt.text}
            options={current.options}
            selectedId={selectedId}
            correctId={alreadyDone ? selectedId : correctId}
            disabled={answered || checking}
            onSelect={setSelectedId}
          />

          {explanation && (
            <View
              style={[
                styles.feedback,
                correctId || alreadyDone ? styles.feedbackCorrect : styles.feedbackWrong,
              ]}
            >
              <Text style={[styles.feedbackText, rtl.text]}>{explanation}</Text>
            </View>
          )}

          <View style={styles.actions}>
            {!answered && (
              <Button
                title={t('checkAnswer')}
                onPress={handleCheck}
                disabled={!selectedId || checking}
                loading={checking}
              />
            )}
            {(answered || alreadyDone) && (
              <Button title={t('nextQuestion')} onPress={handleNext} />
            )}
            <Button title={t('back')} onPress={() => router.back()} variant="outline" sound={false} />
          </View>
        </Card>
      </ScrollView>

      <Celebration visible={celebrate} message={celebrateMsg} onDone={() => setCelebrate(false)} />
    </ThemedScreen>
  );
}
