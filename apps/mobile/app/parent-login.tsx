import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { AuthBrand } from '../components/AuthBrand';
import { FloatingEmojis } from '../components/animations/FloatingEmojis';
import { FadeInUp } from '../components/animations/FadeInUp';
import { BouncyPressable } from '../components/animations/BouncyPressable';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors, spacing, gradientBg } from '../constants/theme';
import { t } from '../lib/i18n';

export default function ParentLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
          borderRadius: 16,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        },
        link: { marginTop: spacing.md, alignItems: 'center' },
        linkText: { color: colors.primaryLight, fontSize: 14, fontWeight: '600' },
      }),
    []
  );

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('שגיאה', 'הזן אימייל וסיסמה');
      return;
    }
    setLoading(true);
    try {
      const res = await api.parentLogin(email, password);
      await login(res.token, res.user);
      router.replace('/(parent)');
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[...gradientBg]} style={styles.container}>
      <FloatingEmojis emojis={['🪙', '🧱', '🌐', '🎮', '⭐', '🔴']} count={12} opacity={0.18} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
          <BouncyPressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← {t('back')}</Text>
          </BouncyPressable>

          <AuthBrand variant="parent" compact />

          <FadeInUp index={3}>
            <View style={styles.formCard}>
              <Input label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <Input label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
              <Button title={t('login')} onPress={handleLogin} loading={loading} />
              <BouncyPressable onPress={() => router.push('/parent-register')} style={styles.link}>
                <Text style={styles.linkText}>{t('noAccount')}</Text>
              </BouncyPressable>
            </View>
          </FadeInUp>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
