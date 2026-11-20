import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { FamilyAchievementEntry, FamilyChallenge, ParentDashboard } from '@kidsapp/shared';
import { displayTaskIcon } from '@kidsapp/shared';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { useTheme } from '../../lib/theme-context';
import { usePremium, useErrorHandler } from '../../lib/premium';
import { c } from '../../lib/i18n';
import { haptic } from '../../lib/haptics';
import { ScreenCacheKey, readScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { setPendingApprovals } from '../../lib/parent-badges';
import { GOLD, INK } from '../../constants/themes';
import { ROW } from '../../lib/dir';
import {
  AvatarSticker,
  CalmScreen,
  Coin,
  CrownToy,
  Dialog,
  EmptyState,
  Field,
  Flame,
  Piko,
  ProgressBar,
  Row,
  SectionTitle,
  Sheet,
  Sticker,
  ToyButton,
  Txt,
  formatNum,
  toast,
} from '../../components/ui';
import { ApprovalCard } from '../../components/parent/ApprovalCard';
import { ParentDailyWordList } from '../../components/DailyWord';
import { ParentDailyRiddleList } from '../../components/DailyRiddle';
import { AdBanner } from '../../components/AdBanner';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';

type DashCache = { dashboard: ParentDashboard; challenge: FamilyChallenge | null; achievements: FamilyAchievementEntry[] };

function QuickAction({ label, emoji, onPress }: { label: string; emoji: string; onPress: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Sticker tone="calm" pad={10} onPress={onPress} accessibilityLabel={label}>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Txt size={26} align="center" style={{ lineHeight: 32 }}>
            {emoji}
          </Txt>
          <Txt v="caption" align="center">
            + {label}
          </Txt>
        </View>
      </Sticker>
    </View>
  );
}

export default function ParentHome() {
  const { user } = useAuth();
  const router = useRouter();
  const { world } = useTheme();
  const { isPremium, plan, limits, openPaywall } = usePremium();
  const onError = useErrorHandler();
  const cached = readScreenCache<DashCache>(ScreenCacheKey.parentDashboard);
  const [dash, setDash] = useState<ParentDashboard | null>(cached?.dashboard ?? null);
  const [challenge, setChallenge] = useState<FamilyChallenge | null>(cached?.challenge ?? null);
  const [achievements, setAchievements] = useState<FamilyAchievementEntry[]>(cached?.achievements ?? []);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [editChallenge, setEditChallenge] = useState(false);
  const [draft, setDraft] = useState({ title: '', targetCount: '', rewardTitle: '', rewardPoints: '' });

  const load = useCallback(async () => {
    const [d, ch, ach] = await Promise.all([
      api.getDashboard(),
      api.getFamilyChallenge().catch(() => null),
      api.getFamilyAchievements().catch(() => null),
    ]);
    setDash(d.dashboard);
    setChallenge(ch?.challenge ?? null);
    setAchievements(ach?.achievements ?? []);
    setPendingApprovals(d.dashboard.pendingCompletions.length + d.dashboard.pendingRedemptions.length);
    writeScreenCache(ScreenCacheKey.parentDashboard, {
      dashboard: d.dashboard,
      challenge: ch?.challenge ?? null,
      achievements: ach?.achievements ?? [],
    });
  }, []);
  const ready = useFocusLoad(load);

  const dropCompletion = (id: string) =>
    setDash((d) => {
      if (!d) return d;
      const next = { ...d, pendingCompletions: d.pendingCompletions.filter((x) => x._id !== id) };
      setPendingApprovals(next.pendingCompletions.length + next.pendingRedemptions.length);
      return next;
    });
  const dropRedemption = (id: string) =>
    setDash((d) => {
      if (!d) return d;
      const next = { ...d, pendingRedemptions: d.pendingRedemptions.filter((x) => x._id !== id) };
      setPendingApprovals(next.pendingCompletions.length + next.pendingRedemptions.length);
      return next;
    });

  const approveTask = async (id: string, name: string, pts: number) => {
    try {
      await api.approveCompletion(id, 'approve');
      haptic.success();
      dropCompletion(id);
      toast(c.parent.approved.replace('{n}', String(pts)).replace('{name}', name));
      void load().catch(() => {});
    } catch (e) {
      onError(e);
    }
  };

  const submitReject = async () => {
    if (!rejectId) return;
    setRejecting(true);
    try {
      await api.approveCompletion(rejectId, 'reject', rejectNote.trim() || undefined);
      dropCompletion(rejectId);
      setRejectId(null);
      setRejectNote('');
      toast(c.parent.rejected, 'info');
    } catch (e) {
      onError(e);
    } finally {
      setRejecting(false);
    }
  };

  const reviewRedemption = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.approveRedemption(id, action);
      if (action === 'approve') haptic.success();
      dropRedemption(id);
      toast(action === 'approve' ? 'הפרס אושר' : c.parent.rejected, action === 'approve' ? 'success' : 'info');
    } catch (e) {
      onError(e);
    }
  };

  const saveChallenge = async () => {
    try {
      const res = await api.updateFamilyChallenge({
        title: draft.title.trim() || undefined,
        targetCount: Number(draft.targetCount) || undefined,
        rewardTitle: draft.rewardTitle.trim() || undefined,
        rewardPoints: Number(draft.rewardPoints) || undefined,
      });
      setChallenge(res.challenge);
      setEditChallenge(false);
      toast(c.parent.saved);
    } catch (e) {
      onError(e);
    }
  };

  const kids = dash?.kids ?? [];
  const pendingCount = (dash?.pendingCompletions.length ?? 0) + (dash?.pendingRedemptions.length ?? 0);
  const kidById = new Map(kids.map((k) => [k._id, k]));

  return (
    <CalmScreen
      title={c.parent.hello.replace('{name}', user?.displayName ?? '')}
      subtitle={c.parent.helloSub}
      action={
        <ToyButton icon="settings" variant="secondary" size="sm" accessibilityLabel={c.parent.settings} onPress={() => router.push('/(parent)/profile')} />
      }
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load().catch(() => {});
        setRefreshing(false);
      }}
      overlay={
        <>
          <Dialog
            visible={!!rejectId}
            title={c.parent.rejectTitle}
            confirmLabel={c.parent.reject}
            destructive
            loading={rejecting}
            onConfirm={submitReject}
            onCancel={() => setRejectId(null)}
          >
            <Field label={c.parent.rejectNote} placeholder={c.parent.rejectNotePh} value={rejectNote} onChangeText={setRejectNote} maxLength={140} />
          </Dialog>
          <Sheet
            visible={editChallenge}
            onClose={() => setEditChallenge(false)}
            title={c.parent.challengeEdit}
            footer={<ToyButton title={c.parent.save} full onPress={saveChallenge} />}
          >
            <Field label={c.parent.challengeTitle} value={draft.title} onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))} />
            <Field label={c.parent.challengeTarget} kind="number" value={draft.targetCount} onChangeText={(v) => setDraft((d) => ({ ...d, targetCount: v.replace(/\D/g, '') }))} />
            <Field label={c.parent.challengePrize} value={draft.rewardTitle} onChangeText={(v) => setDraft((d) => ({ ...d, rewardTitle: v }))} />
            <Field label={c.parent.challengePoints} kind="number" value={draft.rewardPoints} onChangeText={(v) => setDraft((d) => ({ ...d, rewardPoints: v.replace(/\D/g, '') }))} />
          </Sheet>
        </>
      }
    >
      {ready && kids.length === 0 ? (
        <Sticker color={world.accentSoft} pad={18}>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Piko size={96} mood="cheer" />
            <Txt v="h2" align="center">
              {c.parent.firstKidTitle}
            </Txt>
            <Txt v="body" muted align="center">
              {c.parent.firstKidBody}
            </Txt>
            <ToyButton title={c.parent.firstKidCta} icon="plus" onPress={() => router.push('/(parent)/onboarding')} style={{ alignSelf: 'center' }} />
          </View>
        </Sticker>
      ) : null}

      {kids.length > 0 ? (
        <>
          <SectionTitle title={c.parent.kids} action={c.parent.tabFamily} onAction={() => router.push('/(parent)/kids')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 2, flexDirection: ROW }}>
            {kids.map((k) => (
              <Sticker key={k._id} tone="calm" pad={12} onPress={() => router.push({ pathname: '/(parent)/kids', params: { kid: k._id } })} accessibilityLabel={k.displayName}>
                <View style={{ width: 120, alignItems: 'center', gap: 6 }}>
                  <AvatarSticker avatar={k.rentalAvatar || k.avatar} size={60} />
                  <Txt v="title" align="center" numberOfLines={1}>
                    {k.displayName}
                  </Txt>
                  <Row gap={10} justify="center">
                    <Row gap={3}>
                      <Coin size={16} />
                      <Txt v="caption" num>
                        {formatNum(k.points)}
                      </Txt>
                    </Row>
                    <Row gap={3}>
                      <Flame size={16} dim={!k.streak} />
                      <Txt v="caption" num>
                        {k.streak}
                      </Txt>
                    </Row>
                  </Row>
                </View>
              </Sticker>
            ))}
          </ScrollView>
          <Row gap={10}>
            <QuickAction label={c.parent.quickTask} emoji="✅" onPress={() => router.push({ pathname: '/(parent)/tasks', params: { new: '1' } })} />
            <QuickAction label={c.parent.quickReward} emoji="🎁" onPress={() => router.push({ pathname: '/(parent)/rewards', params: { new: '1' } })} />
            <QuickAction label={c.parent.quickBonus} emoji="⭐" onPress={() => router.push({ pathname: '/(parent)/kids', params: { bonus: '1' } })} />
          </Row>
        </>
      ) : null}

      {kids.length > 0 || pendingCount > 0 ? <SectionTitle title={c.parent.inbox} count={pendingCount} /> : null}
      {!ready && !dash ? (
        <ScreenSkeleton cards={2} />
      ) : (
        <>
          {dash?.pendingCompletions.map((p) => (
            <ApprovalCard
              key={p._id}
              kidName={p.kid?.displayName ?? kidById.get(p.kidId)?.displayName ?? ''}
              kidAvatar={p.kid?.avatar ?? kidById.get(p.kidId)?.avatar ?? '🙂'}
              verb={c.parent.finishedTask}
              title={p.task?.title ?? ''}
              icon={p.task ? displayTaskIcon(p.task.icon, p.task.category) : undefined}
              points={p.task?.points ?? 0}
              when={p.submittedAt}
              photo={p.proofPhoto}
              onApprove={() => approveTask(p._id, p.kid?.displayName ?? '', p.task?.points ?? 0)}
              onReject={() => {
                setRejectNote('');
                setRejectId(p._id);
              }}
            />
          ))}
          {dash?.pendingRedemptions.map((r) => (
            <ApprovalCard
              key={r._id}
              kidName={r.kid?.displayName ?? ''}
              kidAvatar={r.kid?.avatar ?? '🙂'}
              verb={c.parent.redeemed}
              title={r.reward?.title ?? ''}
              icon={r.reward?.icon}
              points={r.cost}
              when={r.requestedAt}
              onApprove={() => reviewRedemption(r._id, 'approve')}
              onReject={() => void reviewRedemption(r._id, 'reject')}
            />
          ))}
          {dash && pendingCount === 0 && kids.length > 0 ? (
            <Sticker tone="calm">
              <EmptyState title={c.parent.inboxEmpty} body={c.parent.inboxEmptyBody} mood="sleepy" />
            </Sticker>
          ) : null}
          {dash?.dailyWords?.length ? (
            <ParentDailyWordList
              items={dash.dailyWords}
              onApprove={(kidId) =>
                void api
                  .reviewDailyWord(kidId, 'approve')
                  .then(() => load())
                  .catch(onError)
              }
            />
          ) : null}
          {(dash?.dailyRiddleSlots ?? dash?.dailyRiddles)?.length ? (
            <ParentDailyRiddleList
              items={dash?.dailyRiddleSlots ?? dash?.dailyRiddles ?? []}
              onReviewAppeal={(kidId, action, slot) =>
                api
                  .reviewDailyRiddleAppeal(kidId, action, slot)
                  .then(() => load())
                  .catch(onError)
              }
            />
          ) : null}
        </>
      )}

      {challenge && kids.length > 0 ? (
        <>
          <SectionTitle
            title={c.parent.challenge}
            action={challenge.completed ? undefined : c.parent.edit}
            onAction={() => {
              if (!limits.customFamilyChallenge) return openPaywall('challenge');
              setDraft({
                title: challenge.title,
                targetCount: String(challenge.targetCount),
                rewardTitle: challenge.rewardTitle,
                rewardPoints: String(challenge.rewardPoints),
              });
              setEditChallenge(true);
            }}
          />
          <Sticker tone="calm" pad={16}>
            <View style={{ gap: 8 }}>
              <Txt v="title">🏆 {challenge.title}</Txt>
              <ProgressBar value={challenge.targetCount ? challenge.progress / challenge.targetCount : 0} color={GOLD} />
              <Txt v="caption" muted>
                {challenge.completed
                  ? c.parent.challengeDone
                  : c.parent.challengeBody
                      .replace('{p}', String(challenge.progress))
                      .replace('{t}', String(challenge.targetCount))
                      .replace('{reward}', challenge.rewardTitle)}
              </Txt>
            </View>
          </Sticker>
        </>
      ) : null}

      {achievements.length ? (
        <>
          <SectionTitle title={c.parent.achievements} />
          <Sticker tone="calm" pad={12}>
            <View style={{ gap: 10 }}>
              {achievements.slice(0, 4).map((a, i) => (
                <Row key={`${a.id}-${i}`} gap={10}>
                  <Txt size={24} style={{ lineHeight: 30 }}>
                    {a.icon}
                  </Txt>
                  <View style={{ flex: 1 }}>
                    <Txt v="strong">{a.label}</Txt>
                    {a.kidName ? (
                      <Txt v="caption" muted>
                        {a.kidName}
                      </Txt>
                    ) : null}
                  </View>
                </Row>
              ))}
            </View>
          </Sticker>
        </>
      ) : null}

      {isPremium ? (
        <Row gap={8} justify="center" style={{ marginTop: 6 }}>
          <CrownToy size={22} />
          <Txt v="caption" muted>
            {plan === 'founder' ? c.parent.founder : c.parent.premiumActive}
          </Txt>
        </Row>
      ) : (
        <Pressable onPress={() => openPaywall()} accessibilityRole="button">
          <View style={styles.premium}>
            <Row gap={12}>
              <CrownToy size={44} />
              <View style={{ flex: 1 }}>
                <Txt v="title">{c.parent.premiumTitle}</Txt>
                <Txt v="caption" muted>
                  {c.parent.premiumPitch}
                </Txt>
              </View>
              <Txt v="strong" color={world.accentDark}>
                {c.parent.premiumCta}
              </Txt>
            </Row>
          </View>
        </Pressable>
      )}
      <AdBanner />
    </CalmScreen>
  );
}

const styles = StyleSheet.create({
  premium: {
    backgroundColor: '#FFF6D6',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: INK,
    padding: 14,
    boxShadow: `0px 3px 0px ${INK}`,
  },
});
