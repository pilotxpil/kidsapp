import 'react-native-reanimated';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar, ActivityIndicator, View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { ThemeProvider, useTheme } from '../lib/theme-context';
import { spacing } from '../constants/theme';
import { initNativeRTL, rtl } from '../lib/rtl';
import { initSfx } from '../lib/sfx';
import { initBgm } from '../lib/bgm';

initNativeRTL();
initSfx();
initBgm();

function RootNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
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
      router.replace('/');
      return;
    }

    if (user?.role === 'kid' && !inKidGroup && !inAuth) {
      router.replace('/(kid)');
    } else if (user?.role === 'parent' && !inParentGroup && !inAuth) {
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

  const isKid = !!user && user.role === 'kid';
  const isParent = !!user && user.role === 'parent';

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} translucent={Platform.OS === 'android'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="kid-login" />
        <Stack.Screen name="parent-login" />
        <Stack.Screen name="parent-register" />
        <Stack.Protected guard={isKid}>
          <Stack.Screen name="(kid)" />
        </Stack.Protected>
        <Stack.Protected guard={isParent}>
          <Stack.Screen name="(parent)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={rtl.root}>
        <AuthProvider>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}
