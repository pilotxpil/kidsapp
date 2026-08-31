import React, { useState, useMemo } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Celebration } from '../components/Celebration';
import { AuthBrand } from '../components/AuthBrand';
import { AuthScreenShell } from '../components/AuthScreenShell';
import { AuthFormCard } from '../components/AuthFormCard';
import { playSfx } from '../lib/sfx';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { spacing } from '../constants/theme';
import { kidAuthTheme } from '../constants/theme';
import { API_URL } from '../lib/config';
import { t } from '../lib/i18n';
import { resetKidGiftDismissals } from '../lib/kid-gift-dismiss';

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
        error: {
          color: kidAuthTheme.colors.danger,
          textAlign: 'center',
          marginTop: spacing.md,
          fontSize: 14,
          fontWeight: '600',
        },
        devHint: {
          color: kidAuthTheme.colors.textMuted,
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
    <>
      <AuthScreenShell
        themeId="brawl"
        emojis={['💎', '⭐', '✨', '🔥', '🏆', '👊', '💜', '🌟']}
        emojiCount={20}
        onBack={() => router.back()}
      >
        <AuthBrand variant="kid" compact />

        <AuthFormCard themeId="brawl">
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
        </AuthFormCard>
      </AuthScreenShell>

      <Celebration
        visible={celebrate}
        sfx="coin"
        message={bonusMsg || t('welcome')}
        onDone={() => {
          setCelebrate(false);
          router.replace('/(kid)');
        }}
      />
    </>
  );
}
