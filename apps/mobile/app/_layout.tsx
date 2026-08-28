import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../lib/auth';
import { colors } from '../constants/theme';
import { initNativeRTL, rtl } from '../lib/rtl';

initNativeRTL();

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const lastRedirect = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    const inKidGroup = segments[0] === '(kid)';
    const inParentGroup = segments[0] === '(parent)';
    const inAuth =
      segments[0] === 'kid-login' ||
      segments[0] === 'parent-login' ||
      segments[0] === 'parent-register';

    let target: string | null = null;

    if (!user && (inKidGroup || inParentGroup)) {
      target = '/';
    } else if (user?.role === 'kid' && !inKidGroup) {
      target = '/(kid)';
    } else if (user?.role === 'parent' && !inParentGroup) {
      target = '/(parent)';
    } else if (user && inAuth) {
      target = user.role === 'kid' ? '/(kid)' : '/(parent)';
    }

    if (target && lastRedirect.current !== target) {
      lastRedirect.current = target;
      router.replace(target as any);
    } else if (!target) {
      lastRedirect.current = null;
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="kid-login" />
        <Stack.Screen name="parent-login" />
        <Stack.Screen name="parent-register" />
        <Stack.Screen name="(kid)" />
        <Stack.Screen name="(parent)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <View style={rtl.root}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </View>
  );
}
