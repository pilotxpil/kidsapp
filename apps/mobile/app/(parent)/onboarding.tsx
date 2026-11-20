import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FamilyInviteInfo, User } from '@kidsapp/shared';
import { REWARD_TEMPLATES, TASK_CATEGORIES, TASK_TEMPLATES } from '@kidsapp/shared';
import { api } from '../../lib/api';
import { useTheme } from '../../lib/theme-context';
import { useErrorHandler, usePremium } from '../../lib/premium';
import { haptic } from '../../lib/haptics';
import { INK, LINE, MINT, WHITE } from '../../constants/themes';
import { Coin, Icon, Piko, Row, Sticker, ToyButton, Txt, GUTTER, useStatusBar, type PikoMood } from '../../components/ui';
import { KidForm, kidDraftFrom, validateKid, type KidDraft } from '../../components/parent/KidForm';
import { KidLoginQrModal } from '../../components/KidLoginQrModal';
import { RewardBurst } from '../../components/kid/RewardBurst';

type Step = 0 | 1 | 2 | 3;

const STEP_COPY: { title: string; body: string; mood: PikoMood }[] = [
  { title: 'בואו נכיר את הילד/ה', body: 'שם, דמות וקוד סודי לכניסה. אפשר להוסיף עוד ילדים אחר כך.', mood: 'happy' },
  { title: 'משימות להתחלה', body: 'בחרנו כמה משימות שעובדות טוב. אפשר לשנות הכל אחר כך.', mood: 'happy' },
  { title: 'על מה חוסכים?', body: 'פרסים שהילדים יכולים לקנות במטבעות שהרוויחו.', mood: 'wink' },
  { title: 'הכל מוכן!', body: 'עכשיו נותנים לילד/ה את הטלפון (או טאבלט) ונכנסים.', mood: 'cheer' },
];

