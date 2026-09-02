import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme-context';
import { RtlTabBar } from '../../components/RtlTabBar';
import { t } from '../../lib/i18n';

const TAB_CONTENT_HEIGHT = 56;

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function ParentLayout() {
  const insets = useSafeAreaInsets();
  const { colors, tabIcons, id: themeId } = useTheme();

  return (
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('dashboard'), tabBarIcon: ({ focused }) => <TabIcon emoji={tabIcons.home} focused={focused} /> }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: t('manageTasks'), tabBarIcon: ({ focused }) => <TabIcon emoji={tabIcons.tasks} focused={focused} /> }}
      />
      <Tabs.Screen
        name="learn"
        options={{ title: t('manageLearning'), tabBarIcon: ({ focused }) => <TabIcon emoji={tabIcons.learn} focused={focused} /> }}
      />
      <Tabs.Screen
        name="rewards"
        options={{ title: t('manageRewards'), tabBarIcon: ({ focused }) => <TabIcon emoji={tabIcons.shop} focused={focused} /> }}
      />
      <Tabs.Screen
        name="kids"
        options={{ title: t('manageKids'), tabBarIcon: ({ focused }) => <TabIcon emoji="👨‍👩‍👧‍👦" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('profile'), tabBarIcon: ({ focused }) => <TabIcon emoji={tabIcons.profile} focused={focused} /> }}
      />
    </Tabs>
  );
}
