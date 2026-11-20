import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';
import { WHITE } from '../constants/themes';
import { Piko, Row, ToyButton, Txt, WorldSky, GUTTER, type PikoMood } from './ui';

/** Shared frame for sign-in / sign-up screens: compact sky with Piko, then the form. */
export function AuthLayout({
  title,
  sub,
  mood = 'happy',
  children,
  onBack,
}: {
  title: string;
  sub?: string;
  mood?: PikoMood;
  children: React.ReactNode;
  onBack?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { world } = useTheme();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: world.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <WorldSky compact>
          <Row justify="between" align="flex-start">
            <ToyButton
              icon="back"
              size="sm"
              variant="secondary"
              accessibilityLabel="חזרה"
              sound={false}
              onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
            />
            <Piko size={64} mood={mood} />
          </Row>
          <View style={{ marginTop: 8 }}>
            <Txt v="display" color={WHITE}>
              {title}
            </Txt>
            {sub ? (
              <Txt v="title" color={WHITE} style={{ opacity: 0.92 }}>
                {sub}
              </Txt>
            ) : null}
          </View>
        </WorldSky>
        <View style={{ paddingHorizontal: GUTTER, gap: 16, marginTop: 4, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
