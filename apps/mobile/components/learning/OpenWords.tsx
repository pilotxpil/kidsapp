import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';
import { Input } from '../Input';

interface OpenWordsProps {
  prompt: string;
  count: number;
  values: string[];
  acceptedWords: string[] | null;
  disabled: boolean;
  onChange: (index: number, value: string) => void;
}

export function OpenWords({
  prompt,
  count,
  values,
  acceptedWords,
  disabled,
  onChange,
}: OpenWordsProps) {
  const { colors, borderRadius, id: themeId } = useTheme();
  const revealed = acceptedWords !== null;

  const styles = useMemo(
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
        revealLabel: {
          color: colors.textMuted,
          fontSize: 12,
          fontWeight: '800',
          marginTop: spacing.md,
          marginBottom: 4,
        },
        reveal: {
          color: colors.text,
          fontSize: 15,
          fontWeight: '700',
          lineHeight: 22,
        },
      }),
    [themeId, colors, borderRadius]
  );

  const slots = Array.from({ length: count }, (_, i) => values[i] ?? '');

  return (
    <View style={{ width: '100%' }}>
      <View style={styles.badge}>
        <Text style={[styles.badgeText, rtl.text]}>{t('openWordsHint')}</Text>
      </View>
      <Text style={[styles.prompt, rtl.text]}>{prompt}</Text>
      {slots.map((value, i) => (
        <Input
          key={i}
          compact
          label={t('openWordsWordN').replace('{n}', String(i + 1))}
          value={value}
          onChangeText={(v) => onChange(i, v)}
          editable={!disabled}
        />
      ))}
      {revealed && acceptedWords.length ? (
        <>
          <Text style={[styles.revealLabel, rtl.text]}>{t('openWordsReveal')}</Text>
          <Text style={[styles.reveal, rtl.text]}>{acceptedWords.join(' · ')}</Text>
        </>
      ) : null}
    </View>
  );
}
