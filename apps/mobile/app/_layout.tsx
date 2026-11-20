import 'react-native-reanimated';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { AuthProvider, useAuth } from '../lib/auth';
import { ThemeProvider, useTheme } from '../lib/theme-context';
import { PremiumProvider } from '../lib/premium';
import { initNativeRTL, rtl } from '../lib/rtl';
import { initSfx } from '../lib/sfx';
import { initBgm } from '../lib/bgm';
import { checkForStoreUpdate } from '../lib/appUpdate';
import { FONT_ASSETS } from '../lib/fonts';
import { consumeNextRoute } from '../lib/next-route';
import { Piko, ToastHost } from '../components/ui';

SplashScreen.preventAutoHideAsync();
initNativeRTL();
initSfx();
initBgm();

/** Pages anyone can open, signed in or not (store listing links point at some of them). */
const PUBLIC_ROUTES = new Set(['privacy', 'terms', 'delete-account']);
const AUTH_ROUTES = new Set(['kid-login', 'parent-login', 'parent-register', 'forgot-password']);
/** Signed-in pages outside the role groups. */
const SHARED_ROUTES = new Set(['premium']);

function RootNavigator() {
  const { user, loading } = useAuth();
  const { world } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void checkForStoreUpdate();
  }, []);

  useEffect(() => {
    if (loading) return;
    const top = (segments[0] ?? '') as string;
    const inKid = top === '(kid)';
    const inParent = top === '(parent)';

    if (PUBLIC_ROUTES.has(top)) return;

    if (!user) {
      if (inKid || inParent || SHARED_ROUTES.has(top)) router.replace('/');
      return;
    }
    if (SHARED_ROUTES.has(top)) return;
    const home = user.role === 'kid' ? '/(kid)' : '/(parent)';
    if (AUTH_ROUTES.has(top) || top === '' || top === 'index') {
      const next = consumeNextRoute();
      router.replace((next ?? home) as typeof home);
    } else if (user.role === 'kid' && !inKid) {
      router.replace('/(kid)');
    } else if (user.role === 'parent' && !inParent) {
      router.replace('/(parent)');
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: world.paper }}>
        <Piko size={96} mood="happy" bob />
      </View>
    );
  }

  const isKid = !!user && user.role === 'kid';
  const isParent = !!user && user.role === 'parent';

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: world.paper }, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="kid-login" />
        <Stack.Screen name="parent-login" />
        <Stack.Screen name="parent-register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="delete-account" />
        <Stack.Screen name="premium" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Protected guard={isKid}>
          <Stack.Screen name="(kid)" />
        </Stack.Protected>
        <Stack.Protected guard={isParent}>
          <Stack.Screen name="(parent)" />
        </Stack.Protected>
      </Stack>
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <View style={rtl.root}>
        <AuthProvider>
          <ThemeProvider>
            <PremiumProvider>
              <RootNavigator />
            </PremiumProvider>
          </ThemeProvider>
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}
