import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { FamilyTaskTemplate, TaskCategory, TaskRecurrence, TaskTemplate, User } from '@kidsapp/shared';
import { TASK_CATEGORIES, TASK_TEMPLATES } from '@kidsapp/shared';
import { useTheme } from '../../lib/theme-context';
import { INK, LINE, WHITE } from '../../constants/themes';
import { ROW } from '../../lib/dir';
import { haptic } from '../../lib/haptics';
import {
  AvatarSticker,
  ChoiceChip,
  Coin,
  Field,
  Icon,
  Row,
  Segmented,
  Sheet,
  Toggle,
  ToyButton,
  Txt,
} from '../ui';

export type TaskDraft = {
  title: string;
  description: string;
  icon: string;
  points: number;
  recurrence: TaskRecurrence;
  category: TaskCategory;
  assignedTo: string[];
  learningPackId?: string;
  saveAsTemplate: boolean;
};

const ICONS = ['🛏️', '🧹', '🧺', '🍽️', '🪥', '📚', '✏️', '📖', '🎹', '⚽', '🏃', '🚴', '🐶', '🌱', '🗑️', '🧸', '👕', '🛁', '🤝', '❤️', '🎨', '🧩', '🥦', '💧'];
const POINTS = [5, 10, 15, 20, 30, 50];
const RECURRENCE: { value: TaskRecurrence; label: string }[] = [
  { value: 'daily', label: 'כל יום' },
  { value: 'weekly', label: 'כל שבוע' },
  { value: 'once', label: 'פעם אחת' },
];

export function emptyDraft(kids: User[]): TaskDraft {
  return {
    title: '',
    description: '',
    icon: '⭐',
    points: 20,
    recurrence: 'daily',
    category: 'home',
    assignedTo: kids.length === 1 ? [kids[0]._id] : kids.map((k) => k._id),
    saveAsTemplate: true,
  };
}