function CheckRow({ on, onPress, label, sub, coins }: { on: boolean; onPress: () => void; label: string; sub?: string; coins: number }) {
  const { world } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      style={[styles.check, on && { borderColor: INK, backgroundColor: world.accentSoft }]}
    >
      <Row gap={12}>
        <View style={[styles.box, on && { backgroundColor: MINT, borderColor: INK }]}>{on ? <Icon name="check" size={16} color={WHITE} stroke={3.2} /> : null}</View>
        <View style={{ flex: 1 }}>
          <Txt v="strong">{label}</Txt>
          {sub ? (
            <Txt v="caption" muted numberOfLines={1}>
              {sub}
            </Txt>
          ) : null}
        </View>
        <Row gap={3}>
          <Coin size={16} />
          <Txt v="caption" num>
            {coins}
          </Txt>
        </Row>
      </Row>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { world } = useTheme();
  const { refresh } = usePremium();
  useStatusBar('dark');
  const onError = useErrorHandler();
  const [step, setStep] = useState<Step>(0);
  const [kidDraft, setKidDraft] = useState<KidDraft>(kidDraftFrom(null));
  const [kid, setKid] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Set<number>>(new Set([0, 1, 4]));
  const [rewards, setRewards] = useState<Set<number>>(new Set([4, 5, 3]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState<FamilyInviteInfo | null>(null);
  const [qr, setQr] = useState(false);
  const [party, setParty] = useState(false);

  useEffect(() => {
    // Returning parents who already have kids skip straight to tasks.
    void api.getKids().then((r) => {
      if (r.kids.length && step === 0) {
        setKid(r.kids[0]);
        setStep(1);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === 3) void api.getFamilyInvite().then(setInvite).catch(() => {});
  }, [step]);

  const toggle = (set: Set<number>, i: number) => {
    const n = new Set(set);
    if (n.has(i)) n.delete(i);
    else n.add(i);
    return n;
  };

  const next = async () => {
    setError('');
    setBusy(true);
    try {
      if (step === 0) {
        const err = validateKid(kidDraft, false);
        if (err) {
          setError(err);
          haptic.warn();
          return;
        }
        const res = await api.createKid({
          displayName: kidDraft.displayName.trim(),
          username: kidDraft.username.trim(),
          pin: kidDraft.pin,
          avatar: kidDraft.avatar,
          ...(kidDraft.grade ? { grade: kidDraft.grade } : {}),
        });
        setKid(res.kid);
        haptic.success();
        setStep(1);
      } else if (step === 1) {
        if (kid) {
          for (const i of tasks) {
            const t = TASK_TEMPLATES[i];
            await api.createTask({
              title: t.title,
              description: t.description,
              category: t.category,
              points: t.points,
              recurrence: t.recurrence ?? 'daily',
              icon: TASK_CATEGORIES[t.category].icon,
              assignedTo: [kid._id],
            });
          }
        }
        setStep(2);
      } else if (step === 2) {
        for (const i of rewards) {
          const r = REWARD_TEMPLATES[i];
          await api.createReward({ title: r.title, description: r.description, cost: r.cost, category: r.category, icon: r.icon });
        }
        void refresh();
        setParty(true);
        setStep(3);
      } else {
        router.replace('/(parent)');
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const copy = STEP_COPY[step];
  const cta = step === 0 ? 'המשך' : step === 1 ? `הוספת ${tasks.size} משימות` : step === 2 ? `הוספת ${rewards.size} פרסים` : 'ללוח הבקרה';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: world.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingHorizontal: GUTTER, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Row justify="between">
          <Row gap={6}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.dot, i <= step ? { backgroundColor: world.accent, width: i === step ? 28 : 12 } : null]} />
            ))}
          </Row>
          {step > 0 && step < 3 ? (
            <Pressable onPress={() => setStep((s) => (s + 1) as Step)} hitSlop={10} accessibilityRole="button">
              <Txt v="strong" color={world.accentDark}>
                דלגו
              </Txt>
            </Pressable>
          ) : step === 0 ? (
            <Pressable onPress={() => router.replace('/(parent)')} hitSlop={10} accessibilityRole="button">
              <Txt v="strong" muted>
                אחר כך
              </Txt>
            </Pressable>
          ) : null}
        </Row>

        <Row gap={12} align="center">
          <Piko size={78} mood={copy.mood} />
          <View style={{ flex: 1 }}>
            <Txt v="h1">{copy.title}</Txt>
            <Txt v="body" muted>
              {copy.body}
            </Txt>
          </View>
        </Row>

        {step === 0 ? (
          <Sticker tone="calm" pad={16}>
            <KidForm draft={kidDraft} onChange={setKidDraft} />
          </Sticker>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: 10 }}>
            {TASK_TEMPLATES.map((t, i) => (
              <CheckRow key={t.title} on={tasks.has(i)} onPress={() => setTasks((s) => toggle(s, i))} label={`${TASK_CATEGORIES[t.category].icon} ${t.title}`} sub={t.description} coins={t.points} />
            ))}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: 10 }}>
            {REWARD_TEMPLATES.map((r, i) => (
              <CheckRow key={r.title} on={rewards.has(i)} onPress={() => setRewards((s) => toggle(s, i))} label={`${r.icon} ${r.title}`} sub={r.description} coins={r.cost} />
            ))}
          </View>
        ) : null}

        {step === 3 && kid ? (
          <Sticker tone="calm" pad={18} color={world.accentSoft}>
            <View style={{ gap: 12 }}>
              <Txt v="h2">ככה {kid.displayName} נכנס/ת:</Txt>
              <Row justify="between">
                <Txt v="body" muted>
                  קוד המשפחה
                </Txt>
                <Txt v="h1" num style={{ letterSpacing: 4 }}>
                  {invite?.inviteCode ?? '······'}
                </Txt>
              </Row>
              <Row justify="between">
                <Txt v="body" muted>
                  שם משתמש
                </Txt>
                <Txt v="h2">{kid.username}</Txt>
              </Row>
              <Row justify="between">
                <Txt v="body" muted>
                  קוד סודי
                </Txt>
                <Txt v="h2">מה שבחרתם</Txt>
              </Row>
              <ToyButton title="קוד QR לסריקה מהטלפון של הילד/ה" icon="qr" variant="secondary" full size="md" onPress={() => setQr(true)} />
            </View>
          </Sticker>
        ) : null}

        {error ? <Txt v="strong" color="#CC2C3D">{error}</Txt> : null}
        <ToyButton title={cta} full onPress={next} loading={busy} variant={step === 3 ? 'success' : 'primary'} icon={step === 3 ? 'home' : 'forward'}  />
      </ScrollView>
      <KidLoginQrModal kid={kid} visible={qr} onClose={() => setQr(false)} />
      <RewardBurst visible={party} title="המשפחה מוכנה!" body="המשימות והפרסים מחכים לילדים." onClose={() => setParty(false)} cta="יאללה" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  dot: { height: 12, width: 12, borderRadius: 6, backgroundColor: LINE },
  check: { borderRadius: 18, borderWidth: 2, borderColor: LINE, backgroundColor: WHITE, padding: 12 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
});
