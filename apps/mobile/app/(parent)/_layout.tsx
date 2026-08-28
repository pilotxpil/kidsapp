import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { RtlTabBar } from '../../components/RtlTabBar';
import { t } from '../../lib/i18n';

const TAB_CONTENT_HEIGHT = 56;

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function ParentLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => <RtlTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopWidth: 3,
          borderTopColor: colors.borderLight,
          height: TAB_CONTENT_HEIGHT + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('dashboard'), tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: t('manageTasks'), tabBarIcon: ({ focused }) => <TabIcon emoji="📜" focused={focused} /> }}
      />
      <Tabs.Screen
        name="rewards"
        options={{ title: t('manageRewards'), tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} /> }}
      />
      <Tabs.Screen
        name="kids"
        options={{ title: t('manageKids'), tabBarIcon: ({ focused }) => <TabIcon emoji="👨‍🌾" focused={focused} /> }}
      />
    </Tabs>
  );
}
