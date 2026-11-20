import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { FamilyInviteInfo, User } from '@kidsapp/shared';
import { MAX_MANUAL_BONUS_POINTS, calculateLevel } from '@kidsapp/shared';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { usePremium, useErrorHandler } from '../../lib/premium';
import { ScreenCacheKey, readScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { useTheme } from '../../lib/theme-context';
import { haptic } from '../../lib/haptics';
import { INK } from '../../constants/themes';
import {
  AvatarSticker,
  CalmScreen,
  ChoiceChip,
  Coin,
  Dialog,
  Field,
  Flame,
  Icon,
  Pill,
  Row,
  SectionTitle,
  Sheet,
  Sticker,
  ToyButton,
  Txt,
  formatNum,
  toast,
  type IconName,
} from '../../components/ui';
import { KidForm, kidDraftFrom, validateKid, type KidDraft } from '../../components/parent/KidForm';
import { KidLoginQrModal } from '../../components/KidLoginQrModal';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';

const BONUS = [5, 10, 20, 50, 100];

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <ToyButton title={label} icon={icon} variant="quiet" size="sm" full onPress={onPress} />
    </View>
  );
}

export default function FamilyScreen() {
  const params = useLocalSearchParams<{ kid?: string; bonus?: string }>();
  const router = useRouter();
  const { world } = useTheme();
  const { limits, openPaywall, refresh: refreshPlan } = usePremium();
  const onError = useErrorHandler();
  const [kids, setKids] = useState<User[]>(() => readScreenCache<User[]>(ScreenCacheKey.parentKids) ?? []);
  const [invite, setInvite] = useState<FamilyInviteInfo | null>(null);
  const [form, setForm] = useState<{ kid: User | null; draft: KidDraft } | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [bonusKid, setBonusKid] = useState<User | null>(null);
  const [bonusAmount, setBonusAmount] = useState('10');
  const [bonusReason, setBonusReason] = useState('');
  const [qrKid, setQrKid] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [k, inv] = await Promise.all([api.getKids(), api.getFamilyInvite().catch(() => null)]);
    setKids(k.kids);
    setInvite(inv);
    writeScreenCache(ScreenCacheKey.parentKids, k.kids);
  }, []);
  const ready = useFocusLoad(load);

  useEffect(() => {
    if (!ready) return;
    if (params.kid) {
      const k = kids.find((x) => x._id === params.kid);
      if (k) setForm({ kid: k, draft: kidDraftFrom(k) });
      router.setParams({ kid: undefined });
    } else if (params.bonus && kids.length) {
      setBonusKid(kids[0]);
      router.setParams({ bonus: undefined });
    }
  }, [ready, params.kid, params.bonus, kids, router]);

  const openAdd = () => {
    if (kids.length >= limits.maxKids) {
      openPaywall('kids');
      return;
    }
    setFormError('');
    setForm({ kid: null, draft: kidDraftFrom(null) });
  };

  const saveKid = async () => {
    if (!form) return;
    const err = validateKid(form.draft, !!form.kid);
    if (err) {
      setFormError(err);
      haptic.warn();
      return;
    }
    setSaving(true);
    try {
      const d = form.draft;
      if (form.kid) {
        await api.updateKid(form.kid._id, {
          displayName: d.displayName.trim(),
          username: d.username.trim(),
          avatar: d.avatar,
          grade: d.grade,
          ...(d.pin ? { pin: d.pin } : {}),
        });
        toast('הפרטים נשמרו');
      } else {
        const res = await api.createKid({
          displayName: d.displayName.trim(),
          username: d.username.trim(),
          pin: d.pin,
          avatar: d.avatar,
          ...(d.grade ? { grade: d.grade } : {}),
        });
        haptic.success();
        toast(`${res.kid.displayName} הצטרפ/ה למשפחה!`);
        setQrKid(res.kid);
        void refreshPlan();
      }
      setForm(null);
      await load();
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  };

  const giveBonus = async () => {
    if (!bonusKid) return;
    const amount = Number(bonusAmount);
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_MANUAL_BONUS_POINTS) {
      toast(`בונוס בין 1 ל-${MAX_MANUAL_BONUS_POINTS}`, 'error');
      return;
    }
    setSaving(true);
    try {
      await api.awardKidBonus(bonusKid._id, amount, bonusReason.trim() || undefined);
      haptic.success();
      toast(`${amount} מטבעות נשלחו ל${bonusKid.displayName}!`);
      setBonusKid(null);
      setBonusReason('');
      await load();
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  };

  const deleteKid = async (kid: User) => {
    try {
      await api.deleteKid(kid._id);
      setConfirmDelete(null);
      setForm(null);
      toast('הפרופיל נמחק', 'info');
      void refreshPlan();
      await load();
    } catch (e) {
      onError(e);
    }
  };

  const copyCode = async () => {
    if (!invite?.inviteCode) return;
    await Clipboard.setStringAsync(invite.inviteCode);
    haptic.success();
    toast('הקוד הועתק');
  };

  const shareInvite = async () => {
    if (!invite?.inviteCode) return;
    const message = `הצטרפו למשפחה שלנו ב-KidsQuest! קוד ההזמנה: ${invite.inviteCode}\nhttps://kids.synaboard.com/parent-register?invite=${invite.inviteCode}`;
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(message);
      toast('ההזמנה הועתקה');
    } else {
      await Share.share({ message });
    }
  };

  return (
    <CalmScreen
      title="המשפחה"
      subtitle="ילדים, קוד כניסה והורה נוסף"
      action={<ToyButton icon="plus" size="sm" accessibilityLabel="הוספת ילד/ה" onPress={openAdd} />}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load().catch(() => {});
        setRefreshing(false);
      }}
      overlay={
        <>
          <Sheet
            visible={!!form}
            onClose={() => setForm(null)}
            title={form?.kid ? `עריכת ${form.kid.displayName}` : 'ילד/ה חדש/ה'}
            footer={
              <>
                {formError ? <Txt v="strong" color="#CC2C3D">{formError}</Txt> : null}
                <ToyButton title={form?.kid ? 'שמירה' : 'הוספה למשפחה'} icon={form?.kid ? 'check' : 'plus'} full loading={saving} onPress={saveKid} />
                {form?.kid ? (
                  <ToyButton title="מחיקת הפרופיל" variant="ghost" size="md" full onPress={() => setConfirmDelete(form.kid)} sound={false} />
                ) : null}
              </>
            }
          >
            {form ? <KidForm draft={form.draft} editing={!!form.kid} onChange={(d) => setForm((f) => (f ? { ...f, draft: d } : f))} /> : null}
          </Sheet>

          <Sheet
            visible={!!bonusKid}
            onClose={() => setBonusKid(null)}
            title="בונוס מטבעות"
            subtitle="על עזרה, התנהגות יפה או סתם כי מגיע"
            footer={<ToyButton title={`שליחת ${bonusAmount || 0} מטבעות`} variant="gold" lead={<Coin size={22} />} full loading={saving} onPress={giveBonus} sound="coin" />}
          >
            {kids.length > 1 ? (
              <Row gap={8} wrap>
                {kids.map((k) => (
                  <ChoiceChip key={k._id} label={k.displayName} selected={bonusKid?._id === k._id} onPress={() => setBonusKid(k)} />
                ))}
              </Row>
            ) : null}
            <Row gap={8} wrap>
              {BONUS.map((n) => (
                <ChoiceChip key={n} label={`+${n}`} selected={bonusAmount === String(n)} onPress={() => setBonusAmount(String(n))} />
              ))}
            </Row>
            <Field kind="number" label="או סכום אחר" value={bonusAmount} onChangeText={(v) => setBonusAmount(v.replace(/\D/g, ''))} />
            <Field label="על מה? (לא חובה)" value={bonusReason} onChangeText={setBonusReason} placeholder="למשל: עזרת לאח הקטן" maxLength={120} />
          </Sheet>

          <Dialog
            visible={!!confirmDelete}
            title={`למחוק את ${confirmDelete?.displayName ?? ''}?`}
            message="כל המשימות, המטבעות וההיסטוריה של הילד/ה יימחקו לתמיד. אי אפשר לבטל."
            confirmLabel="מחיקה לתמיד"
            destructive
            onConfirm={() => confirmDelete && deleteKid(confirmDelete)}
            onCancel={() => setConfirmDelete(null)}
          />
          <KidLoginQrModal kid={qrKid} visible={!!qrKid} onClose={() => setQrKid(null)} />
        </>
      }
    >
      {invite?.inviteCode ? (
        <Sticker tone="calm" color={world.accentSoft} pad={16}>
          <View style={{ gap: 10 }}>
            <Txt v="caption">קוד המשפחה</Txt>
            <Row justify="between">
              <Txt v="hero" num style={{ letterSpacing: 6 }}>
                {invite.inviteCode}
              </Txt>
              <ToyButton icon="copy" variant="secondary" size="sm" accessibilityLabel="העתקת הקוד" onPress={copyCode} />
            </Row>
            <Txt v="caption" muted>
              הילדים נכנסים עם הקוד הזה + שם משתמש + קוד סודי. הורה נוסף נרשם איתו ל"יש לי קוד הזמנה".
            </Txt>
            {invite.canInvite ? (
              <ToyButton title="הזמנת הורה נוסף" icon="share" variant="secondary" size="md" onPress={shareInvite} />
            ) : (
              <Txt v="caption" muted>
                {invite.parents.map((p) => p.displayName).join(' ו')} מנהלים יחד את המשפחה.
              </Txt>
            )}
          </View>
        </Sticker>
      ) : null}

      <SectionTitle title="הילדים" count={undefined} />
      {!ready && !kids.length ? (
        <ScreenSkeleton cards={2} />
      ) : kids.length === 0 ? (
        <Sticker tone="calm">
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
            <Txt v="h2" align="center">
              עוד אין ילדים במשפחה
            </Txt>
            <ToyButton title="הוספת ילד/ה" icon="plus" onPress={openAdd} style={{ alignSelf: 'center' }} />
          </View>
        </Sticker>
      ) : (
        kids.map((k) => {
          const lvl = calculateLevel(k.xp);
          return (
            <Sticker key={k._id} tone="calm" pad={14}>
              <View style={{ gap: 12 }}>
                <Row gap={12}>
                  <AvatarSticker avatar={k.rentalAvatar || k.avatar} size={60} />
                  <View style={{ flex: 1 }}>
                    <Txt v="h2">{k.displayName}</Txt>
                    <Row gap={6}>
                      <Txt v="caption" muted>
                        @{k.username}
                      </Txt>
                      <Pill label={`שלב ${lvl.level}`} />
                    </Row>
                  </View>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Row gap={4}>
                      <Coin size={20} />
                      <Txt v="title" num>
                        {formatNum(k.points)}
                      </Txt>
                    </Row>
                    <Row gap={4}>
                      <Flame size={18} dim={!k.streak} />
                      <Txt v="caption" num>
                        {k.streak}
                      </Txt>
                    </Row>
                  </View>
                </Row>
                <Row gap={8}>
                  <Action icon="star" label="בונוס" onPress={() => setBonusKid(k)} />
                  <Action icon="qr" label="כניסה" onPress={() => setQrKid(k)} />
                  <Action icon="edit" label="עריכה" onPress={() => {
                    setFormError('');
                    setForm({ kid: k, draft: kidDraftFrom(k) });
                  }} />
                </Row>
                <Row gap={8}>
                  <Action icon="clock" label="היסטוריה" onPress={() => router.push({ pathname: '/(parent)/kid-history', params: { kidId: k._id } })} />
                  <Action icon="gift" label="פרסים שקנו" onPress={() => router.push({ pathname: '/(parent)/kid-gifts', params: { kidId: k._id } })} />
                </Row>
              </View>
            </Sticker>
          );
        })
      )}
      {kids.length > 0 && kids.length < limits.maxKids ? (
        <ToyButton title="הוספת ילד/ה" icon="plus" variant="secondary" full onPress={openAdd} />
      ) : kids.length >= limits.maxKids && kids.length > 0 ? (
        <Sticker tone="calm" color="#FFF6D6" onPress={() => openPaywall('kids')} accessibilityLabel="פרימיום">
          <Row gap={10}>
            <Icon name="crown" size={24} color={INK} />
            <Txt v="strong" style={{ flex: 1 }}>
              רוצים להוסיף עוד ילדים? בפרימיום אפשר עד 8.
            </Txt>
          </Row>
        </Sticker>
      ) : null}
    </CalmScreen>
  );
}

