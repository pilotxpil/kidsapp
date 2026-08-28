import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors, spacing } from '../constants/theme';
import { t } from '../lib/i18n';

export default function ParentRegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password || !displayName || !familyName) {
      Alert.alert('שגיאה', 'מלא את כל השדות');
      return;
    }
    setLoading(true);
    try {
      const res = await api.parentRegister(email, password, displayName, familyName);
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.inner}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <Text style={styles.backText}>← {t('back')}</Text>
            </TouchableOpacity>

            <Text style={styles.title}>{t('parentRegister')}</Text>

            <View style={styles.form}>
              <Input label={t('familyName')} value={familyName} onChangeText={setFamilyName} placeholder="משפחת כהן" />
              <Input label={t('displayName')} value={displayName} onChangeText={setDisplayName} placeholder="אבא" />
              <Input label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <Input label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
              <Button title={t('createAccount')} onPress={handleRegister} loading={loading} />
              <TouchableOpacity onPress={() => router.push('/parent-login')} style={styles.link}>
                <Text style={styles.linkText}>{t('alreadyHaveAccount')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  inner: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  back: { marginBottom: spacing.md },
  backText: { color: colors.primaryLight, fontSize: 16, textAlign: 'right' },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.xl },
  form: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  link: { marginTop: spacing.md, alignItems: 'center' },
  linkText: { color: colors.primaryLight, fontSize: 14 },
});
