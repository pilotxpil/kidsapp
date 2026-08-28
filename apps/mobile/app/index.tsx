import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../constants/theme';
import { t } from '../lib/i18n';
import { FadeInUp } from '../components/animations/FadeInUp';
import { BouncyPressable } from '../components/animations/BouncyPressable';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={[colors.bg, '#0f172a']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <FadeInUp index={0}>
            <View style={styles.mark}>
              <Text style={styles.markText}>Q</Text>
            </View>
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
                scaleDown={0.97}
              >
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.kidGradient}
                >
                  <Text style={styles.kidTitle}>{t('kidLogin')}</Text>
                  <Text style={styles.kidSub}>המשך מאיפה שעצרת</Text>
                </LinearGradient>
              </BouncyPressable>
            </FadeInUp>

            <FadeInUp index={4}>
              <BouncyPressable
                style={styles.parentButton}
                onPress={() => router.push('/parent-login')}
                scaleDown={0.97}
              >
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
    width: '100%',
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  markText: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '800',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 4,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.xl * 2,
    textAlign: 'center',
  },
  buttons: { width: '100%', maxWidth: 400, gap: spacing.md },
  kidButton: { borderRadius: borderRadius.lg, overflow: 'hidden', width: '100%' },
  kidGradient: {
    paddingVertical: 20,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  kidTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  kidSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  parentButton: {
    backgroundColor: colors.bgCard,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  parentTitle: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
});
