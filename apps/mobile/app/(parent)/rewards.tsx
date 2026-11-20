import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Reward, RewardCategory } from '@kidsapp/shared';
import { REWARD_CATEGORIES, REWARD_TEMPLATES, resolvedRewardIcon, suggestedRewardIcon } from '@kidsapp/shared';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { usePremium, useErrorHandler } from '../../lib/premium';
import { ScreenCacheKey, readScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { useTheme } from '../../lib/theme-context';
import { haptic } from '../../lib/haptics';
import { INK, LINE, WHITE } from '../../constants/themes';
import { ROW } from '../../lib/dir';
import {
  CalmScreen,
  ChoiceChip,
  Coin,
  Dialog,
  EmptyState,
  Field,
  Row,
  Sheet,
  Sticker,
  ToyButton,
  Txt,
  formatNum,
  toast,
} from '../../components/ui';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';

type Draft = { title: string; description: string; cost: string; category: RewardCategory; icon: string };

const ICONS = ['🎁', '🍕', '🍦', '🍫', '🥤', '🎮', '📱', '📺', '🎬', '🧸', '⚽', '🎨', '🛝', '🏊', '🎡', '🛍️', '💸', '🌙', '🍿', '🎟️', '📚', '🚲', '🐶', '👑'];
const COSTS = [50, 100, 200, 300, 500, 1000];

const empty: Draft = { title: '', description: '', cost: '100', category: 'other', icon: '🎁' };

export default function ParentRewardsScreen() {
  const params = useLocalSearchParams<{ new?: string }>();
  const router = useRouter();
  const { world } = useTheme();
  const { limits, isPremium } = usePremium();
  const onError = useErrorHandler();
  const [rewards, setRewards] = useState<Reward[]>(() => readScreenCache<Reward[]>(ScreenCacheKey.parentRewards) ?? []);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Reward | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await api.getRewards();
    setRewards(res.rewards);
    writeScreenCache(ScreenCacheKey.parentRewards, res.rewards);
  }, []);
  const ready = useFocusLoad(load);

  const openNew = useCallback(() => {
    setEditing(null);
    setDraft(empty);
    setError('');
    setOpen(true);
  }, []);

  useEffect(() => {
    if (params.new && ready) {
      openNew();
      router.setParams({ new: undefined });
    }
  }, [params.new, ready, openNew, router]);

  const openEdit = (r: Reward) => {
    setEditing(r);
    setDraft({
      title: r.title,
      description: r.description,
      cost: String(r.cost),
      category: r.category,
      icon: resolvedRewardIcon(r.title, r.icon, r.category),
    });
    setError('');
    setOpen(true);
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const cost = Number(draft.cost);
    if (!draft.title.trim()) return setError('נא לתת שם לפרס');
    if (!Number.isFinite(cost) || cost < 1) return setError('נא לבחור מחיר במטבעות');
    setSaving(true);
    try {
      const payload = { title: draft.title.trim(), description: draft.description, cost, category: draft.category, icon: draft.icon };
      if (editing) {
        await api.updateReward(editing._id, payload);
        toast('הפרס עודכן');
      } else {
        await api.createReward(payload);
        haptic.success();
        toast('הפרס נוסף לחנות');
      }
      setOpen(false);
      await load();
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: Reward) => {
    try {
      await api.deleteReward(r._id);
      setConfirmDelete(null);
      setOpen(false);
      toast('הפרס הוסר', 'info');
      await load();
    } catch (e) {
      onError(e);
    }
  };

  const active = rewards.filter((r) => r.isActive !== false).sort((a, b) => a.cost - b.cost);

  return (
    <CalmScreen
      title="פרסים"
      subtitle={isPremium ? 'על מה הילדים חוסכים' : `על מה הילדים חוסכים. ${active.length} מתוך ${limits.maxActiveRewards} בתוכנית החינמית`}
      action={<ToyButton icon="plus" size="sm" accessibilityLabel="פרס חדש" onPress={openNew} />}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load().catch(() => {});
        setRefreshing(false);
      }}
      overlay={
        <>
          <Sheet
            visible={open}
            onClose={() => setOpen(false)}
            title={editing ? 'עריכת פרס' : 'פרס חדש'}
            footer={
              <>
                {error ? <Txt v="strong" color="#CC2C3D">{error}</Txt> : null}
                <ToyButton title={editing ? 'שמירה' : 'הוספה לחנות'} icon={editing ? 'check' : 'plus'} full loading={saving} onPress={save} />
                {editing ? <ToyButton title="הסרת הפרס" variant="ghost" size="md" full onPress={() => setConfirmDelete(editing)} sound={false} /> : null}
              </>
            }
          >
            {!editing ? (
              <View style={{ gap: 8 }}>
                <Txt v="caption">רעיונות מוכנים</Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: ROW }}>
                  {REWARD_TEMPLATES.map((t) => (
                    <Pressable
                      key={t.title}
                      onPress={() => {
                        haptic.select();
                        setDraft({ title: t.title, description: t.description, cost: String(t.cost), category: t.category, icon: t.icon });
                      }}
                      style={[styles.tpl, draft.title === t.title && { borderColor: INK, backgroundColor: world.accentSoft }]}
                    >
                      <Txt v="caption" numberOfLines={1}>
                        {t.icon} {t.title}
                      </Txt>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <Field
              label="מה הפרס?"
              value={draft.title}
              placeholder="למשל: ערב סרט עם פופקורן"
              maxLength={80}
              onChangeText={(v) => {
                set('title', v);
                const s = suggestedRewardIcon(v);
                if (s) set('icon', s);
              }}
            />
            <View style={{ gap: 8 }}>
              <Txt v="caption">אייקון</Txt>
              <View style={[styles.icons, { flexDirection: ROW }]}>
                {ICONS.map((ic) => (
                  <Pressable
                    key={ic}
                    onPress={() => {
                      haptic.select();
                      set('icon', ic);
                    }}
                    style={[styles.iconCell, draft.icon === ic && { backgroundColor: world.accentSoft, borderColor: INK }]}
                  >
                    <Txt size={24} align="center" style={{ lineHeight: 30 }}>
                      {ic}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Row gap={6}>
                <Coin size={18} />
                <Txt v="caption">כמה מטבעות זה עולה?</Txt>
              </Row>
              <Row gap={8} wrap>
                {COSTS.map((n) => (
                  <ChoiceChip key={n} label={formatNum(n)} selected={draft.cost === String(n)} onPress={() => set('cost', String(n))} />
                ))}
              </Row>
              <Field kind="number" value={draft.cost} onChangeText={(v) => set('cost', v.replace(/\D/g, ''))} hint="או כתבו מחיר משלכם" />
            </View>
            <View style={{ gap: 8 }}>
              <Txt v="caption">סוג</Txt>
              <Row gap={8} wrap>
                {(Object.keys(REWARD_CATEGORIES) as RewardCategory[]).map((k) => (
                  <ChoiceChip key={k} label={`${REWARD_CATEGORIES[k].icon} ${REWARD_CATEGORIES[k].label}`} selected={draft.category === k} onPress={() => set('category', k)} />
                ))}
              </Row>
            </View>
          </Sheet>
          <Dialog
            visible={!!confirmDelete}
            title="להסיר את הפרס?"
            message="הוא ייעלם מהחנות של הילדים. בקשות שכבר אושרו נשמרות."
            confirmLabel="הסרה"
            destructive
            onConfirm={() => confirmDelete && remove(confirmDelete)}
            onCancel={() => setConfirmDelete(null)}
          />
        </>
      }
    >
      {!ready && !rewards.length ? (
        <ScreenSkeleton cards={3} />
      ) : active.length === 0 ? (
        <Sticker tone="calm">
          <EmptyState title="החנות ריקה" body="פרס טוב הוא כזה שהילדים באמת רוצים. אפשר להתחיל מרעיון מוכן." action="פרס ראשון" onAction={openNew} />
        </Sticker>
      ) : (
        <View style={[styles.grid, { flexDirection: ROW }]}>
          {active.map((r) => (
            <View key={r._id} style={styles.cell}>
              <Sticker tone="calm" pad={12} onPress={() => openEdit(r)} accessibilityLabel={r.title}>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <View style={[styles.bubble, { backgroundColor: world.accentSoft }]}>
                    <Txt size={34} align="center" style={{ lineHeight: 42 }}>
                      {resolvedRewardIcon(r.title, r.icon, r.category)}
                    </Txt>
                  </View>
                  <Txt v="title" align="center" numberOfLines={2} style={{ minHeight: 44 }}>
                    {r.title}
                  </Txt>
                  <Row gap={4}>
                    <Coin size={16} />
                    <Txt v="strong" num>
                      {formatNum(r.cost)}
                    </Txt>
                  </Row>
                </View>
              </Sticker>
            </View>
          ))}
        </View>
      )}
    </CalmScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { width: '50%', padding: 6 },
  bubble: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  tpl: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 2, borderColor: LINE, backgroundColor: WHITE },
  icons: { flexWrap: 'wrap', gap: 6 },
  iconCell: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', backgroundColor: WHITE },
});
