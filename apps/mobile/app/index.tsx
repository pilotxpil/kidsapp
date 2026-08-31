import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { spacing } from '../constants/theme';
import { AuthBrand } from '../components/AuthBrand';
import { AuthScreenShell } from '../components/AuthScreenShell';
import { PortalButton } from '../components/PortalButton';
import { t } from '../lib/i18n';
import { FadeInUp } from '../components/animations/FadeInUp';

export default function WelcomeScreen() {
  const router = useRouter();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        buttons: { width: '100%', gap: spacing.lg, marginTop: spacing.sm },
      }),
    []
  );

  return (
    <AuthScreenShell
      themeId="roblox"
      emojis={['💎', '🪙', '⭐', '✨', '🎮', '🏆', '🔥', '🎯', '🎁', '👑']}
      emojiCount={22}
    >
      <AuthBrand variant="welcome" />

      <View style={styles.buttons}>
        <FadeInUp index={3}>
          <PortalButton
            variant="hero"
            emoji="💎"
            title={t('welcomeKidBtn')}
            onPress={() => router.push('/kid-login')}
          />
        </FadeInUp>

        <FadeInUp index={4}>
          <PortalButton
            variant="parent"
            emoji="🪙"
            title={t('welcomeParentBtn')}
            subtitle={t('welcomeParentSub')}
            onPress={() => router.push('/parent-login')}
          />
        </FadeInUp>
      </View>
    </AuthScreenShell>
  );
}
