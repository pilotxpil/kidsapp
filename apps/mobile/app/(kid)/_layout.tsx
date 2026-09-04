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
import { resetKidGiftDismissals } from '../../lib/kid-gift-dismiss';
import { BadgeCelebrationProvider } from '../../lib/badge-celebration';

const TAB_CONTENT_HEIGHT = 64;

export default function KidLayout() {
  const insets = useSafeAreaInsets();
  const { colors, tabIcons, id: themeId } = useTheme();
  const { refreshUser } = useAuth();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    void startBgm();
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
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: themeId === 'ember' ? 'rgba(6,4,4,0.96)' : colors.bgCard,
          borderTopWidth: themeId === 'ember' ? 1 : 3,
          borderTopColor: colors.primary,
          height: TAB_CONTENT_HEIGHT + insets.bottom,
          paddingTop: themeId === 'ember' ? 4 : 6,
          paddingBottom: insets.bottom,
          overflow: 'hidden',
          shadowColor: colors.glow,
          shadowOpacity: themeId === 'ember' ? 0.8 : 0.45,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -4 },
          elevation: 16,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarItemStyle: {
          paddingVertical: 0,
          overflow: 'hidden',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          includeFontPadding: false,
          ...(themeId === 'ember' ? { fontFamily: Heebo.semibold, fontWeight: 'normal' as const } : {}),
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
