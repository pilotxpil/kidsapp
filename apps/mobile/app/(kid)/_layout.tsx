import { Tabs } from 'expo-router';
import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme-context';
import { Heebo } from '../../lib/typography';
import { RtlTabBar } from '../../components/RtlTabBar';
import { ThemeTabIcon } from '../../components/icons/ThemeGlyph';
import { t } from '../../lib/i18n';
import { startBgm, stopBgm, resumeBgm, pauseBgm } from '../../lib/bgm';
import { initSfx, playSfx } from '../../lib/sfx';
import { resetKidGiftDismissals } from '../../lib/kid-gift-dismiss';
import { prefetchKidScreens } from '../../lib/prefetch-tabs';
import { BadgeCelebrationProvider } from '../../lib/badge-celebration';
import { toBoxShadow } from '../../lib/shadow';

const TAB_CONTENT_HEIGHT = 64;
const EMBER_TAB_HEIGHT = 70;

export default function KidLayout() {
  const insets = useSafeAreaInsets();
  const { colors, tabIcons, id: themeId } = useTheme();
  const { user, refreshUser } = useAuth();
  const appState = useRef(AppState.currentState);
  const ember = themeId === 'ember';
  const voxel = themeId === 'minecraft';
  const paintedTabs = ember || voxel;
  const tabBody = paintedTabs ? EMBER_TAB_HEIGHT : TAB_CONTENT_HEIGHT;

  useEffect(() => {
    void initSfx();
    void startBgm(themeId);
  }, [themeId]);

  useEffect(() => {
    if (user?.role === 'kid' && user._id) prefetchKidScreens(user._id);
  }, [user?._id, user?.role]);

  useEffect(() => {
    return () => {
      void stopBgm();
    };
  }, []);

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
    <Tabs
      key={themeId}
      tabBar={(props) => <RtlTabBar {...props} />}
      screenListeners={{
        tabPress: () => {
          playSfx('whoosh');
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: paintedTabs
            ? themeId === 'minecraft'
              ? 'rgba(8,14,6,0.96)'
              : 'rgba(6,4,4,0.96)'
            : colors.bgCard,
          borderTopWidth: paintedTabs ? 1 : 3,
          borderTopColor: colors.primary,
          height: tabBody + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
          overflow: paintedTabs ? 'visible' : 'hidden',
          boxShadow: toBoxShadow({
            color: colors.glow,
            offset: { width: 0, height: -4 },
            opacity: paintedTabs ? 0.8 : 0.45,
            radius: 14,
          }),
          elevation: 16,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIconStyle: paintedTabs ? { width: 44, height: 38 } : undefined,
        tabBarItemStyle: {
          paddingVertical: 0,
          overflow: paintedTabs ? 'visible' : 'hidden',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          includeFontPadding: false,
          ...(paintedTabs ? { fontFamily: Heebo.semibold, fontWeight: 'normal' as const } : {}),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ focused }) => <ThemeTabIcon name="home" fallback={tabIcons.home} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t('tasks'),
          tabBarIcon: ({ focused }) => <ThemeTabIcon name="tasks" fallback={tabIcons.tasks} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: t('learn'),
          tabBarIcon: ({ focused }) => <ThemeTabIcon name="learn" fallback={tabIcons.learn} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: t('shop'),
          tabBarIcon: ({ focused }) => <ThemeTabIcon name="shop" fallback={tabIcons.shop} focused={focused} />,
        }}
      />
      <Tabs.Screen name="avatar-shop" options={{ href: null, title: t('paidAvatars') }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ focused }) => <ThemeTabIcon name="profile" fallback={tabIcons.profile} focused={focused} />,
        }}
      />
    </Tabs>
    </BadgeCelebrationProvider>
  );
}
