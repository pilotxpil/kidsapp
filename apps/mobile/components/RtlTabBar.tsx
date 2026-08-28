import React from 'react';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, View } from 'react-native';

/**
 * Bottom tab bar with Home/Dashboard on the physical right (Hebrew RTL).
 * tabBarStyle.flexDirection does not affect the inner tab row — reverse routes instead.
 */
export function RtlTabBar(props: BottomTabBarProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ direction: 'rtl' }}>
        <BottomTabBar {...props} />
      </View>
    );
  }

  const { state } = props;
  const reversedState = {
    ...state,
    routes: [...state.routes].reverse(),
    index: state.routes.length - 1 - state.index,
  };

  return <BottomTabBar {...props} state={reversedState} />;
}
