import React, { useState, useMemo } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { AuthBrand } from '../components/AuthBrand';
import { AuthScreenShell } from '../components/AuthScreenShell';
import { AuthFormCard } from '../components/AuthFormCard';
import { BouncyPressable } from '../components/animations/BouncyPressable';
import { RtlText } from '../components/RtlText';
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        link: { marginTop: spacing.md, alignItems: 'center' },
        linkText: { color: colors.primaryLight, fontSize: 14, fontWeight: '700' },
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
    <AuthScreenShell
      themeId="roblox"
      emojis={['🪙', '🧱', '🌐', '🎮', '⭐', '🔴']}
      emojiCount={18}
      onBack={() => router.back()}
    >
      <AuthBrand variant="parent" compact />

      <AuthFormCard themeId="roblox">
        <Input
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
        <Button title={t('login')} onPress={handleLogin} loading={loading} />
        <BouncyPressable onPress={() => router.push('/parent-register')} style={styles.link}>
          <RtlText style={styles.linkText} wrap={false}>
            {t('noAccount')}
          </RtlText>
        </BouncyPressable>
      </AuthFormCard>
    </AuthScreenShell>
  );
}
