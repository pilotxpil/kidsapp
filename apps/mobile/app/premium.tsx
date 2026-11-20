import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PremiumFeature } from '@kidsapp/shared';
import { FREE_LIMITS, PREMIUM_LIMITS } from '@kidsapp/shared';
import { useAuth } from '../lib/auth';
import { usePremium } from '../lib/premium';
import { useTheme } from '../lib/theme-context';
import { buyPlan, getPlanOptions, purchasesAvailable, restorePurchases, type PlanOption } from '../lib/purchases';
import { haptic } from '../lib/haptics';
import { GOLD, INK, MINT, WHITE } from '../constants/themes';
import { CrownToy, Icon, Piko, Row, Sticker, ToyButton, Txt, WorldSky, GUTTER, toast } from '../components/ui';
import { RewardBurst } from '../components/kid/RewardBurst';

const FEATURES: { key: PremiumFeature | 'ads'; title: string; body: string }[] = [
  { key: 'kids', title: `עד ${PREMIUM_LIMITS.maxKids} ילדים`, body: `בחינם אפשר ${FREE_LIMITS.maxKids}. כל האחים באותה משפחה.` },
  { key: 'tasks', title: 'משימות ופרסים בלי הגבלה', body: `בחינם: ${FREE_LIMITS.maxActiveTasksPerKid} משימות לילד ו-${FREE_LIMITS.maxActiveRewards} פרסים.` },
  { key: 'themes', title: 'עולמות פרימיום', body: 'חלל וממתקים, ועולמות חדשים שיגיעו.' },
  { key: 'customPacks', title: 'חבילות לימוד משלכם', body: 'כותבים או מייבאים שאלות לפי מה שלומדים בכיתה.' },
  { key: 'insights', title: 'תובנות למידה', body: 'רואים כל תשובה ואיפה הילדים מתקשים.' },
  { key: 'challenge', title: 'אתגר משפחתי בהתאמה', body: 'קובעים יעד ופרס שבועי לכל המשפחה.' },
  { key: 'ads', title: 'בלי פרסומות', body: 'גם לא במסכי ההורים.' },
];

const MANAGE_URL = 'https://play.google.com/store/account/subscriptions?package=com.kidsapp.quest';

