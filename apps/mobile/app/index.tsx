import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTheme } from '../constants/themes';
import { spacing } from '../constants/theme';
import { FloatingEmojis } from '../components/animations/FloatingEmojis';
import { AuthBrand } from '../components/AuthBrand';
import { t } from '../lib/i18n';
import { FadeInUp } from '../components/animations/FadeInUp';
import { BouncyPressable } from '../components/animations/BouncyPressable';

const brawl = getTheme('brawl');
const roblox = getTheme('roblox');

export default function WelcomeScreen() {
  const router = useRouter();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        safe: { flex: 1 },
        content: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
          width: '100%',
        },
        buttons: { width: '100%', maxWidth: 400, gap: spacing.md },
        kidButton: {
          borderRadius: brawl.borderRadius.lg,
          overflow: 'hidden',
          width: '100%',
          ...brawl.cardBorder(3),
        },
        kidGradient: {
          paddingVertical: 22,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
        },
        kidEmoji: { fontSize: 32, marginBottom: 6 },
        kidTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
        parentButton: {
          backgroundColor: roblox.colors.bgCard,
          paddingVertical: 18,
          paddingHorizontal: spacing.lg,
          borderRadius: roblox.borderRadius.lg,
          alignItems: 'center',
          width: '100%',
          ...roblox.cardBorder(2),
        },
        parentEmoji: { fontSize: 24, marginBottom: 4 },
        parentTitle: { fontSize: 17, fontWeight: '700', color: roblox.colors.text },
        parentSub: { fontSize: 12, color: roblox.colors.textMuted, marginTop: 4 },
      }),
    []
  );

  return (
    <LinearGradient colors={[...roblox.gradientBg]} style={styles.container}>
      <FloatingEmojis
        emojis={['💎', '🪙', '⭐', '✨', '🎮', '🏆', '🔥', '🎯', '🎁', '👑']}
        count={18}
        opacity={0.22}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <AuthBrand variant="welcome" />

          <View style={styles.buttons}>
            <FadeInUp index={3}>
              <BouncyPressable
                style={styles.kidButton}
                onPress={() => router.push('/kid-login')}
                scaleDown={0.97}
              >
                <LinearGradient
                  colors={[brawl.colors.gradientStart, brawl.colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.kidGradient}
                >
                  <Text style={styles.kidEmoji}>💎</Text>
                  <Text style={styles.kidTitle}>{t('welcomeKidBtn')}</Text>
                </LinearGradient>
              </BouncyPressable>
            </FadeInUp>

            <FadeInUp index={4}>
              <BouncyPressable
                style={styles.parentButton}
                onPress={() => router.push('/parent-login')}
                scaleDown={0.97}
              >
                <Text style={styles.parentEmoji}>🪙</Text>
                <Text style={styles.parentTitle}>{t('welcomeParentBtn')}</Text>
                <Text style={styles.parentSub}>{t('welcomeParentSub')}</Text>
              </BouncyPressable>
            </FadeInUp>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
