import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../constants/theme';
import { RtlTabBar } from '../../components/RtlTabBar';
import { t } from '../../lib/i18n';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function ParentLayout() {
  return (
    <Tabs
      tabBar={(props) => <RtlTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          height: 65,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primaryLight,
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
        options={{ title: t('manageTasks'), tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }}
      />
      <Tabs.Screen
        name="rewards"
        options={{ title: t('manageRewards'), tabBarIcon: ({ focused }) => <TabIcon emoji="🎁" focused={focused} /> }}
      />
      <Tabs.Screen
        name="kids"
        options={{ title: t('manageKids'), tabBarIcon: ({ focused }) => <TabIcon emoji="👶" focused={focused} /> }}
      />
    </Tabs>
  );
}
