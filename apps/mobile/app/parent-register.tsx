import React, { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MIN_PASSWORD_LENGTH } from '@kidsapp/shared';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme-context';
import { c } from '../lib/i18n';
import { haptic } from '../lib/haptics';
import { setNextRoute } from '../lib/next-route';
import { AuthLayout } from '../components/AuthLayout';
import { Field, Sticker, ToyButton, Txt, Row, Segmented } from '../components/ui';
import { CORAL } from '../constants/themes';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ParentRegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string }>();
  const { login } = useAuth();
  const { world } = useTheme();
  const [mode, setMode] = useState<'new' | 'join'>(params.invite ? 'join' : 'new');
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [invite, setInvite] = useState(params.invite ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const familyRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const fail = (msg: string) => {
    setError(msg);
    haptic.warn();
  };

  const next = () => {
    if (mode === 'new' && (!name.trim() || !familyName.trim())) return fail(c.register.nameMissing);
    if (mode === 'join' && !name.trim()) return fail(c.register.nameMissingJoin);
    if (mode === 'join' && !invite.trim()) return fail(c.register.codeMissing);
    setError('');
    setStep(2);
  };

  const submit = async () => {
    if (!EMAIL_RE.test(email.trim())) return fail(c.register.emailBad);
    if (password.length < MIN_PASSWORD_LENGTH) return fail(c.register.passwordShort);
    setLoading(true);
    setError('');
    try {
      const res = await api.parentRegister(
        email.trim(),
        password,
        name.trim(),
        mode === 'new' ? familyName.trim() : undefined,
        mode === 'join' ? invite.trim() : undefined
      );
      haptic.success();
      setNextRoute(mode === 'new' ? '/(parent)/onboarding' : '/(parent)');
      await login(res.token, res.user);
    } catch (e) {
      haptic.error();
      setError(e instanceof Error ? e.message : 'ההרשמה נכשלה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={c.register.title}
      sub={step === 1 ? c.register.step1Sub : c.register.step2Sub}
      mood={step === 1 ? 'happy' : 'cheer'}
      onBack={step === 2 ? () => setStep(1) : undefined}
    >
      <Sticker tone="calm" pad={18}>
        <View style={{ gap: 14 }}>
          {step === 1 ? (
            <>
              <Txt v="h2">{c.register.step1}</Txt>
              <Segmented
                value={mode}
                onChange={(v) => {
                  setMode(v);
                  setError('');
                }}
                options={[
                  { value: 'new', label: c.register.joinNo },
                  { value: 'join', label: c.register.join },
                ]}
              />
              <Field
                label={c.register.yourName}
                kind="name"
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                onSubmitEditing={() => familyRef.current?.focus()}
              />
              {mode === 'new' ? (
                <Field
                  ref={familyRef}
                  label={c.register.familyName}
                  placeholder={c.register.familyNamePh}
                  value={familyName}
                  onChangeText={setFamilyName}
                  returnKeyType="next"
                  onSubmitEditing={next}
                />
              ) : (
                <Field
                  ref={familyRef}
                  label={c.register.joinCode}
                  kind="code"
                  hint={c.register.joinHint}
                  value={invite}
                  onChangeText={(v) => setInvite(v.replace(/\D/g, ''))}
                  returnKeyType="next"
                  onSubmitEditing={next}
                />
              )}
              {error ? <Txt v="strong" color={CORAL}>{error}</Txt> : null}
              <ToyButton title={c.register.next} onPress={next} full icon="forward" />
            </>
          ) : (
            <>
              <Txt v="h2">{c.register.step2}</Txt>
              <Field
                label={c.parentLogin.email}
                kind="email"
                icon="mail"
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                returnKeyType="next"
                onSubmitEditing={() => passRef.current?.focus()}
              />
              <Field
                ref={passRef}
                label={c.parentLogin.password}
                kind="newPassword"
                icon="key"
                hint={c.register.passwordHint}
                value={password}
                onChangeText={setPassword}
                returnKeyType="go"
                onSubmitEditing={submit}
              />
              {error ? <Txt v="strong" color={CORAL}>{error}</Txt> : null}
              <ToyButton
                title={mode === 'new' ? c.register.create : c.register.joinSubmit}
                onPress={submit}
                loading={loading}
                full
                variant="success"
                sound="cheer"
              />
              <Row justify="center" wrap gap={4}>
                <Txt v="caption" muted align="center">
                  {c.register.accept}
                </Txt>
              </Row>
              <Row justify="center" gap={20}>
                <Pressable onPress={() => router.push('/terms')} hitSlop={8}>
                  <Txt v="caption" color={world.accentDark}>{c.welcome.terms}</Txt>
                </Pressable>
                <Pressable onPress={() => router.push('/privacy')} hitSlop={8}>
                  <Txt v="caption" color={world.accentDark}>{c.welcome.privacy}</Txt>
                </Pressable>
              </Row>
            </>
          )}
        </View>
      </Sticker>
      <Row justify="center">
        <Pressable onPress={() => router.replace('/parent-login')} accessibilityRole="link" hitSlop={8}>
          <Txt v="title" color={world.accentDark}>
            {c.register.haveAccount}
          </Txt>
        </Pressable>
      </Row>
    </AuthLayout>
  );
}
