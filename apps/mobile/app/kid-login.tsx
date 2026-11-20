import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { c } from '../lib/i18n';
import { haptic } from '../lib/haptics';
import { playSfx } from '../lib/sfx';
import { resetKidGiftDismissals } from '../lib/kid-gift-dismiss';
import { markAvatarGiftUnlocked } from '../lib/avatar-gift';
import { getSavedFamilyCode, saveFamilyCode } from '../lib/kid-login-storage';
import { AuthLayout } from '../components/AuthLayout';
import { KidLoginScanner } from '../components/KidLoginScanner';
import { Field, PinPad, Sticker, ToyButton, Txt } from '../components/ui';
import { CORAL } from '../constants/themes';

export default function KidLoginScreen() {
  const params = useLocalSearchParams<{ code?: string; user?: string; name?: string; familyCode?: string; username?: string }>();
  const router = useRouter();
  const { login } = useAuth();
  const [familyCode, setFamilyCode] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [step, setStep] = useState<'who' | 'pin'>('who');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pinError, setPinError] = useState(0);
  const [scanner, setScanner] = useState(false);

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
    if (params.name) setDisplayName(params.name);
    if (code && user) setStep('pin');
  }, [params.code, params.familyCode, params.user, params.username, params.name]);

  const goPin = () => {
    if (familyCode.trim().length < 4 || !username.trim()) {
      setError(c.kidLogin.missing);
      haptic.warn();
      return;
    }
    setError('');
    setPin('');
    setStep('pin');
  };

  const submit = useCallback(
    async (fullPin: string) => {
      setLoading(true);
      try {
        const res = await api.kidLogin(username.trim(), fullPin, familyCode.trim());
        await saveFamilyCode(familyCode.trim());
        resetKidGiftDismissals();
        if (res.avatarGiftJustUnlocked) markAvatarGiftUnlocked();
        haptic.success();
        playSfx('cheer', { volume: 0.7 });
        await login(res.token, res.user);
        router.replace('/(kid)');
      } catch (e) {
        setPin('');
        setPinError((n) => n + 1);
        playSfx('error');
        const msg = e instanceof Error ? e.message : c.kidLogin.wrong;
        // Wrong family code / username lands back on the first step.
        if (/קוד משפחה|שם משתמש/.test(msg)) setError(msg);
        else setError(c.kidLogin.wrong);
      } finally {
        setLoading(false);
      }
    },
    [username, familyCode, login, router]
  );

  useEffect(() => {
    if (step === 'pin' && pin.length === 4 && !loading) void submit(pin);
  }, [pin, step, loading, submit]);

  if (step === 'pin') {
    const name = displayName || username;
    return (
      <AuthLayout title={c.kidLogin.hello.replace('{name}', name)} sub={c.kidLogin.pinTitle} mood={pinError ? 'think' : 'cheer'} onBack={() => setStep('who')}>
        <View style={{ alignItems: 'center', gap: 12, paddingTop: 6 }}>
          <PinPad value={pin} onChange={setPin} error={pinError > 0 && pin.length === 0} key={pinError} />
          {error ? (
            <Txt v="title" color={CORAL} align="center">
              {error}
            </Txt>
          ) : null}
          <ToyButton title={c.kidLogin.switchKid} variant="ghost" size="md" onPress={() => setStep('who')} sound={false} />
        </View>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={c.kidLogin.title} mood="happy">
      <Sticker pad={18}>
        <View style={{ gap: 14 }}>
          <Field
            label={c.kidLogin.familyCode}
            kind="code"
            hint={c.kidLogin.familyCodeHint}
            value={familyCode}
            onChangeText={(v) => setFamilyCode(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
          />
          <Field
            label={c.kidLogin.username}
            kind="username"
            icon="user"
            value={username}
            onChangeText={setUsername}
            returnKeyType="next"
            onSubmitEditing={goPin}
          />
          {error ? <Txt v="strong" color={CORAL}>{error}</Txt> : null}
          <ToyButton title={c.kidLogin.next} onPress={goPin} full variant="gold" icon="forward" />
        </View>
      </Sticker>
      {Platform.OS !== 'web' ? (
        <ToyButton title={c.kidLogin.scan} icon="qr" variant="secondary" full onPress={() => setScanner(true)} />
      ) : null}
      <KidLoginScanner
        visible={scanner}
        onClose={() => setScanner(false)}
        onScan={(p) => {
          setScanner(false);
          setFamilyCode(p.familyCode);
          setUsername(p.username);
          if (p.displayName) setDisplayName(p.displayName);
          void saveFamilyCode(p.familyCode);
          playSfx('coin');
          setPin('');
          setStep('pin');
        }}
      />
    </AuthLayout>
  );
}
