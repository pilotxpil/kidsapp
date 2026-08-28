import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../constants/theme';
import { t } from '../lib/i18n';
import { FloatingEmojis } from '../components/animations/FloatingEmojis';
import { FadeInUp } from '../components/animations/FadeInUp';
import { BouncyPressable } from '../components/animations/BouncyPressable';

export default function WelcomeScreen() {
  const router = useRouter();
  const logoBounce = useSharedValue(0);

  useEffect(() => {
    logoBounce.value = withRepeat(
      withSequence(
        withSpring(-12, { damping: 4, stiffness: 120 }),
        withSpring(0, { damping: 6, stiffness: 100 })
      ),
      -1,
      true
    );
  }, [logoBounce]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoBounce.value }],
  }));

  return (
    <LinearGradient colors={[colors.bg, '#1a0a2e', colors.bg]} style={styles.container}>
      <FloatingEmojis count={14} opacity={0.4} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <FadeInUp index={0}>
            <Animated.Text style={[styles.logo, logoStyle]}>🎮</Animated.Text>
          </FadeInUp>
          <FadeInUp index={1}>
            <Text style={styles.title}>{t('appName')}</Text>
          </FadeInUp>
          <FadeInUp index={2}>
            <Text style={styles.tagline}>{t('appTagline')}</Text>
          </FadeInUp>

          <View style={styles.buttons}>
            <FadeInUp index={3}>
              <BouncyPressable
                style={styles.kidButton}
                onPress={() => router.push('/kid-login')}
                scaleDown={0.95}
              >
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd, '#ec4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.kidGradient}
                >
                  <Text style={styles.kidEmoji}>🦁</Text>
                  <Text style={styles.kidTitle}>{t('kidLogin')}</Text>
                  <Text style={styles.kidSub}>משימות ופרסים מגניבים!</Text>
                </LinearGradient>
              </BouncyPressable>
            </FadeInUp>

            <FadeInUp index={4}>
              <BouncyPressable
                style={styles.parentButton}
                onPress={() => router.push('/parent-login')}
              >
                <Text style={styles.parentEmoji}>👨‍👩‍👧‍👦</Text>
                <Text style={styles.parentTitle}>{t('parentLogin')}</Text>
              </BouncyPressable>
            </FadeInUp>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  logo: { fontSize: 88, marginBottom: spacing.md, textAlign: 'center' },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: colors.textMuted,
    marginBottom: spacing.xl * 2,
    textAlign: 'center',
  },
  buttons: { width: '100%', maxWidth: 400, gap: spacing.md },
  kidButton: { borderRadius: borderRadius.xl, overflow: 'hidden' },
  kidGradient: {
    padding: spacing.xl,
    alignItems: 'center',
    borderRadius: borderRadius.xl,
  },
  kidEmoji: { fontSize: 52, marginBottom: spacing.sm },
  kidTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  kidSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  parentButton: {
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  parentEmoji: { fontSize: 32, marginBottom: spacing.sm },
  parentTitle: { fontSize: 18, fontWeight: '600', color: colors.textMuted },
});
