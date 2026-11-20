import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Task } from '@kidsapp/shared';
import { TASK_RECURRENCE, displayTaskIcon } from '@kidsapp/shared';
import { useTheme } from '../../lib/theme-context';
import { c } from '../../lib/i18n';
import { INK, INK_SOFT, MINT_DARK, WHITE } from '../../constants/themes';
import { CheckBadge, Coin, HourglassToy, Pill, Row, Sticker, ToyButton, Txt } from '../ui';

/** One quest (task) as a sticker. Available → big "סיימתי!" button; pending/completed → status. */
export function QuestCard({
  task,
  onComplete,
  busy,
  compact,
}: {
  task: Task;
  onComplete?: (task: Task) => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const { world } = useTheme();
  const status = task.completionStatus ?? 'available';
  const done = status === 'completed';
  const pending = status === 'pending';
  const icon = displayTaskIcon(task.icon, task.category);

  return (
    <Sticker pad={compact ? 12 : 14} color={done ? '#F7F5FC' : WHITE}>
      <Row gap={12} align="center">
        <View style={[styles.tile, { backgroundColor: done ? '#ECE8F6' : world.accentSoft }]}>
          <Txt size={compact ? 26 : 30} align="center" style={{ lineHeight: compact ? 34 : 38 }}>
            {icon}
          </Txt>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt v="title" numberOfLines={2} color={done ? INK_SOFT : INK} style={done ? styles.strike : undefined}>
            {task.title}
          </Txt>
          <Row gap={6} wrap>
            <Row gap={3}>
              <Coin size={16} />
              <Txt v="caption" num color={INK}>
                +{task.points}
              </Txt>
            </Row>
            {!compact ? <Pill label={TASK_RECURRENCE[task.recurrence]?.label ?? ''} /> : null}
          </Row>
          {!compact && task.description ? (
            <Txt v="caption" muted numberOfLines={2}>
              {task.description}
            </Txt>
          ) : null}
        </View>
        {done ? (
          <CheckBadge size={36} />
        ) : pending ? (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <HourglassToy size={30} />
            <Txt v="tiny" color={MINT_DARK} align="center">
              {c.kid.waiting}
            </Txt>
          </View>
        ) : onComplete ? (
          <ToyButton
            title={c.kid.done}
            variant="success"
            size={compact ? 'sm' : 'md'}
            onPress={() => onComplete(task)}
            loading={busy}
            sound="complete"
          />
        ) : null}
      </Row>
    </Sticker>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strike: { textDecorationLine: 'line-through' },
});
