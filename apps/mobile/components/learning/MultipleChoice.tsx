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
          fontSize: 20,
          lineHeight: 28,
          fontFamily: 'Fredoka_700Bold',
          textAlign: 'center',
          marginBottom: spacing.md,
          width: '100%',
        },
        option: {
          backgroundColor: colors.bgCard,
          borderRadius: 18,
          paddingVertical: 14,
          paddingHorizontal: 14,
          marginBottom: 10,
          borderWidth: 2.5,
          borderColor: '#241547',
          boxShadow: '0px 4px 0px #241547',
        },
        optionSelected: {
          borderColor: colors.primary,
          backgroundColor: colors.bgCardLight,
        },
        optionCorrect: {
          backgroundColor: '#C8F5DF',
        },
        optionWrong: {
          backgroundColor: '#FFD3D8',
        },
        optionText: {
          color: colors.text,
          fontSize: 18,
          fontFamily: 'Fredoka_600SemiBold',
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
