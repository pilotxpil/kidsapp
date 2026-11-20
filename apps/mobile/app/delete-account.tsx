import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { DocPage } from '../components/DocPage';
import { Dialog, Field, Sticker, ToyButton, Txt } from '../components/ui';
import { CORAL_DARK, MINT_DARK } from '../constants/themes';

const SECTIONS = [
  {
    title: 'מה נמחק',
    body: 'כשההורה היחיד במשפחה מוחק את החשבון, נמחקים מיד: חשבון ההורה, כל פרופילי הילדים, משימות, פרסים, מטבעות, היסטוריה, התקדמות בלימוד וטוקני התראות. אם יש במשפחה הורה נוסף, נמחק רק החשבון שלכם והמשפחה ממשיכה אצלו.',
  },
  {
    title: 'מנוי פרימיום',
    body: 'מחיקת החשבון לא מבטלת מנוי בחנות. כדי להפסיק חיובים, בטלו את המנוי ב-Google Play > מנויים.',
  },
  {
    title: 'בלי גישה לחשבון?',
    body: 'כתבו ל-support@kids.synaboard.com מכתובת האימייל של החשבון ונמחק אותו תוך 7 ימים.',
  },
];

/** Public account-deletion page (linked from the Play Store listing). */
export default function DeleteAccountScreen() {
  const { user, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const signedInParent = user?.role === 'parent';

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      if (!signedInParent) {
        const res = await api.parentLogin(email.trim(), password);
        await api.saveToken(res.token);
      }
      await api.deleteAccount(password);
      setConfirm(false);
      setDone(true);
      if (signedInParent) await logout();
      else await api.clearToken();
    } catch (e) {
      setConfirm(false);
      if (!signedInParent) await api.clearToken();
      setError(e instanceof Error ? e.message : 'המחיקה נכשלה');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DocPage title="מחיקת חשבון" updated="20 בנובמבר 2026" sections={SECTIONS}>
      <Sticker tone="calm" pad={16}>
        {done ? (
          <Txt v="title" color={MINT_DARK}>
            החשבון נמחק. תודה שהייתם איתנו.
          </Txt>
        ) : (
          <View style={{ gap: 12 }}>
            <Txt v="title">{signedInParent ? `מחובר/ת כ-${user?.email}` : 'כניסה לאישור המחיקה'}</Txt>
            {!signedInParent ? <Field label="אימייל" kind="email" value={email} onChangeText={setEmail} /> : null}
            <Field label="סיסמה" kind="password" value={password} onChangeText={setPassword} />
            {error ? <Txt v="strong" color={CORAL_DARK}>{error}</Txt> : null}
            <ToyButton title="מחיקת החשבון" variant="danger" full onPress={() => setConfirm(true)} disabled={!password || (!signedInParent && !email)} />
            {user?.role === 'kid' ? (
              <Txt v="caption" muted>
                רק הורה יכול למחוק חשבון. פרופיל ילד נמחק מתוך מסך "משפחה" של ההורה.
              </Txt>
            ) : null}
          </View>
        )}
      </Sticker>
      <Dialog
        visible={confirm}
        title="בטוחים?"
        message="אי אפשר לשחזר את המידע אחרי המחיקה."
        confirmLabel="כן, למחוק לתמיד"
        destructive
        loading={busy}
        onConfirm={run}
        onCancel={() => setConfirm(false)}
      />
    </DocPage>
  );
}
