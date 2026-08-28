import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar, ActivityIndicator, View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { colors } from '../constants/theme';
import { initNativeRTL, rtl } from '../lib/rtl';

initNativeRTL();

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inKidGroup = segments[0] === '(kid)';
    const inParentGroup = segments[0] === '(parent)';
    const inAuth =
      segments[0] === 'kid-login' ||
      segments[0] === 'parent-login' ||
      segments[0] === 'parent-register';

    if (!user && (inKidGroup || inParentGroup)) {
      router.dismissAll();
      router.replace('/');
      return;
    }

    if (user?.role === 'kid' && !inKidGroup) {
      router.replace('/(kid)');
    } else if (user?.role === 'parent' && !inParentGroup) {
      router.replace('/(parent)');
    } else if (user && inAuth) {
      router.replace(user.role === 'kid' ? '/(kid)' : '/(parent)');
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
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} translucent={Platform.OS === 'android'} />
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
    <SafeAreaProvider>
      <View style={rtl.root}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}
