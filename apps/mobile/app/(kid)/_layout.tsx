import { Tabs } from 'expo-router';
import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme-context';
import { t } from '../../lib/i18n';
import { startBgm, stopBgm, resumeBgm, pauseBgm } from '../../lib/bgm';
import { initSfx } from '../../lib/sfx';
import { resetKidGiftDismissals } from '../../lib/kid-gift-dismiss';
import { prefetchKidScreens } from '../../lib/prefetch-tabs';
import { BadgeCelebrationProvider } from '../../lib/badge-celebration';
import { ToyTabBar } from '../../components/ui';

export default function KidLayout() {
  const { id: themeId } = useTheme();
  const { user, refreshUser } = useAuth();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    void initSfx();
    void startBgm(themeId);
  }, [themeId]);

  useEffect(() => {
    if (user?.role === 'kid' && user._id) prefetchKidScreens(user._id);
  }, [user?._id, user?.role]);

  useEffect(() => () => void stopBgm(), []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        resetKidGiftDismissals();
        void resumeBgm();
        void refreshUser();
      } else if (next.match(/inactive|background/)) {
        void pauseBgm();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [refreshUser]);

  return (
    <BadgeCelebrationProvider>
      <StatusBar style="light" />
      <Tabs tabBar={(props) => <ToyTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: t('home') }} />
        <Tabs.Screen name="tasks" options={{ title: t('tasks') }} />
        <Tabs.Screen name="learn" options={{ title: t('learn') }} />
        <Tabs.Screen name="shop" options={{ title: t('shop') }} />
        <Tabs.Screen name="profile" options={{ title: 'אני' }} />
        <Tabs.Screen name="avatar-shop" options={{ href: null, title: t('paidAvatars') }} />
      </Tabs>
    </BadgeCelebrationProvider>
  );
}
