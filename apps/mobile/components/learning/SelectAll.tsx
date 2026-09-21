import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ActivityOption } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';
import { playSfx } from '../../lib/sfx';

interface SelectAllProps {
  prompt: string;
  options: ActivityOption[];
  selectedIds: string[];
  correctIds: string[] | null;
  disabled: boolean;
  onToggle: (optionId: string) => void;
}

export function SelectAll({
  prompt,
  options,
  selectedIds,
  correctIds,
  disabled,
  onToggle,
}: SelectAllProps) {
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();
  const revealed = correctIds !== null;

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        prompt: {
          color: colors.text,
          fontSize: 16,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: spacing.sm,
          width: '100%',
        },
        badge: {
          alignSelf: 'center',
          backgroundColor: colors.primary + '22',
          borderRadius: borderRadius.full,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
          marginBottom: 6,
        },
        badgeText: {
          color: colors.primary,
          fontSize: 11,
          fontWeight: '800',
        },
        option: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.sm,
          paddingVertical: 7,
          paddingHorizontal: 10,
          marginBottom: 6,
          ...cardBorder(1),
        },
        optionSelected: {
          borderColor: colors.primary,
          backgroundColor: colors.bgCardLight,
        },
        optionCorrect: {
          borderColor: colors.success,
          backgroundColor: colors.success + '33',
        },
        optionWrong: {
          borderColor: colors.danger,
          backgroundColor: colors.danger + '33',
        },
        optionMissed: {
          borderColor: colors.success,
          backgroundColor: colors.success + '18',
        },
        optionText: {
          color: colors.text,
          fontSize: 14,
          fontWeight: '600',
          flex: 1,
        },
        box: {
          width: 18,
          height: 18,
          borderRadius: 5,
          borderWidth: 2,
          borderColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginStart: spacing.sm,
        },
        boxOn: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        boxMark: {
          color: colors.textDark ?? '#fff',
          fontSize: 12,
          fontWeight: '900',
        },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  return (
    <View style={{ width: '100%' }}>
      <View style={styles.badge}>
        <Text style={[styles.badgeText, rtl.text]}>{t('selectAllHint')}</Text>
      </View>
      <Text style={[styles.prompt, rtl.text]}>{prompt}</Text>
      {options.map((option) => {
        const isSelected = selectedIds.includes(option.id);
        const isCorrect = revealed && correctIds.includes(option.id);
        const isWrong = revealed && isSelected && !isCorrect;
        const isMissed = revealed && isCorrect && !isSelected;

        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              isSelected && !revealed && styles.optionSelected,
              isCorrect && styles.optionCorrect,
              isWrong && styles.optionWrong,
              isMissed && styles.optionMissed,
            ]}
            onPress={() => {
              playSfx('tap');
              onToggle(option.id);
            }}
            disabled={disabled}
            activeOpacity={0.8}
          >
            <View style={[rtl.row, { alignItems: 'center', width: '100%' }]}>
              <View style={[styles.box, isSelected && styles.boxOn]}>
                {isSelected ? <Text style={styles.boxMark}>✓</Text> : null}
              </View>
              <Text style={[styles.optionText, rtl.text]}>{option.text}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
