import 'react-native-reanimated';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar, ActivityIndicator, View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  Heebo_800ExtraBold,
  Heebo_900Black,
} from '@expo-google-fonts/heebo';
import { AuthProvider, useAuth } from '../lib/auth';
import { ThemeProvider, useTheme } from '../lib/theme-context';
import { initNativeRTL, rtl } from '../lib/rtl';
import { initSfx } from '../lib/sfx';
import { initBgm } from '../lib/bgm';

SplashScreen.preventAutoHideAsync();
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
    const inPublic = segments[0] === 'privacy';

    if (inPublic) return;

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
        <Stack.Screen name="privacy" />
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
  const [fontsLoaded, fontError] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_600SemiBold,
    Heebo_700Bold,
    Heebo_800ExtraBold,
    Heebo_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
