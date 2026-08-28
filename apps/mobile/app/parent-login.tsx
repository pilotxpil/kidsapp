import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors, spacing } from '../constants/theme';
import { t } from '../lib/i18n';

export default function ParentLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

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
    <LinearGradient colors={[colors.bg, '#0f172a']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← {t('back')}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{t('parentLogin')}</Text>
          <Text style={styles.subtitle}>ניהול משימות, אישורים ופרסים</Text>

          <View style={styles.form}>
            <Input label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Input label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
            <Button title={t('login')} onPress={handleLogin} loading={loading} />
            <TouchableOpacity onPress={() => router.push('/parent-register')} style={styles.link}>
              <Text style={styles.linkText}>{t('noAccount')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  inner: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  back: { position: 'absolute', top: spacing.lg, right: spacing.lg, zIndex: 1 },
  backText: { color: colors.primaryLight, fontSize: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl, marginTop: spacing.sm },
  form: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  link: { marginTop: spacing.md, alignItems: 'center' },
  linkText: { color: colors.primaryLight, fontSize: 14 },
});
