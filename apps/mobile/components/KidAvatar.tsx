import React from 'react';
import {
  Image,
  Platform,
  Text,
  View,
  StyleProp,
  ImageStyle,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { shopAvatarImage } from '../lib/avatar-images';

interface KidAvatarProps {
  avatar: string;
  size: number;
  style?: StyleProp<ImageStyle | TextStyle | ViewStyle>;
}

export function KidAvatar({ avatar, size, style }: KidAvatarProps) {
  const src = shopAvatarImage(avatar);
  const radius = Math.round(size * 0.22);
  if (src) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
            overflow: 'hidden',
            flexShrink: 0,
            backgroundColor: 'transparent',
          },
          style as ViewStyle,
        ]}
      >
        <Image
          source={src}
          pointerEvents="none"
          resizeMode="cover"
          style={[
            { width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%' },
            Platform.OS === 'web'
              ? ({ userSelect: 'none', WebkitUserDrag: 'none' } as ImageStyle)
              : null,
          ]}
          {...(Platform.OS === 'web' ? { draggable: false } : {})}
        />
      </View>
    );
  }
  return (
    <Text
      style={[
        {
          fontSize: size * 0.62,
          width: size,
          height: size,
          lineHeight: size,
          textAlign: 'center',
        },
        style as TextStyle,
      ]}
    >
      {avatar}
    </Text>
  );
}
