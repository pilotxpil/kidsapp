import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
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
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Celebration } from '../components/Celebration';
import { FloatingEmojis } from '../components/animations/FloatingEmojis';
import { FadeInUp } from '../components/animations/FadeInUp';
import { BouncyPressable } from '../components/animations/BouncyPressable';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors, spacing } from '../constants/theme';
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
  const emojiBounce = useSharedValue(0);

  useEffect(() => {
    emojiBounce.value = withRepeat(
      withSequence(
        withSpring(-10, { damping: 5 }),
        withSpring(0, { damping: 7 })
      ),
      -1,
      true
    );
  }, [emojiBounce]);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: emojiBounce.value }],
  }));

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
        setBonusMsg(parts.join(' | '));
        setCelebrate(true);
      } else {
        router.replace('/(kid)');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'שגיאה בהתחברות';
      setError(message);
      Alert.alert('שגיאה', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bg, '#1a0a2e']} style={styles.container}>
      <FloatingEmojis count={10} opacity={0.25} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
          <BouncyPressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← {t('back')}</Text>
          </BouncyPressable>

          <FadeInUp index={0}>
            <Animated.Text style={[styles.emoji, emojiStyle]}>🎮</Animated.Text>
          </FadeInUp>
          <FadeInUp index={1}>
            <Text style={styles.title}>{t('kidLogin')}</Text>
          </FadeInUp>

          <FadeInUp index={2}>
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
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Celebration
        visible={celebrate}
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
  back: { position: 'absolute', top: spacing.lg, right: spacing.lg, zIndex: 1 },
  backText: { color: colors.primaryLight, fontSize: 16 },
  emoji: { fontSize: 64, textAlign: 'center', marginBottom: spacing.md },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: spacing.xl },
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