export default function PremiumScreen() {
  const params = useLocalSearchParams<{ feature?: PremiumFeature }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { world } = useTheme();
  const { isPremium, plan, entitlements, sync, config } = usePremium();
  const [options, setOptions] = useState<PlanOption[] | null>(null);
  const [selected, setSelected] = useState<'monthly' | 'yearly'>('yearly');
  const [buying, setBuying] = useState(false);
  const [done, setDone] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  useEffect(() => {
    if (user?.role !== 'parent' || isPremium) return;
    getPlanOptions()
      .then((o) => {
        setOptions(o);
        if (o.length && !o.some((x) => x.id === 'yearly')) setSelected(o[0].id);
      })
      .catch(() => setOptions([]));
  }, [user?.role, isPremium]);

  const highlighted = params.feature;
  const features = highlighted
    ? [...FEATURES].sort((a, b) => (a.key === highlighted ? -1 : b.key === highlighted ? 1 : 0))
    : FEATURES;

  const purchase = async () => {
    const opt = options?.find((o) => o.id === selected);
    if (!opt) return;
    setBuying(true);
    try {
      const outcome = await buyPlan(opt);
      if (outcome === 'purchased') {
        const ent = await sync();
        haptic.success();
        if (ent?.isPremium) setDone(true);
        else toast('הרכישה התקבלה. הפרימיום ייפתח תוך דקה.', 'info');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'הרכישה נכשלה', 'error');
    } finally {
      setBuying(false);
    }
  };

  const restore = async () => {
    setBuying(true);
    try {
      await restorePurchases();
      const ent = await sync();
      toast(ent?.isPremium ? 'הפרימיום שוחזר!' : 'לא נמצאה רכישה פעילה בחשבון הזה', ent?.isPremium ? 'success' : 'info');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'השחזור נכשל', 'error');
    } finally {
      setBuying(false);
    }
  };

  const canBuy = purchasesAvailable() && config.billingEnabled !== false;

  return (
    <View style={{ flex: 1, backgroundColor: world.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <WorldSky>
          <Row justify="between" align="flex-start">
            <ToyButton icon="x" size="sm" variant="secondary" accessibilityLabel="סגירה" onPress={close} sound={false} />
            <Piko size={70} mood="cheer" />
          </Row>
          <View style={{ alignItems: 'center', gap: 6, marginTop: 4 }}>
            <CrownToy size={64} />
            <Txt v="display" color={WHITE} align="center">
              KidsQuest פרימיום
            </Txt>
            <Txt v="title" color={WHITE} align="center" style={{ opacity: 0.95 }}>
              מנוי אחד לכל המשפחה: שני ההורים וכל הילדים
            </Txt>
          </View>
        </WorldSky>

        <View style={{ paddingHorizontal: GUTTER, gap: 14, marginTop: 4, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
          {isPremium ? (
            <Sticker tone="calm" color="#E8FAF1" pad={18}>
              <View style={{ gap: 8, alignItems: 'center' }}>
                <Txt v="h2" align="center">
                  {plan === 'founder' ? 'אתם משפחה מייסדת 💛' : 'הפרימיום פעיל'}
                </Txt>
                <Txt v="body" muted align="center">
                  {plan === 'founder'
                    ? 'הצטרפתם לפני ההשקה, אז הכל פתוח לכם לתמיד. תודה!'
                    : entitlements?.premiumUntil
                      ? `${entitlements.willRenew === false ? 'פעיל עד' : 'מתחדש ב'}-${new Date(entitlements.premiumUntil).toLocaleDateString('he-IL')}`
                      : 'הכל פתוח לכל המשפחה.'}
                </Txt>
                {plan === 'premium' && Platform.OS === 'android' ? (
                  <ToyButton title="ניהול המנוי ב-Google Play" variant="secondary" size="md" onPress={() => Linking.openURL(MANAGE_URL)} />
                ) : null}
              </View>
            </Sticker>
          ) : null}

          <Sticker tone="calm" pad={16}>
            <View style={{ gap: 14 }}>
              {features.map((f) => (
                <Row key={f.key} gap={12} align="flex-start">
                  <View style={[styles.tick, f.key === highlighted && { backgroundColor: GOLD }]}>
                    <Icon name="check" size={16} color={f.key === highlighted ? INK : WHITE} stroke={3.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt v="title">{f.title}</Txt>
                    <Txt v="caption" muted>
                      {f.body}
                    </Txt>
                  </View>
                </Row>
              ))}
            </View>
          </Sticker>

          {user?.role === 'kid' ? (
            <Sticker tone="calm" color={world.accentSoft}>
              <Txt v="title" align="center">
                רק הורה יכול לשדרג. ספרו להם מה בא לכם!
              </Txt>
            </Sticker>
          ) : !isPremium ? (
            canBuy ? (
              options === null ? (
                <ActivityIndicator color={world.accent} style={{ marginVertical: 20 }} />
              ) : options.length === 0 ? (
                <Txt v="body" muted align="center">
                  לא הצלחנו לטעון את המחירים מהחנות. בדקו את החיבור ונסו שוב.
                </Txt>
              ) : (
                <>
                  {options.map((o) => {
                    const on = o.id === selected;
                    return (
                      <Pressable
                        key={o.id}
                        onPress={() => {
                          haptic.select();
                          setSelected(o.id);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        style={[styles.plan, on && { borderColor: INK, backgroundColor: '#FFF6D6', boxShadow: `0px 4px 0px ${INK}` }]}
                      >
                        <Row justify="between">
                          <Row gap={10}>
                            <View style={[styles.radio, on && { borderColor: INK }]}>{on ? <View style={styles.radioDot} /> : null}</View>
                            <View>
                              <Txt v="title">{o.title}</Txt>
                              {o.id === 'yearly' && o.perMonth ? (
                                <Txt v="caption" muted>
                                  {o.perMonth} לחודש
                                </Txt>
                              ) : null}
                            </View>
                          </Row>
                          <View style={{ alignItems: 'center', gap: 2 }}>
                            <Txt v="h2" num>
                              {o.price}
                            </Txt>
                            {o.id === 'yearly' ? (
                              <View style={styles.best}>
                                <Txt v="tiny" color={WHITE}>
                                  הכי משתלם
                                </Txt>
                              </View>
                            ) : null}
                          </View>
                        </Row>
                      </Pressable>
                    );
                  })}
                  <ToyButton title="הצטרפות לפרימיום" variant="gold" full loading={buying} onPress={purchase} lead={<CrownToy size={24} />} sound="coin" />
                  <Txt v="tiny" muted align="center">
                    המנוי מתחדש אוטומטית עד שמבטלים. אפשר לבטל בכל רגע ב-Google Play, והפרימיום נשאר עד סוף התקופה ששולמה.
                  </Txt>
                  <ToyButton title="שחזור רכישה" variant="ghost" size="md" full onPress={restore} sound={false} />
                </>
              )
            ) : (
              <Sticker tone="calm" color={world.accentSoft}>
                <Txt v="body" align="center">
                  {Platform.OS === 'web'
                    ? 'ההצטרפות לפרימיום נעשית באפליקציה לאנדרואיד. אחרי הרכישה, הפרימיום פעיל גם כאן.'
                    : 'הרכישה תיפתח בקרוב. בינתיים כל מה שבתוכנית החינמית ממשיך לעבוד.'}
                </Txt>
              </Sticker>
            )
          ) : null}

          <Row justify="center" gap={24}>
            <Pressable onPress={() => router.push('/terms')} hitSlop={8}>
              <Txt v="caption" color={world.accentDark}>
                תנאי שימוש
              </Txt>
            </Pressable>
            <Pressable onPress={() => router.push('/privacy')} hitSlop={8}>
              <Txt v="caption" color={world.accentDark}>
                פרטיות
              </Txt>
            </Pressable>
          </Row>
        </View>
      </ScrollView>
      <RewardBurst
        visible={done}
        title="ברוכים הבאים לפרימיום!"
        body="הכל פתוח עכשיו לכל המשפחה."
        onClose={() => {
          setDone(false);
          close();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tick: { width: 26, height: 26, borderRadius: 13, backgroundColor: MINT, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  plan: { borderRadius: 20, borderWidth: 2.5, borderColor: '#E4DEF5', backgroundColor: WHITE, padding: 16 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2.5, borderColor: '#C9C2E0', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: INK },
  best: { backgroundColor: '#FF4D5E', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 2, borderColor: INK },
});
