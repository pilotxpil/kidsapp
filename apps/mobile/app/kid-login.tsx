import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Celebration } from '../components/Celebration';
import { AuthBrand } from '../components/AuthBrand';
import { FloatingEmojis } from '../components/animations/FloatingEmojis';
import { playSfx } from '../lib/sfx';
import { FadeInUp } from '../components/animations/FadeInUp';
import { BouncyPressable } from '../components/animations/BouncyPressable';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { kidAuthTheme, spacing } from '../constants/theme';
import { API_URL } from '../lib/config';
import { t } from '../lib/i18n';
import { resetKidGiftDismissals } from '../lib/kid-gift-dismiss';

const { colors, gradientBg } = {
  colors: kidAuthTheme.colors,
  gradientBg: kidAuthTheme.gradientBg,
};

export default function KidLoginScreen() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [bonusMsg, setBonusMsg] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        safe: { flex: 1 },
        inner: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
        back: { position: 'absolute', top: spacing.lg, right: spacing.lg, zIndex: 2 },
        backText: { color: colors.primaryLight, fontSize: 15, fontWeight: '600' },
        formCard: {
          width: '100%',
          maxWidth: 400,
          alignSelf: 'center',
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderRadius: kidAuthTheme.borderRadius.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
        },
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
      }),
    []
  );

  const handleLogin = async () => {
    if (!username || pin.length < 4) {
      Alert.alert('שגיאה', 'הזן שם משתמש ו-PIN של 4 ספרות');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.kidLogin(username, pin);
      resetKidGiftDismissals();
      await login(res.token, res.user);

      if (res.dailyGiftAvailable ?? res.dailyStarAvailable) {
        setBonusMsg(t('dailyGiftWaiting'));
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
      <FloatingEmojis emojis={['💎', '⭐', '✨', '🔥', '🏆', '👊', '💜', '🌟']} count={14} opacity={0.2} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
          <BouncyPressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← {t('back')}</Text>
          </BouncyPressable>

          <AuthBrand variant="kid" compact />

          <FadeInUp index={3}>
            <View style={styles.formCard}>
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
