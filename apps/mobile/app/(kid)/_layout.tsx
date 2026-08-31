import { Tabs } from 'expo-router';
import { Text, AppState } from 'react-native';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme-context';
import { RtlTabBar } from '../../components/RtlTabBar';
import { t } from '../../lib/i18n';
import { startBgm, stopBgm, resumeBgm, pauseBgm } from '../../lib/bgm';
import { BadgeCelebrationProvider } from '../../lib/badge-celebration';

const TAB_CONTENT_HEIGHT = 56;

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 24 : 20, opacity: focused ? 1 : 0.4, transform: [{ scale: focused ? 1.15 : 1 }] }}>
      {emoji}
    </Text>
  );
}

export default function KidLayout() {
  const insets = useSafeAreaInsets();
  const { colors, tabIcons, id: themeId } = useTheme();
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
        void resumeBgm();
      } else if (next.match(/inactive|background/)) {
        void pauseBgm();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  return (
    <BadgeCelebrationProvider>
    <Tabs
      key={themeId}
      tabBar={(props) => <RtlTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopWidth: 3,
          borderTopColor: colors.primary,
          height: TAB_CONTENT_HEIGHT + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
          shadowColor: colors.glow,
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 16,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('home'), tabBarIcon: ({ focused }) => <TabIcon emoji={tabIcons.home} focused={focused} /> }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: t('tasks'), tabBarIcon: ({ focused }) => <TabIcon emoji={tabIcons.tasks} focused={focused} /> }}
      />
      <Tabs.Screen
        name="shop"
        options={{ title: t('shop'), tabBarIcon: ({ focused }) => <TabIcon emoji={tabIcons.shop} focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('profile'), tabBarIcon: ({ focused }) => <TabIcon emoji={tabIcons.profile} focused={focused} /> }}
      />
    </Tabs>
    </BadgeCelebrationProvider>
  );
}
