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

type RegisterMode = 'create' | 'join';

export default function ParentRegisterScreen() {
  const [mode, setMode] = useState<RegisterMode>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
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

  const handleRegister = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('שגיאה', 'מלא את כל השדות');
      return;
    }
    if (mode === 'create' && !familyName) {
      Alert.alert('שגיאה', 'מלא את כל השדות');
      return;
    }
    if (mode === 'join' && !inviteCode.trim()) {
      Alert.alert('שגיאה', 'הזן קוד הזמנה');
      return;
    }
    setLoading(true);
    try {
      const res = await api.parentRegister(
        email,
        password,
        displayName,
        mode === 'create' ? familyName : undefined,
        mode === 'join' ? inviteCode.trim() : undefined
      );
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
      emojis={['🪙', '🛡️', '👨‍👩‍👧‍👦', '⭐', '🌐']}
      emojiCount={16}
      onBack={() => router.back()}
      scroll
    >
      <AuthBrand variant="register" compact />

      <AuthFormCard themeId="roblox">
        {mode === 'create' ? (
          <Input label={t('familyName')} value={familyName} onChangeText={setFamilyName} placeholder="משפחת כהן" />
        ) : (
          <Input
            label={t('inviteCode')}
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
          />
        )}
        <Input label={t('displayName')} value={displayName} onChangeText={setDisplayName} placeholder="אבא" />
        <Input label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
        <Button title={t('createAccount')} onPress={handleRegister} loading={loading} />
        <BouncyPressable onPress={() => setMode(mode === 'create' ? 'join' : 'create')} style={styles.link}>
          <RtlText style={styles.linkText} wrap={false}>
            {mode === 'create' ? t('haveInviteCode') : t('createNewFamily')}
          </RtlText>
        </BouncyPressable>
        <BouncyPressable onPress={() => router.push('/parent-login')} style={styles.link}>
          <RtlText style={styles.linkText} wrap={false}>
            {t('alreadyHaveAccount')}
          </RtlText>
        </BouncyPressable>
      </AuthFormCard>
    </AuthScreenShell>
  );
}
