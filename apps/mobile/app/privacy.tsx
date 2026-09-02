import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedScreen } from '../components/ThemedScreen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { RtlText } from '../components/RtlText';
import { spacing } from '../constants/theme';
import { useThemedStyles } from '../lib/theme-context';
import { t } from '../lib/i18n';
import { rtl } from '../lib/rtl';
import { PRIVACY_SECTIONS, PRIVACY_UPDATED } from '../lib/privacy-policy-content';

export default function PrivacyScreen() {
  const router = useRouter();
  const styles = useThemedStyles(({ colors }) =>
    StyleSheet.create({
      scroll: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
        maxWidth: 720,
        width: '100%',
        alignSelf: 'center',
      },
      title: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '800',
        marginBottom: spacing.xs,
      },
      updated: {
        color: colors.textMuted,
        fontSize: 13,
        marginBottom: spacing.lg,
      },
      card: { marginBottom: spacing.md },
      heading: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '800',
        marginBottom: spacing.sm,
      },
      body: {
        color: colors.textMuted,
        fontSize: 15,
        lineHeight: 24,
      },
      back: { marginTop: spacing.sm, marginBottom: spacing.lg },
    })
  );

  return (
    <ThemedScreen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.back}>
          <Button
            title={t('back')}
            variant="outline"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/');
            }}
          />
        </View>
        <RtlText style={styles.title}>{t('privacyPolicy')}</RtlText>
        <RtlText style={styles.updated}>
          {t('privacyUpdated')}: {PRIVACY_UPDATED}
        </RtlText>
        {PRIVACY_SECTIONS.map((section) => (
          <Card key={section.title} style={styles.card}>
            <RtlText style={styles.heading}>{section.title}</RtlText>
            <RtlText style={[styles.body, rtl.text]}>{section.body}</RtlText>
          </Card>
        ))}
      </ScrollView>
    </ThemedScreen>
  );
}
