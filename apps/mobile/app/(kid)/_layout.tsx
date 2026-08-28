import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { RtlTabBar } from '../../components/RtlTabBar';
import { t } from '../../lib/i18n';

const TAB_CONTENT_HEIGHT = 56;

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

export default function KidLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => <RtlTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          height: TAB_CONTENT_HEIGHT + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('home'), tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: t('tasks'), tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }}
      />
      <Tabs.Screen
        name="shop"
        options={{ title: t('shop'), tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('profile'), tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tabs>
  );
}