export function TaskEditor({
  visible,
  editing,
  initial,
  kids,
  familyTemplates,
  learningPacks,
  saving,
  onSave,
  onDelete,
  onDeleteTemplate,
  onClose,
}: {
  visible: boolean;
  editing: boolean;
  initial: TaskDraft;
  kids: User[];
  familyTemplates: FamilyTaskTemplate[];
  learningPacks: { id: string; title: string }[];
  saving: boolean;
  onSave: (d: TaskDraft) => void;
  onDelete?: () => void;
  onDeleteTemplate?: (id: string) => void;
  onClose: () => void;
}) {
  const { world } = useTheme();
  const [d, setD] = useState<TaskDraft>(initial);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setD(initial);
      setMore(Boolean(initial.description || initial.learningPackId));
      setError('');
    }
  }, [visible, initial]);

  const set = <K extends keyof TaskDraft>(k: K, v: TaskDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  const applyTemplate = (tpl: TaskTemplate | FamilyTaskTemplate) => {
    haptic.select();
    setD((p) => ({
      ...p,
      title: tpl.title,
      description: tpl.description ?? '',
      points: tpl.points,
      category: tpl.category,
      recurrence: tpl.recurrence ?? 'daily',
      icon: TASK_CATEGORIES[tpl.category]?.icon ?? p.icon,
    }));
  };

  const save = () => {
    if (!d.title.trim()) return setError('נא לתת שם למשימה');
    if (!d.assignedTo.length) return setError('נא לבחור לפחות ילד/ה אחד/ת');
    onSave({ ...d, title: d.title.trim() });
  };

  const templates = [
    ...familyTemplates.map((t) => ({ ...t, _family: true as const })),
    ...TASK_TEMPLATES.filter((t) => !familyTemplates.some((f) => f.title === t.title)).map((t) => ({ ...t, _id: '', _family: false as const })),
  ];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'עריכת משימה' : 'משימה חדשה'}
      footer={
        <>
          {error ? <Txt v="strong" color="#CC2C3D">{error}</Txt> : null}
          <ToyButton title={editing ? 'שמירה' : 'הוספת המשימה'} full onPress={save} loading={saving} icon={editing ? 'check' : 'plus'} />
          {editing && onDelete ? <ToyButton title="מחיקת המשימה" variant="ghost" full size="md" onPress={onDelete} sound={false} /> : null}
        </>
      }
    >
      {!editing ? (
        <View style={{ gap: 8 }}>
          <Txt v="caption">משימות מוכנות</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: ROW }}>
            {templates.map((tpl, i) => (
              <Pressable
                key={`${tpl.title}-${i}`}
                onPress={() => applyTemplate(tpl)}
                onLongPress={tpl._family && onDeleteTemplate ? () => onDeleteTemplate(tpl._id) : undefined}
                style={[styles.tpl, d.title === tpl.title && { borderColor: INK, backgroundColor: world.accentSoft }]}
              >
                <Txt v="caption" numberOfLines={1}>
                  {TASK_CATEGORIES[tpl.category]?.icon} {tpl.title}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Field label="מה צריך לעשות?" value={d.title} onChangeText={(v) => set('title', v)} placeholder="למשל: לסדר את החדר" maxLength={80} />

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
              style={[styles.iconCell, d.icon === ic && { backgroundColor: world.accentSoft, borderColor: INK }]}
              accessibilityLabel={ic}
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
          <Txt v="caption">כמה מטבעות?</Txt>
        </Row>
        <Row gap={8} wrap>
          {POINTS.map((p) => (
            <ChoiceChip key={p} label={String(p)} selected={d.points === p} onPress={() => set('points', p)} />
          ))}
        </Row>
      </View>

      <View style={{ gap: 8 }}>
        <Txt v="caption">כל כמה זמן?</Txt>
        <Segmented options={RECURRENCE} value={d.recurrence} onChange={(v) => set('recurrence', v)} />
      </View>

      {kids.length > 1 ? (
        <View style={{ gap: 8 }}>
          <Txt v="caption">למי?</Txt>
          <Row gap={10} wrap>
            {kids.map((k) => {
              const on = d.assignedTo.includes(k._id);
              return (
                <Pressable
                  key={k._id}
                  onPress={() => {
                    haptic.select();
                    set('assignedTo', on ? d.assignedTo.filter((id) => id !== k._id) : [...d.assignedTo, k._id]);
                  }}
                  style={[styles.kid, on ? { borderColor: INK, backgroundColor: world.accentSoft } : null]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <AvatarSticker avatar={k.avatar} size={36} ring={false} bg={WHITE} />
                  <Txt v="strong">{k.displayName}</Txt>
                  {on ? <Icon name="check" size={18} color={world.accentDark} stroke={3} /> : null}
                </Pressable>
              );
            })}
          </Row>
        </View>
      ) : null}

      <Pressable onPress={() => setMore((m) => !m)} accessibilityRole="button">
        <Row gap={6}>
          <Icon name={more ? 'down' : 'forward'} size={18} color={world.accentDark} />
          <Txt v="strong" color={world.accentDark}>
            אפשרויות נוספות
          </Txt>
        </Row>
      </Pressable>

      {more ? (
        <>
          <Field label="פירוט (לא חובה)" value={d.description} onChangeText={(v) => set('description', v)} multiline maxLength={300} />
          <View style={{ gap: 8 }}>
            <Txt v="caption">קטגוריה</Txt>
            <Row gap={8} wrap>
              {(Object.keys(TASK_CATEGORIES) as TaskCategory[]).map((k) => (
                <ChoiceChip key={k} label={`${TASK_CATEGORIES[k].icon} ${TASK_CATEGORIES[k].label}`} selected={d.category === k} onPress={() => set('category', k)} />
              ))}
            </Row>
          </View>
          {learningPacks.length ? (
            <View style={{ gap: 8 }}>
              <Txt v="caption">שיעורי בית: אישור אוטומטי כשמסיימים חבילת לימוד</Txt>
              <Row gap={8} wrap>
                <ChoiceChip label="בלי" selected={!d.learningPackId} onPress={() => set('learningPackId', undefined)} />
                {learningPacks.map((p) => (
                  <ChoiceChip key={p.id} label={p.title} selected={d.learningPackId === p.id} onPress={() => set('learningPackId', p.id)} />
                ))}
              </Row>
            </View>
          ) : null}
          {!editing ? (
            <Row justify="between">
              <Txt v="strong">לשמור כמשימה מוכנה</Txt>
              <Toggle value={d.saveAsTemplate} onChange={(v) => set('saveAsTemplate', v)} label="לשמור כמשימה מוכנה" />
            </Row>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  tpl: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: LINE,
    backgroundColor: WHITE,
    maxWidth: 200,
  },
  icons: { flexWrap: 'wrap', gap: 6 },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },
  kid: {
    flexDirection: ROW,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: LINE,
    backgroundColor: WHITE,
  },
});
