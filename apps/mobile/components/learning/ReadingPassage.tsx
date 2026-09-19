import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../lib/theme-context';
import { rtl } from '../../lib/rtl';
import { t } from '../../lib/i18n';

interface ReadingPassageProps {
  title?: string;
  text: string;
  compact?: boolean;
}

export function ReadingPassage({ title, text, compact }: ReadingPassageProps) {
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width: '100%',
          backgroundColor: colors.bgDeep,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          ...cardBorder(1),
        },
        compactWrap: {
          padding: spacing.md,
        },
        eyebrow: {
          color: colors.primary,
          fontSize: 12,
          fontWeight: '700',
          marginBottom: spacing.xs,
          textAlign: 'center',
        },
        title: {
          color: colors.text,
          fontSize: 18,
          fontWeight: '800',
          marginBottom: spacing.md,
          textAlign: 'center',
        },
        body: {
          color: colors.text,
          fontSize: compact ? 15 : 17,
          lineHeight: compact ? 24 : 28,
          fontWeight: '500',
        },
      }),
    [themeId, colors, borderRadius, cardBorder, compact]
  );

  return (
    <View style={[styles.wrap, compact && styles.compactWrap]}>
      <Text style={[styles.eyebrow, rtl.text]}>{t('readingPassageLabel')}</Text>
      {title ? <Text style={[styles.title, rtl.text]}>{title}</Text> : null}
      <Text style={[styles.body, rtl.text]}>{text}</Text>
    </View>
  );
}
