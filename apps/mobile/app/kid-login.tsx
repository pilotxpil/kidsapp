import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Text, StyleSheet, Alert, Platform, View, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Celebration } from '../components/Celebration';
import { AuthBrand } from '../components/AuthBrand';
import { AuthScreenShell, useKeyboardOpen } from '../components/AuthScreenShell';
import { AuthFormCard } from '../components/AuthFormCard';
import { KidLoginScanner } from '../components/KidLoginScanner';
import { playSfx } from '../lib/sfx';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { spacing } from '../constants/theme';
import { kidAuthTheme } from '../constants/theme';
import { t } from '../lib/i18n';
import { resetKidGiftDismissals } from '../lib/kid-gift-dismiss';
import { markAvatarGiftUnlocked } from '../lib/avatar-gift';
import { getSavedFamilyCode, saveFamilyCode } from '../lib/kid-login-storage';

export default function KidLoginScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    user?: string;
    name?: string;
    familyCode?: string;
    username?: string;
  }>();
  const [familyCode, setFamilyCode] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [bonusMsg, setBonusMsg] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const keyboardOpen = useKeyboardOpen();

  useEffect(() => {
    void getSavedFamilyCode().then((code) => {
      if (code) setFamilyCode((prev) => prev || code);
    });
  }, []);

  useEffect(() => {
    const code = (params.code || params.familyCode || '').replace(/\D/g, '').slice(0, 6);
    const user = (params.user || params.username || '').trim();
    if (code) {
      setFamilyCode(code);
      void saveFamilyCode(code);
    }
    if (user) setUsername(user);
  }, [params.code, params.familyCode, params.user, params.username]);

  const applyScan = useCallback((payload: { familyCode: string; username: string }) => {
    setFamilyCode(payload.familyCode);
    setUsername(payload.username);
    void saveFamilyCode(payload.familyCode);
    playSfx('coin');
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scanRow: {
          width: '100%',
          alignItems: 'flex-end',
          marginBottom: spacing.xs,
        },
        scanBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.15)',
        },
        scanText: {
          color: kidAuthTheme.colors.textMuted,
          fontSize: 12,
          fontWeight: '600',
        },
        error: {
          color: kidAuthTheme.colors.danger,
          textAlign: 'center',
          marginTop: spacing.sm,
          fontSize: 14,
          fontWeight: '600',
        },
        hint: {
          color: kidAuthTheme.colors.textMuted,
          fontSize: 12,
          textAlign: 'right',
          marginTop: -spacing.xs,
          marginBottom: spacing.sm,
        },
      }),
    []
  );

  const handleLogin = async () => {
    const code = familyCode.trim();
    if (!code || !username || pin.length < 4) {
      Alert.alert('שגיאה', 'הזן קוד משפחה, שם משתמש ו-PIN של 4 ספרות');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.kidLogin(username.trim(), pin, code);
      await saveFamilyCode(code);
      resetKidGiftDismissals();
      if (res.avatarGiftJustUnlocked) markAvatarGiftUnlocked();
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
        themeId="ember"
        emojis={['🔥', '🌋', '⚡']}
        emojiCount={0}
        onBack={() => router.back()}
        scroll
      >
        <AuthBrand variant="kid" compact />

        <AuthFormCard themeId="ember" compact>
          {Platform.OS !== 'web' && !keyboardOpen ? (
            <View style={styles.scanRow}>
              <Pressable
                onPress={() => setScannerOpen(true)}
                style={styles.scanBtn}
                accessibilityRole="button"
                accessibilityLabel={t('scanKidLogin')}
              >
                <Text style={styles.scanText}>📷 {t('scanKidLogin')}</Text>
              </Pressable>
            </View>
          ) : null}

          <Input
            compact
            label={t('familyCode')}
            value={familyCode}
            onChangeText={(v) => setFamilyCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
            ltr
          />
          {!keyboardOpen ? <Text style={styles.hint}>{t('familyCodeHint')}</Text> : null}

          <Input
            compact
            label={t('username')}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoComplete="username"
            ltr
          />
          <Input
            compact
            label={t('pin')}
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="••••"
            ltr
          />
          <Button title={t('login')} onPress={handleLogin} loading={loading} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </AuthFormCard>
      </AuthScreenShell>

      <KidLoginScanner
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={applyScan}
      />

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
