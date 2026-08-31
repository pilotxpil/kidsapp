import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FloatingEmojis } from './animations/FloatingEmojis';
import { BouncyPressable } from './animations/BouncyPressable';
import { RtlText } from './RtlText';
import { getTheme } from '../constants/themes';
import { spacing } from '../constants/theme';
import { t } from '../lib/i18n';
import type { UiThemeId } from '@kidsapp/shared';

type AuthThemeId = Extract<UiThemeId, 'brawl' | 'roblox'>;

interface AuthScreenShellProps {
  themeId: AuthThemeId;
  emojis: string[];
  emojiCount?: number;
  onBack?: () => void;
  scroll?: boolean;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function AuthScreenShell({
  themeId,
  emojis,
  emojiCount = 18,
  onBack,
  scroll = false,
  children,
  contentStyle,
}: AuthScreenShellProps) {
  const theme = getTheme(themeId);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        vignette: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
        safe: { flex: 1 },
        flex: { flex: 1 },
        inner: {
          flexGrow: 1,
          padding: spacing.lg,
          justifyContent: 'center',
        },
        back: {
          position: 'absolute',
          top: spacing.lg,
          right: spacing.lg,
          zIndex: 3,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: theme.borderRadius.full,
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
        },
        backInline: {
          alignSelf: 'flex-end',
          marginBottom: spacing.md,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: theme.borderRadius.full,
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
        },
        backText: {
          color: theme.colors.primaryLight,
          fontSize: 14,
          fontWeight: '700',
        },
        body: {
          width: '100%',
          maxWidth: 420,
          alignSelf: 'center',
        },
      }),
    [theme]
  );

  const content = (
    <View style={[styles.body, contentStyle]}>
      {scroll && onBack ? (
        <BouncyPressable onPress={onBack} style={styles.backInline}>
          <RtlText style={styles.backText} wrap={false}>
            ← {t('back')}
          </RtlText>
        </BouncyPressable>
      ) : null}
      {children}
    </View>
  );

  return (
    <LinearGradient colors={[...theme.gradientBg]} style={styles.container}>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.62)']}
        style={styles.vignette}
        pointerEvents="none"
      />
      <FloatingEmojis emojis={emojis} count={emojiCount} opacity={0.24} />
      <SafeAreaView style={styles.safe}>
        {!scroll && onBack ? (
          <BouncyPressable onPress={onBack} style={styles.back}>
            <RtlText style={styles.backText} wrap={false}>
              ← {t('back')}
            </RtlText>
          </BouncyPressable>
        ) : null}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          {scroll ? (
            <ScrollView
              contentContainerStyle={styles.inner}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {content}
            </ScrollView>
          ) : (
            <View style={styles.inner}>{content}</View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
