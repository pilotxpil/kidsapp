import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Celebration } from '../components/Celebration';
import { playSfx } from '../lib/sfx';
import { FadeInUp } from '../components/animations/FadeInUp';
import { BouncyPressable } from '../components/animations/BouncyPressable';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors, spacing, gradientBg } from '../constants/theme';

import { API_URL } from '../lib/config';
import { t } from '../lib/i18n';

export default function KidLoginScreen() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [bonusMsg, setBonusMsg] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || pin.length < 4) {
      Alert.alert('שגיאה', 'הזן שם משתמש ו-PIN של 4 ספרות');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.kidLogin(username, pin);
      await login(res.token, res.user);

      if (res.dailyBonus || res.streakBonus) {
        const parts = [];
        if (res.dailyBonus) parts.push(`${t('dailyBonus')}: +${res.dailyBonus}`);
        if (res.streakBonus) parts.push(`${t('streakBonus')}: +${res.streakBonus}`);
        setBonusMsg(parts.join(' · '));
        setCelebrate(true);
      } else {
        router.replace('/(kid)');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'שגיאה בהתחברות';
      setError(message);
      playSfx('error');
      Alert.alert('שגיאה', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[...gradientBg]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
          <BouncyPressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>{t('back')}</Text>
          </BouncyPressable>

          <View style={styles.body}>
            <FadeInUp index={0}>
              <Text style={styles.title}>{t('kidLogin')}</Text>
              <Text style={styles.subtitle}>שם משתמש ו-PIN</Text>
            </FadeInUp>

            <FadeInUp index={1}>
              <View style={styles.form}>
              <Input
                label={t('username')}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholder="yonatan"
              />
              <Input
                label={t('pin')}
                value={pin}
                onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                placeholder="••••"
              />
              <Button title={t('login')} onPress={handleLogin} loading={loading} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {__DEV__ ? <Text style={styles.devHint}>שרת: {API_URL}</Text> : null}
              </View>
            </FadeInUp>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Celebration
        visible={celebrate}
        sfx="coin"
        message={bonusMsg || t('welcome')}
        onDone={() => {
          setCelebrate(false);
          router.replace('/(kid)');
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  inner: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  body: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  back: { position: 'absolute', top: spacing.lg, right: spacing.lg, zIndex: 1 },
  backText: { color: colors.primaryLight, fontSize: 15 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl, marginTop: spacing.sm },
  form: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  error: {
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.md,
    fontSize: 14,
    fontWeight: '600',
  },
  devHint: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: 11,
  },
});
