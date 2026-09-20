import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
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

type AuthThemeId = Extract<UiThemeId, 'ember' | 'brawl' | 'roblox'>;

interface AuthScreenShellProps {
  themeId: AuthThemeId;
  emojis: string[];
  emojiCount?: number;
  onBack?: () => void;
  scroll?: boolean;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setOpen(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setOpen(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
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
  const keyboardOpen = useKeyboardOpen();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        vignette: { ...StyleSheet.absoluteFill, opacity: 0.5 },
        safe: { flex: 1 },
        flex: { flex: 1 },
        inner: {
          flexGrow: 1,
          paddingHorizontal: spacing.lg,
          paddingBottom: keyboardOpen ? spacing.sm : spacing.lg,
          paddingTop: keyboardOpen ? spacing.xs : spacing.lg,
          justifyContent: keyboardOpen ? 'flex-start' : 'center',
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
    [theme, keyboardOpen]
  );

  const content = (
    <View style={[styles.body, contentStyle]}>
      {scroll && onBack && !keyboardOpen ? (
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
      {theme.chrome !== 'vector' && (
        <FloatingEmojis emojis={emojis} count={emojiCount} opacity={0.24} />
      )}
      <SafeAreaView style={styles.safe} edges={keyboardOpen ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}>
        {!scroll && onBack && !keyboardOpen ? (
          <BouncyPressable onPress={onBack} style={styles.back}>
            <RtlText style={styles.backText} wrap={false}>
              ← {t('back')}
            </RtlText>
          </BouncyPressable>
        ) : null}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? spacing.sm : 0}
        >
          <ScrollView
            contentContainerStyle={styles.inner}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
          >
            {content}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
