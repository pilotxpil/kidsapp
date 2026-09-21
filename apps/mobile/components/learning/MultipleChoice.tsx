import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ActivityOption } from '@kidsapp/shared';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { playSfx } from '../../lib/sfx';

interface MultipleChoiceProps {
  prompt: string;
  options: ActivityOption[];
  selectedId: string | null;
  correctId: string | null;
  disabled: boolean;
  onSelect: (optionId: string) => void;
}

export function MultipleChoice({
  prompt,
  options,
  selectedId,
  correctId,
  disabled,
  onSelect,
}: MultipleChoiceProps) {
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();

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
        option: {
          backgroundColor: colors.bgCard,
          borderRadius: borderRadius.sm,
          paddingVertical: 8,
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
        optionText: {
          color: colors.text,
          fontSize: 14,
          fontWeight: '600',
          textAlign: 'center',
          width: '100%',
        },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  return (
    <View style={{ width: '100%' }}>
      <Text style={[styles.prompt, rtl.text]}>{prompt}</Text>
      {options.map((option) => {
        const isSelected = selectedId === option.id;
        const isCorrect = correctId === option.id;
        const isWrong = correctId !== null && isSelected && !isCorrect;

        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              isSelected && !correctId && styles.optionSelected,
              isCorrect && correctId !== null && styles.optionCorrect,
              isWrong && styles.optionWrong,
            ]}
            onPress={() => {
              playSfx('tap');
              onSelect(option.id);
            }}
            disabled={disabled}
            activeOpacity={0.8}
          >
            <Text style={[styles.optionText, rtl.text]}>{option.text}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
