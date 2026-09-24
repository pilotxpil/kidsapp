import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { ParentDailyWordList } from '../../components/DailyWord';
import { ParentDailyRiddleList } from '../../components/DailyRiddle';
import { KidAvatar } from '../../components/KidAvatar';
import { Button } from '../../components/Button';
import { ThemedScreen } from '../../components/ThemedScreen';
import { ScreenReveal, ScreenSkeleton } from '../../components/ScreenSkeleton';
import { ScreenCacheKey, hasScreenCache, readScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { KeyboardSheet } from '../../components/KeyboardSheet';
import { ProgressBar } from '../../components/ProgressBar';
import type {
  ParentDashboard,
  TaskCategory,
  FamilyChallenge,
  FamilyAchievementEntry,
} from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

export default function ParentDashboardScreen() {
  const { user, logout } = useAuth();
  const { colors, borderRadius, cardBorder, pointsEmoji, categoryIcon, id: themeId } = useTheme();
  type DashCache = {
    dashboard: ParentDashboard;
    challenge: FamilyChallenge | null;
    achievements: FamilyAchievementEntry[];
  };
  const hadCache = useRef(hasScreenCache(ScreenCacheKey.parentDashboard)).current;
  const [dashboard, setDashboard] = useState<ParentDashboard | null>(
    () => readScreenCache<DashCache>(ScreenCacheKey.parentDashboard)?.dashboard ?? null
  );
  const [challenge, setChallenge] = useState<FamilyChallenge | null>(
    () => readScreenCache<DashCache>(ScreenCacheKey.parentDashboard)?.challenge ?? null
  );
  const [achievements, setAchievements] = useState<FamilyAchievementEntry[]>(
    () => readScreenCache<DashCache>(ScreenCacheKey.parentDashboard)?.achievements ?? []
  );
  const [refreshing, setRefreshing] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { padding: spacing.lg, maxWidth: 800, alignSelf: 'center', width: '100%' },
        header: { marginBottom: spacing.lg },
        headerText: { flex: 1, minWidth: 0 },
        greeting: { color: colors.textMuted, fontSize: 14 },
        name: { color: colors.text, fontSize: 24, fontWeight: '800' },
        logout: { color: colors.danger, fontSize: 14, fontWeight: '600' },
        statsRow: { gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
        statCard: { flex: 1, minWidth: 90 },
        statInner: { alignItems: 'center', width: '100%' },
        statNum: { color: colors.primaryLight, fontSize: 28, fontWeight: '800', textAlign: 'center' },
        statLabel: {
          color: colors.textMuted,
          fontSize: 11,
          textAlign: 'center',
          marginTop: 4,
          writingDirection: 'rtl',
          width: '100%',
        },
        sectionTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: '700',
          marginBottom: spacing.md,
          marginTop: spacing.md,
          width: '100%',
        },
        empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.md, width: '100%' },
        approvalCard: { marginBottom: spacing.md },
        approvalHeader: { marginBottom: spacing.md, width: '100%', alignItems: 'flex-start' },
        approvalIcon: { fontSize: 32 },
        approvalInfo: { flex: 1, minWidth: 0 },
        approvalTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
        approvalKid: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
        proofImage: {
          width: '100%',
          height: 160,
          borderRadius: borderRadius.md,
          marginBottom: spacing.sm,
          backgroundColor: colors.bg,
        },
        approvalActions: { gap: spacing.sm, width: '100%' },
        approveBtn: { flex: 1 },
        kidsRow: { flexWrap: 'wrap', gap: spacing.sm, width: '100%' },
        kidCard: { width: '47%' },
        kidInner: { alignItems: 'center', width: '100%' },
        kidAvatar: { fontSize: 40, textAlign: 'center' },
        kidName: {
          color: colors.text,
          fontWeight: '700',
          marginTop: spacing.sm,
          textAlign: 'center',
          writingDirection: 'rtl',
          width: '100%',
        },
        kidPoints: { color: colors.gold, fontWeight: '700', marginTop: 4, textAlign: 'center', width: '100%' },
        kidLevel: { color: colors.textMuted, fontSize: 12, textAlign: 'center', width: '100%' },
        challengeCard: { marginBottom: spacing.md },
        challengeTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
        challengeMeta: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
        achievementRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          width: '100%',
          marginBottom: spacing.md,
        },
        achievementChip: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.md,
          padding: spacing.sm,
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: '46%',
          maxWidth: '48%',
          ...cardBorder(1),
        },
        achievementIcon: { fontSize: 22, textAlign: 'center' },
        achievementLabel: {
          color: colors.text,
          fontWeight: '700',
          textAlign: 'center',
          marginTop: 4,
          writingDirection: 'rtl',
        },
        achievementDesc: {
          color: colors.textMuted,
          fontSize: 11,
          textAlign: 'center',
          marginTop: 2,
          writingDirection: 'rtl',
        },
        achievementKid: {
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          marginTop: 4,
        },
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        modalCard: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          ...cardBorder(2),
        },
        modalTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: '700',
          marginBottom: spacing.md,
          writingDirection: 'rtl',
        },
        modalInput: {
          backgroundColor: colors.bg,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          color: colors.text,
          minHeight: 80,
          textAlignVertical: 'top',
          writingDirection: 'rtl',
          textAlign: 'right',
          marginBottom: spacing.md,
        },
        modalActions: { gap: spacing.sm },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const load = useCallback(async () => {
    const [dash, ch, ach] = await Promise.all([
      api.getDashboard(),
      api.getFamilyChallenge().catch(() => null),
      api.getFamilyAchievements().catch(() => null),
    ]);
    const next: DashCache = {
      dashboard: dash.dashboard,
      challenge: ch?.challenge ?? null,
      achievements: ach?.achievements.slice(0, 8) ?? [],
    };
    writeScreenCache(ScreenCacheKey.parentDashboard, next);
    setDashboard(next.dashboard);
    setChallenge(next.challenge);
    setAchievements(next.achievements);
  }, []);

  const ready = useFocusLoad(load);
  const showSkeleton = !ready && !hadCache;

  const handleApproveCompletion = async (id: string) => {
    await api.approveCompletion(id, 'approve');
    await load();
  };

  const openReject = (id: string) => {
    setRejectId(id);
    setRejectNote('');
  };

  const submitReject = async () => {
    if (!rejectId) return;
    const note = rejectNote.trim();
    if (!note) {
      Alert.alert(t('rejectReasonRequired'));
      return;
    }
    setRejecting(true);
    try {
      await api.approveCompletion(rejectId, 'reject', note);
      setRejectId(null);
      setRejectNote('');
      await load();
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
    } finally {
      setRejecting(false);
    }
  };

  const handleApproveRedemption = async (id: string, action: 'approve' | 'reject') => {
    await api.approveRedemption(id, action);
    await load();
  };

  const handleReviewDailyWord = async (kidId: string) => {
    try {
      await api.reviewDailyWord(kidId, 'approve');
      await load();
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
    }
  };

  const handleReviewRiddleAppeal = async (kidId: string, action: 'approve' | 'reject') => {
    try {
      await api.reviewDailyRiddleAppeal(kidId, action);
      await load();
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
    }
  };

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
          <TouchableOpacity onPress={() => logout()}>
            <Text style={styles.logout}>{t('logout')}</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, rtl.textFull]}>{t('dashboard')}</Text>
            <Text style={[styles.name, rtl.textFull]}>{user?.displayName}</Text>
          </View>
        </View>

        {showSkeleton ? (
          <ScreenSkeleton />
        ) : (
        <ScreenReveal animate={!hadCache}>
        {dashboard && (
          <View style={[styles.statsRow, rtl.row]}>
            <Card style={styles.statCard}>
              <View style={styles.statInner}>
                <Text style={styles.statNum}>{dashboard.stats.pendingApprovals}</Text>
                <Text style={styles.statLabel}>{t('pendingApprovals')}</Text>
              </View>
            </Card>
            <Card style={styles.statCard}>
              <View style={styles.statInner}>
                <Text style={styles.statNum}>{dashboard.stats.totalTasks}</Text>
                <Text style={styles.statLabel}>{t('totalTasks')}</Text>
              </View>
            </Card>
            <Card style={styles.statCard}>
              <View style={styles.statInner}>
                <Text style={styles.statNum}>{dashboard.stats.totalRewards}</Text>
                <Text style={styles.statLabel}>{t('totalRewards')}</Text>
              </View>
            </Card>
          </View>
        )}

        {challenge && (
          <>
            <Text style={[styles.sectionTitle, rtl.textFull]}>{t('familyChallenge')}</Text>
            <Card style={styles.challengeCard}>
              <Text style={[styles.challengeTitle, rtl.textFull]}>{challenge.title}</Text>
              <ProgressBar progress={challenge.targetCount > 0 ? challenge.progress / challenge.targetCount : 0} />
              <Text style={[styles.challengeMeta, rtl.textFull]}>
                {challenge.completed
                  ? t('familyChallengeDone')
                  : t('familyChallengeProgress')
                      .replace('{current}', String(challenge.progress))
                      .replace('{target}', String(challenge.targetCount))}
              </Text>
              <Text style={[styles.challengeMeta, rtl.textFull]}>
                {t('familyChallengeReward')
                  .replace('{title}', challenge.rewardTitle)
                  .replace('{points}', String(challenge.rewardPoints))}
              </Text>
            </Card>
          </>
        )}

        <ParentDailyWordList
          items={dashboard?.dailyWords ?? []}
          onApprove={(kidId) => void handleReviewDailyWord(kidId)}
        />
        <ParentDailyRiddleList
          items={dashboard?.dailyRiddles ?? []}
          onReviewAppeal={(kidId, action) => handleReviewRiddleAppeal(kidId, action)}
        />

        <Text style={[styles.sectionTitle, rtl.textFull]}>{t('taskApprovals')}</Text>
        {dashboard?.pendingCompletions.length === 0 ? (
          <Text style={styles.empty}>אין בקשות ממתינות</Text>
        ) : (
          dashboard?.pendingCompletions.map((c) => (
            <Card key={c._id} style={styles.approvalCard}>
              <View style={[styles.approvalHeader, rtl.row]}>
                <Text style={styles.approvalIcon}>
                  {c.task?.category ? categoryIcon(c.task.category as TaskCategory) : '🧱'}
                </Text>
                <View style={styles.approvalInfo}>
                  <Text style={[styles.approvalTitle, rtl.textFull]}>{c.task?.title}</Text>
                  <Text style={[styles.approvalKid, rtl.textFull]}>
                    {c.kid?.displayName} · +{c.task?.points} {pointsEmoji}
                  </Text>
                </View>
              </View>
              {c.proofPhoto ? (
                <Image source={{ uri: c.proofPhoto }} style={styles.proofImage} resizeMode="cover" />
              ) : null}
              <View style={[styles.approvalActions, rtl.row]}>
                <Button
                  title={t('approve')}
                  onPress={() => handleApproveCompletion(c._id)}
                  variant="success"
                  style={styles.approveBtn}
                />
                <Button
                  title={t('reject')}
                  onPress={() => openReject(c._id)}
                  variant="danger"
                  style={styles.approveBtn}
                />
              </View>
            </Card>
          ))
        )}

        <Text style={[styles.sectionTitle, rtl.textFull]}>{t('rewardApprovals')}</Text>
        {dashboard?.pendingRedemptions.length === 0 ? (
          <Text style={styles.empty}>אין בקשות ממתינות</Text>
        ) : (
          dashboard?.pendingRedemptions.map((r) => (
            <Card key={r._id} style={styles.approvalCard}>
              <View style={[styles.approvalHeader, rtl.row]}>
                <Text style={styles.approvalIcon}>{r.reward?.icon || '📦'}</Text>
                <View style={styles.approvalInfo}>
                  <Text style={[styles.approvalTitle, rtl.textFull]}>{r.reward?.title}</Text>
                  <Text style={[styles.approvalKid, rtl.textFull]}>
                    {r.kid?.displayName} · {r.cost} {pointsEmoji}
                  </Text>
                </View>
              </View>
              <View style={[styles.approvalActions, rtl.row]}>
                <Button
                  title={t('approve')}
                  onPress={() => handleApproveRedemption(r._id, 'approve')}
                  variant="success"
                  style={styles.approveBtn}
                />
                <Button
                  title={t('reject')}
                  onPress={() => handleApproveRedemption(r._id, 'reject')}
                  variant="danger"
                  style={styles.approveBtn}
                />
              </View>
            </Card>
          ))
        )}

        <Text style={[styles.sectionTitle, rtl.textFull]}>{t('manageKids')}</Text>
        <View style={[styles.kidsRow, rtl.row]}>
          {dashboard?.kids.map((kid) => (
            <Card key={kid._id} style={styles.kidCard}>
              <View style={styles.kidInner}>
                <KidAvatar avatar={kid.avatar} size={40} />
                <Text style={styles.kidName}>{kid.displayName}</Text>
                <Text style={styles.kidPoints}>{kid.points} XP</Text>
                <Text style={styles.kidLevel}>
                  רמה {kid.level}
                  {(kid.learningStreak ?? 0) > 0 ? ` · 📚 ${kid.learningStreak}` : ''}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        {achievements.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, rtl.textFull]}>{t('familyAchievements')}</Text>
            <View style={[styles.achievementRow, rtl.row]}>
              {achievements.map((a) => (
                <View key={a.id} style={styles.achievementChip}>
                  <Text style={styles.achievementIcon}>{a.icon}</Text>
                  <Text style={styles.achievementLabel}>{a.label}</Text>
                  {a.kidName ? (
                    <View style={[styles.achievementKid, rtl.rowInline]}>
                      <KidAvatar avatar={a.kidAvatar || '🎮'} size={16} />
                      <Text style={styles.achievementDesc}>{a.kidName}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.achievementDesc}>{a.description}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        </ScreenReveal>
        )}
      </ScrollView>

      <Modal visible={!!rejectId} transparent animationType="fade" onRequestClose={() => setRejectId(null)}>
        <KeyboardSheet style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('rejectReason')}</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectNote}
              onChangeText={setRejectNote}
              placeholder={t('rejectReasonPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <View style={styles.modalActions}>
              <Button title={t('reject')} onPress={submitReject} variant="danger" loading={rejecting} />
              <Button title={t('cancel')} onPress={() => setRejectId(null)} variant="secondary" />
            </View>
          </View>
        </KeyboardSheet>
      </Modal>
    </ThemedScreen>
  );
}
