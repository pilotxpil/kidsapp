import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../lib/auth';
import { prefetchParentScreens } from '../../lib/prefetch-tabs';
import { initSfx } from '../../lib/sfx';
import { stopBgm } from '../../lib/bgm';
import { c } from '../../lib/i18n';
import { getPendingApprovals, subscribePendingApprovals } from '../../lib/parent-badges';
import { ToyTabBar } from '../../components/ui';

export default function ParentLayout() {
  const { user } = useAuth();
  const [pending, setPending] = useState(getPendingApprovals());

  useEffect(() => {
    void initSfx();
    // Parents get a quiet app: no background music.
    void stopBgm();
  }, []);

  useEffect(() => {
    if (user?.role === 'parent') prefetchParentScreens();
  }, [user?._id, user?.role]);

  useEffect(() => subscribePendingApprovals(setPending), []);

  return (
    <>
      <StatusBar style="dark" />
      <Tabs tabBar={(props) => <ToyTabBar {...props} badges={{ index: pending }} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: c.parent.tabHome }} />
        <Tabs.Screen name="tasks" options={{ title: c.parent.tabTasks }} />
        <Tabs.Screen name="rewards" options={{ title: c.parent.tabRewards }} />
        <Tabs.Screen name="learn" options={{ title: c.parent.tabLearn }} />
        <Tabs.Screen name="kids" options={{ title: c.parent.tabFamily }} />
        <Tabs.Screen name="profile" options={{ href: null, title: c.parent.settings }} />
        <Tabs.Screen name="onboarding" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="kid-history" options={{ href: null }} />
        <Tabs.Screen name="kid-gifts" options={{ href: null }} />
        <Tabs.Screen name="learn-pack-edit" options={{ href: null }} />
      </Tabs>
    </>
  );
}
