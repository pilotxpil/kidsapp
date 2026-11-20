import React, { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme-context';
import { c } from '../lib/i18n';
import { haptic } from '../lib/haptics';
import { AuthLayout } from '../components/AuthLayout';
import { Field, Sticker, ToyButton, Txt, Row } from '../components/ui';
import { CORAL } from '../constants/themes';

export default function ParentLoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { world } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passRef = useRef<TextInput>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError(c.parentLogin.missing);
      haptic.warn();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.parentLogin(email.trim(), password);
      haptic.success();
      await login(res.token, res.user);
      router.replace('/(parent)');
    } catch (e) {
      haptic.error();
      setError(e instanceof Error ? e.message : 'הכניסה נכשלה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={c.parentLogin.title} sub={c.parentLogin.sub} mood="wink">
      <Sticker tone="calm" pad={18}>
        <View style={{ gap: 14 }}>
        <Field
          label={c.parentLogin.email}
          kind="email"
          icon="mail"
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
          onSubmitEditing={() => passRef.current?.focus()}
          placeholder="name@example.com"
        />
        <Field
          ref={passRef}
          label={c.parentLogin.password}
          kind="password"
          icon="key"
          value={password}
          onChangeText={setPassword}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error ? (
          <Txt v="strong" color={CORAL}>
            {error}
          </Txt>
        ) : null}
        <ToyButton title={c.parentLogin.submit} onPress={submit} loading={loading} full />
        <Pressable onPress={() => router.push({ pathname: '/forgot-password', params: { email } })} accessibilityRole="link">
          <Txt v="strong" align="center" color={world.accentDark}>
            {c.parentLogin.forgot}
          </Txt>
        </Pressable>
        </View>
      </Sticker>
      <Row justify="center">
        <Pressable onPress={() => router.replace('/parent-register')} accessibilityRole="link" hitSlop={8}>
          <Txt v="title" color={world.accentDark}>
            {c.parentLogin.noAccount}
          </Txt>
        </Pressable>
      </Row>
    </AuthLayout>
  );
}
