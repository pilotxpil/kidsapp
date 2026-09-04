import React from 'react';
import { BottomTabBar, type BottomTabBarProps } from 'expo-router/js-tabs';

/**
 * Bottom tab bar with Home/Dashboard on the physical right (Hebrew RTL).
 * tabBarStyle.flexDirection does not affect the inner tab row — reverse routes instead.
 */
export function RtlTabBar(props: BottomTabBarProps) {
  const { state } = props;
  const reversedState = {
    ...state,
    routes: [...state.routes].reverse(),
    index: state.routes.length - 1 - state.index,
  };

  return <BottomTabBar {...props} state={reversedState} />;
}
