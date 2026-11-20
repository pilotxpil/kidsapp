import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MIN_PASSWORD_LENGTH } from '@kidsapp/shared';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { c } from '../lib/i18n';
import { haptic } from '../lib/haptics';
import { AuthLayout } from '../components/AuthLayout';
import { Field, Sticker, ToyButton, Txt, toast } from '../components/ui';
import { CORAL, MINT_DARK } from '../constants/themes';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { login } = useAuth();
  const [email, setEmail] = useState(params.email ?? '');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    setLoading(true);
    setError('');
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
      haptic.success();
    } catch (e) {
      haptic.error();
      setError(e instanceof Error ? e.message : 'שליחה נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(c.register.passwordShort);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.resetPassword(email.trim(), code.trim(), password);
      haptic.success();
      toast(c.forgot.done);
      await login(res.token, res.user);
      router.replace('/(parent)');
    } catch (e) {
      haptic.error();
      setError(e instanceof Error ? e.message : 'האיפוס נכשל');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={c.forgot.title} sub={c.forgot.sub} mood="think">
      <Sticker tone="calm" pad={18}>
        <View style={{ gap: 14 }}>
          <Field label={c.parentLogin.email} kind="email" icon="mail" value={email} onChangeText={setEmail} editable={!sent} />
          {sent ? (
            <>
              <Txt v="strong" color={MINT_DARK}>
                {c.forgot.sent}
              </Txt>
              <Field label={c.forgot.code} kind="code" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ''))} />
              <Field label={c.forgot.newPassword} kind="newPassword" icon="key" value={password} onChangeText={setPassword} hint={c.register.passwordHint} />
              {error ? <Txt v="strong" color={CORAL}>{error}</Txt> : null}
              <ToyButton title={c.forgot.reset} onPress={reset} loading={loading} full disabled={code.length !== 6} />
              <ToyButton title={c.forgot.resend} onPress={send} variant="ghost" full size="md" sound={false} />
            </>
          ) : (
            <>
              {error ? <Txt v="strong" color={CORAL}>{error}</Txt> : null}
              <ToyButton title={c.forgot.send} onPress={send} loading={loading} full icon="mail" disabled={!email.trim()} />
            </>
          )}
        </View>
      </Sticker>
    </AuthLayout>
  );
}
