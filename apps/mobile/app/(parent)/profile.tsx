import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MIN_PASSWORD_LENGTH } from '@kidsapp/shared';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { usePremium, useErrorHandler } from '../../lib/premium';
import { useTheme } from '../../lib/theme-context';
import { haptic } from '../../lib/haptics';
import { CORAL_DARK, INK, INK_SOFT } from '../../constants/themes';
import {
  AvatarSticker,
  CalmScreen,
  CrownToy,
  Dialog,
  Divider,
  Field,
  Icon,
  Row,
  SectionTitle,
  Sheet,
  Sticker,
  ToyButton,
  Txt,
  toast,
  type IconName,
} from '../../components/ui';
import { WorldPicker } from '../../components/WorldPicker';
import { SoundSettings } from '../../components/SoundSettings';
import { AvatarPickerModal } from '../../components/AvatarPicker';
import { AppVersionLabel } from '../../components/AppVersionLabel';

function LinkRow({ icon, label, onPress, color }: { icon: IconName; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ paddingVertical: 12 }}>
      <Row justify="between">
        <Row gap={10}>
          <Icon name={icon} size={22} color={color ?? INK_SOFT} />
          <Txt v="title" color={color}>
            {label}
          </Txt>
        </Row>
        <Icon name="forward" size={20} color={INK_SOFT} />
      </Row>
    </Pressable>
  );
}

export default function ParentSettings() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const { world } = useTheme();
  const { isPremium, plan, entitlements, openPaywall, config } = usePremium();
  const onError = useErrorHandler();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState(user?.displayName ?? '');
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [busy, setBusy] = useState(false);

  const saveName = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.updateMe({ displayName: name.trim() });
      await refreshUser();
      setNameOpen(false);
      toast('נשמר');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const changePw = async () => {
    if (pw.next.length < MIN_PASSWORD_LENGTH) {
      toast(`הסיסמה צריכה לפחות ${MIN_PASSWORD_LENGTH} תווים`, 'error');
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(pw.current, pw.next);
      setPwOpen(false);
      setPw({ current: '', next: '' });
      haptic.success();
      toast('הסיסמה עודכנה');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      const res = await api.deleteAccount(delPw);
      setDelOpen(false);
      toast(res.deleted === 'family' ? 'החשבון והמשפחה נמחקו' : 'יצאתם מהמשפחה והחשבון נמחק', 'info');
      await logout();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <CalmScreen
      title="הגדרות"
      back
      onBack={() => router.replace('/(parent)')}
      overlay={
        <>
          <AvatarPickerModal visible={avatarOpen} onClose={() => setAvatarOpen(false)} mode="parent" />
          <Sheet visible={nameOpen} onClose={() => setNameOpen(false)} title="השם שלך" footer={<ToyButton title="שמירה" full loading={busy} onPress={saveName} />}>
            <Field kind="name" value={name} onChangeText={setName} maxLength={40} />
          </Sheet>
          <Sheet visible={pwOpen} onClose={() => setPwOpen(false)} title="שינוי סיסמה" footer={<ToyButton title="עדכון הסיסמה" full loading={busy} onPress={changePw} />}>
            <Field label="הסיסמה הנוכחית" kind="password" value={pw.current} onChangeText={(v) => setPw((p) => ({ ...p, current: v }))} />
            <Field label="סיסמה חדשה" kind="newPassword" value={pw.next} onChangeText={(v) => setPw((p) => ({ ...p, next: v }))} hint="לפחות 6 תווים" />
          </Sheet>
          <Dialog
            visible={delOpen}
            title="למחוק את החשבון?"
            message="אם אתם ההורה היחיד, כל המשפחה תימחק: הילדים, המשימות, המטבעות וההיסטוריה. אי אפשר לשחזר."
            confirmLabel="מחיקה לתמיד"
            destructive
            loading={busy}
            onConfirm={deleteAccount}
            onCancel={() => setDelOpen(false)}
          >
            <Field label="הקלידו סיסמה לאישור" kind="password" value={delPw} onChangeText={setDelPw} />
          </Dialog>
        </>
      }
      tabs
    >
      <Sticker tone="calm" pad={16}>
        <Row gap={14}>
          <Pressable onPress={() => setAvatarOpen(true)} accessibilityLabel="החלפת תמונה">
            <AvatarSticker avatar={user?.avatar ?? '👨‍👩‍👧‍👦'} size={64} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Txt v="h2">{user?.displayName}</Txt>
            <Txt v="caption" muted>
              {user?.email}
            </Txt>
          </View>
          <ToyButton icon="edit" size="sm" variant="secondary" accessibilityLabel="עריכת שם" onPress={() => {
            setName(user?.displayName ?? '');
            setNameOpen(true);
          }} />
        </Row>
      </Sticker>

      <Sticker tone="calm" pad={16} color={isPremium ? '#E8FAF1' : '#FFF6D6'} onPress={() => openPaywall()} accessibilityLabel="פרימיום">
        <Row gap={12}>
          <CrownToy size={44} />
          <View style={{ flex: 1 }}>
            <Txt v="title">{isPremium ? (plan === 'founder' ? 'משפחה מייסדת' : 'פרימיום פעיל') : 'התוכנית החינמית'}</Txt>
            <Txt v="caption" muted>
              {isPremium
                ? plan === 'founder'
                  ? 'הכל פתוח לכם לתמיד'
                  : entitlements?.premiumUntil
                    ? `עד ${new Date(entitlements.premiumUntil).toLocaleDateString('he-IL')}`
                    : 'הכל פתוח לכל המשפחה'
                : `${entitlements?.usage.kids ?? 0} מתוך ${entitlements?.limits.maxKids ?? 2} ילדים. שדרוג פותח הכל.`}
            </Txt>
          </View>
          <Icon name="forward" size={22} color={INK} />
        </Row>
      </Sticker>

      <SectionTitle title="עיצוב" />
      <Sticker tone="calm" pad={12}>
        <WorldPicker />
      </Sticker>

      <SectionTitle title="צלילים ורטט" />
      <Sticker tone="calm" pad={14}>
        <SoundSettings music={false} />
      </Sticker>

      <SectionTitle title="חשבון" />
      <Sticker tone="calm" pad={14}>
        <LinkRow icon="key" label="שינוי סיסמה" onPress={() => setPwOpen(true)} />
        <Divider />
        <LinkRow icon="users" label="המשפחה וקוד ההזמנה" onPress={() => router.push('/(parent)/kids')} />
        <Divider />
        <LinkRow icon="help" label="עזרה ויצירת קשר" onPress={() => Linking.openURL(`mailto:${config.supportEmail}?subject=KidsQuest`)} />
        <Divider />
        <LinkRow icon="shield" label="מדיניות פרטיות" onPress={() => router.push('/privacy')} />
        <Divider />
        <LinkRow icon="doc" label="תנאי שימוש" onPress={() => router.push('/terms')} />
      </Sticker>

      <ToyButton title="יציאה מהחשבון" icon="logout" variant="secondary" full onPress={() => void logout()} />
      <Pressable onPress={() => {
        setDelPw('');
        setDelOpen(true);
      }} accessibilityRole="button" style={{ paddingVertical: 8 }}>
        <Txt v="strong" align="center" color={CORAL_DARK}>
          מחיקת החשבון
        </Txt>
      </Pressable>
      <AppVersionLabel />
      <View style={{ height: 4, backgroundColor: world.paper }} />
    </CalmScreen>
  );
}
