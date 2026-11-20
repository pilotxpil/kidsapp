import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { User } from '@kidsapp/shared';
import { FREE_AVATAR_IDS, GRADE_OPTIONS, formatGradeLabel } from '@kidsapp/shared';
import { useTheme } from '../../lib/theme-context';
import { haptic } from '../../lib/haptics';
import { INK } from '../../constants/themes';
import { ROW } from '../../lib/dir';
import { AvatarSticker, ChoiceChip, Field, Row, Txt } from '../ui';

export type KidDraft = { displayName: string; username: string; pin: string; avatar: string; grade: number | null };

export function kidDraftFrom(kid?: User | null): KidDraft {
  return {
    displayName: kid?.displayName ?? '',
    username: kid?.username ?? '',
    pin: '',
    avatar: kid?.avatar ?? FREE_AVATAR_IDS[0],
    grade: kid?.grade ?? null,
  };
}

export function validateKid(d: KidDraft, editing: boolean): string | null {
  if (!d.displayName.trim()) return 'נא לכתוב שם';
  if (!d.username.trim()) return 'נא לבחור שם משתמש';
  if (/\s/.test(d.username.trim())) return 'שם המשתמש בלי רווחים';
  if (!editing && !/^\d{4}$/.test(d.pin)) return 'הקוד הסודי צריך 4 ספרות';
  if (editing && d.pin && !/^\d{4}$/.test(d.pin)) return 'הקוד הסודי צריך 4 ספרות';
  return null;
}

/** Form fields for creating / editing a kid. */
export function KidForm({ draft, onChange, editing }: { draft: KidDraft; onChange: (d: KidDraft) => void; editing?: boolean }) {
  const { world } = useTheme();
  const [userTouched, setUserTouched] = useState(editing ?? false);
  const set = <K extends keyof KidDraft>(k: K, v: KidDraft[K]) => onChange({ ...draft, [k]: v });

  useEffect(() => {
    // Suggest a username from a Latin name until the parent edits it themselves.
    if (userTouched) return;
    const latin = draft.displayName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (latin && latin !== draft.username) onChange({ ...draft, username: latin });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.displayName]);

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 8 }}>
        <Txt v="caption">דמות</Txt>
        <View style={[styles.avatars, { flexDirection: ROW }]}>
          {FREE_AVATAR_IDS.map((id) => {
            const on = draft.avatar === id;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  haptic.select();
                  set('avatar', id);
                }}
                style={[styles.avatarCell, on && { borderColor: INK, backgroundColor: world.accentSoft }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <AvatarSticker avatar={id} size={52} ring={false} bg="transparent" />
              </Pressable>
            );
          })}
        </View>
      </View>
      <Field label="שם" kind="name" value={draft.displayName} onChangeText={(v) => set('displayName', v)} placeholder="למשל: נועם" maxLength={30} />
      <Field
        label="שם משתמש לכניסה"
        kind="username"
        value={draft.username}
        onChangeText={(v) => {
          setUserTouched(true);
          set('username', v.replace(/\s/g, ''));
        }}
        hint="קצר וקל להקליד, למשל: noam"
        maxLength={24}
      />
      <Field
        label={editing ? 'קוד סודי חדש (לא חובה)' : 'קוד סודי (4 ספרות)'}
        kind="number"
        value={draft.pin}
        onChangeText={(v) => set('pin', v.replace(/\D/g, '').slice(0, 4))}
        maxLength={4}
        placeholder="1234"
        hint={editing ? 'השאירו ריק כדי לא לשנות' : 'הילד/ה יקליד/ו אותו בכל כניסה'}
      />
      <View style={{ gap: 8 }}>
        <Txt v="caption">כיתה (לחבילות לימוד מתאימות)</Txt>
        <Row gap={8} wrap>
          <ChoiceChip label="בלי" selected={draft.grade == null} onPress={() => set('grade', null)} />
          {GRADE_OPTIONS.map((g) => (
            <ChoiceChip key={g} label={formatGradeLabel(g)} selected={draft.grade === g} onPress={() => set('grade', g)} />
          ))}
        </Row>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatars: { flexWrap: 'wrap', gap: 8 },
  avatarCell: { borderRadius: 18, borderWidth: 2.5, borderColor: 'transparent', padding: 3, overflow: 'hidden' },
});
