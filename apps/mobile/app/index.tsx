import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../constants/theme';
import { t } from '../lib/i18n';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={[colors.bg, '#1a0a2e', colors.bg]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.logo}>🎮</Text>
          <Text style={styles.title}>{t('appName')}</Text>
          <Text style={styles.tagline}>{t('appTagline')}</Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.kidButton}
              onPress={() => router.push('/kid-login')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={styles.kidGradient}
              >
                <Text style={styles.kidEmoji}>🦁</Text>
                <Text style={styles.kidTitle}>{t('kidLogin')}</Text>
                <Text style={styles.kidSub}>משימות ופרסים מגניבים!</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.parentButton}
              onPress={() => router.push('/parent-login')}
              activeOpacity={0.8}
            >
              <Text style={styles.parentEmoji}>👨‍👩‍👧‍👦</Text>
              <Text style={styles.parentTitle}>{t('parentLogin')}</Text>
            </TouchableOpacity>
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
  logo: { fontSize: 80, marginBottom: spacing.md },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.sm,
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
  kidEmoji: { fontSize: 48, marginBottom: spacing.sm },
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
