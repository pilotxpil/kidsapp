import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme-context';
import { INK, INK_SOFT, WHITE } from '../../constants/themes';
import { ROW } from '../../lib/dir';
import { haptic } from '../../lib/haptics';
import { playSfx } from '../../lib/sfx';
import { Txt } from './Txt';
import { Icon, type IconName } from './Icon';
import { CountBadge } from './Bits';

const ROUTE_ICONS: Record<string, IconName> = {
  index: 'home',
  tasks: 'tasks',
  learn: 'learn',
  shop: 'shop',
  rewards: 'gift',
  kids: 'users',
  profile: 'user',
  settings: 'settings',
};

function TabItem({
  focused,
  label,
  icon,
  badge,
  onPress,
}: {
  focused: boolean;
  label: string;
  icon: IconName;
  badge?: number;
  onPress: () => void;
}) {
  const { world } = useTheme();
  const lift = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    lift.value = withSpring(focused ? 1 : 0, { damping: 13, stiffness: 260 });
  }, [focused, lift]);
  const blob = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * lift.value }, { scale: 0.9 + 0.1 * lift.value }],
  }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.item}
    >
      <Animated.View
        style={[
          styles.blob,
          focused
            ? { backgroundColor: world.accent, borderColor: INK, boxShadow: `0px 3px 0px ${INK}` }
            : { backgroundColor: 'transparent', borderColor: 'transparent' },
          blob,
        ]}
      >
        <Icon name={icon} size={24} color={focused ? world.onAccent : INK_SOFT} stroke={focused ? 2.6 : 2.2} />
        {badge ? (
          <View style={styles.badge}>
            <CountBadge n={badge} />
          </View>
        ) : null}
      </Animated.View>
      <Txt v="tiny" align="center" color={focused ? INK : INK_SOFT} numberOfLines={1} style={{ fontSize: 11.5 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** Floating toy tab bar. Routes render right→left (first route on the physical right). */
export function ToyTabBar({ state, descriptors, navigation, badges }: BottomTabBarProps & { badges?: Record<string, number> }) {
  const insets = useSafeAreaInsets();
  const activeOpts = descriptors[state.routes[state.index].key]?.options as { tabBarStyle?: { display?: string } };
  if (activeOpts?.tabBarStyle?.display === 'none') return null;
  const visible = state.routes.filter((r) => {
    const o = descriptors[r.key]?.options as { href?: unknown; tabBarItemStyle?: { display?: string } };
    return o?.href !== null && o?.tabBarItemStyle?.display !== 'none';
  });
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.bar, { flexDirection: ROW }]}>
        {visible.map((route) => {
          const index = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === index;
          const opts = descriptors[route.key].options;
          const label = (opts.title ?? route.name) as string;
          return (
            <TabItem
              key={route.key}
              focused={focused}
              label={label}
              icon={ROUTE_ICONS[route.name] ?? 'star'}
              badge={badges?.[route.name]}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  haptic.select();
                  playSfx('whoosh', { volume: 0.5 });
                  navigation.navigate(route.name, route.params);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  bar: {
    backgroundColor: WHITE,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: INK,
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
    boxShadow: `0px 5px 0px ${INK}`,
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  blob: {
    width: 50,
    height: 38,
    borderRadius: 14,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { position: 'absolute', top: -8, right: -10 },
});
