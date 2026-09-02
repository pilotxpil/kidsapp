import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import type { TaskCategory } from '@kidsapp/shared';
import { useTheme } from '../../lib/theme-context';
import { getThemeArt, type ThemeTabArtKey } from '../../constants/theme-art';

export type GlyphName =
  | 'home'
  | 'tasks'
  | 'learn'
  | 'shop'
  | 'profile'
  | 'gem'
  | 'streak'
  | 'level'
  | 'check'
  | 'pending'
  | 'house'
  | 'school'
  | 'social'
  | 'hobby'
  | 'sport'
  | 'all'
  | 'swords'
  | 'helmet'
  | 'cart';

interface GlyphProps {
  name: GlyphName;
  size?: number;
  color?: string;
  filled?: boolean;
}

function glyphPath(name: GlyphName): string {
  switch (name) {
    case 'home':
      return 'M12 2.2l2.85 6.05 6.65.72-5.02 4.58 1.4 6.55L12 16.9 6.12 20.1l1.4-6.55-5.02-4.58 6.65-.72z';
    case 'tasks':
      return '';
    case 'learn':
      return 'M4 5.5c2.4-1.2 4.4-1.6 8-1.6s5.6.4 8 1.6v12c-2.4-1-4.4-1.4-8-1.6-3.6.2-5.6.6-8 1.6v-12z';
    case 'shop':
    case 'gem':
      return 'M12 2.2l8.2 7.1-8.2 12.5L3.8 9.3 12 2.2z';
    case 'profile':
      return 'M12 3.2a4.2 4.2 0 110 8.4 4.2 4.2 0 010-8.4zM4.8 21.2c.4-3.8 3.4-6.2 7.2-6.2s6.8 2.4 7.2 6.2';
    case 'streak':
      return 'M12.4 2.4c.2 3.2-1.4 5-3.2 7.1-1.6 1.8-2.6 3.4-2.4 5.7 2.2-1.4 3.4-1.2 3.4-1.2-.6 2.6-2 4.1-4.6 6.4 6.6.2 10.8-3.2 11.2-8.6.3-4.2-2.2-6.6-4.4-9.4z';
    case 'level':
      return 'M12 3.2l2.4 4.8 5.4.6-4.1 4.2 1.2 5.4L12 15.6 7.1 18.2l1.2-5.4-4.1-4.2 5.4-.6z';
    case 'check':
      return 'M4.5 12.4l5 5.2 10-11.2';
    case 'pending':
      return 'M12 4.2a7.8 7.8 0 100 15.6 7.8 7.8 0 000-15.6z';
    case 'house':
      return 'M4 11.2L12 4.4l8 6.8v8.2H4v-8.2z';
    case 'school':
      return 'M4.5 10.2L12 6.2l7.5 4v7.6H4.5V10.2zM8.2 17.8V13h7.6v4.8';
    case 'social':
      return 'M9 8.2a3.2 3.2 0 110 6.4 3.2 3.2 0 010-6.4zM15.4 9.4a2.6 2.6 0 110 5.2 2.6 2.6 0 010-5.2z';
    case 'hobby':
      return 'M7.2 9.2h9.6v5.6H7.2zM5 11.2H3.4v1.6H5M20.6 11.2H19v1.6h1.6';
    case 'sport':
      return 'M7.2 16.8h9.6v2H7.2zM8.2 8.4h7.6l1 8.4H7.2l1-8.4zM12 3.6l1.6 4.4h-3.2L12 3.6z';
    case 'all':
      return 'M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z';
    case 'swords':
      return 'M7 20L16 6l1.6 1.6L8.6 21.6 7 20zM17 20L8 6 6.4 7.6 15.4 21.6 17 20z';
    case 'helmet':
      return 'M5 14c0-4.2 3.1-8 7-8s7 3.8 7 8v2H5v-2z';
    case 'cart':
      return 'M4 6h2.2l1.2 9h10.2l2-7H8';
    default:
      return 'M12 2.2l2.85 6.05 6.65.72-5.02 4.58 1.4 6.55L12 16.9 6.12 20.1l1.4-6.55-5.02-4.58 6.65-.72z';
  }
}

export function ThemeGlyph({ name, size = 22, color, filled = true }: GlyphProps) {
  const { colors } = useTheme();
  const tint = color ?? colors.accent;
  const stroke = filled ? 1.6 : 1.8;

  if (name === 'tasks') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="8.2" fill="none" stroke={tint} strokeWidth={stroke} />
        <Circle cx="12" cy="12" r="4.4" fill="none" stroke={tint} strokeWidth={stroke} />
        <Circle cx="12" cy="12" r="1.6" fill={tint} />
      </Svg>
    );
  }

  if (name === 'pending') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="8" fill="none" stroke={tint} strokeWidth={stroke} />
        <Path d="M12 7.2v5.2l3.4 2" fill="none" stroke={tint} strokeWidth={stroke} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'check') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d={glyphPath('check')}
          fill="none"
          stroke={tint}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (name === 'shop' || name === 'gem') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 2.4l8 6.8-8 12.4-8-12.4L12 2.4z" fill={filled ? tint : 'none'} stroke={tint} strokeWidth={1.4} strokeLinejoin="round" />
        <Path d="M4.2 9.2h15.6M12 2.4v18.8M8 9.2L12 21.2 16 9.2" fill="none" stroke={filled ? colors.bgDeep : tint} strokeWidth={1.1} opacity={0.55} />
      </Svg>
    );
  }

  if (name === 'profile') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="8" r="3.8" fill={filled ? tint : 'none'} stroke={tint} strokeWidth={stroke} />
        <Path
          d="M5 20.2c.5-3.6 3.2-5.8 7-5.8s6.5 2.2 7 5.8"
          fill="none"
          stroke={tint}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (name === 'learn') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M4.2 6.2c2.6-1.2 4.6-1.6 7.8-1.6h.2c3.2 0 5.4.4 8 1.6v11.2c-2.4-1-4.6-1.4-8-1.4s-5.6.4-8 1.4V6.2z"
          fill={filled ? tint : 'none'}
          stroke={tint}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
        <Path d="M12.1 4.8v11.4" stroke={filled ? colors.bgDeep : tint} strokeWidth={1.2} opacity={0.5} />
      </Svg>
    );
  }

  if (name === 'social') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="9" cy="8.2" r="3" fill={filled ? tint : 'none'} stroke={tint} strokeWidth={stroke} />
        <Circle cx="16.2" cy="9.4" r="2.4" fill={filled ? tint : 'none'} stroke={tint} strokeWidth={stroke} />
        <Path d="M4.4 19.6c.4-2.8 2.6-4.6 5.6-4.6 1.2 0 2.3.3 3.2.9" fill="none" stroke={tint} strokeWidth={stroke} strokeLinecap="round" />
        <Path d="M13.6 18.8c.4-1.8 2-3 4-3 2.2 0 3.8 1.2 4.2 3" fill="none" stroke={tint} strokeWidth={stroke} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'swords') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M6 19.5L15.5 6.5l1.8 1.6L8 21z" fill={filled ? tint : 'none'} stroke={tint} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M18 19.5L8.5 6.5 6.7 8.1 16 21z" fill={filled ? tint : 'none'} stroke={tint} strokeWidth={1.6} strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'helmet') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M5 15c0-4.4 3.1-8.2 7-8.2s7 3.8 7 8.2v1.6H5V15z"
          fill={filled ? tint : 'none'}
          stroke={tint}
          strokeWidth={stroke}
        />
        <Path d="M9 16.2h6" stroke={filled ? colors.bgDeep : tint} strokeWidth={1.4} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'cart') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M4 6h2.4l1.4 9.2h10.4L20.6 8H8.2" fill="none" stroke={tint} strokeWidth={stroke} strokeLinejoin="round" />
        <Circle cx="10" cy="19" r="1.5" fill={tint} />
        <Circle cx="17.2" cy="19" r="1.5" fill={tint} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G>
        <Path
          d={glyphPath(name)}
          fill={filled ? tint : 'none'}
          stroke={tint}
          strokeWidth={stroke}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

const TAB_GLYPH: Record<string, GlyphName> = {
  home: 'home',
  tasks: 'tasks',
  learn: 'learn',
  shop: 'shop',
  profile: 'profile',
};

const EMBER_TAB_GLYPH: Record<string, GlyphName> = {
  home: 'house',
  tasks: 'swords',
  learn: 'learn',
  shop: 'cart',
  profile: 'helmet',
};

interface ThemeTabIconProps {
  name: ThemeTabArtKey;
  fallback: string;
  focused: boolean;
}

export function ThemeTabIcon({ name, fallback, focused }: ThemeTabIconProps) {
  const { chrome, colors, id: themeId } = useTheme();
  const art = getThemeArt(themeId);
  const painted = art?.icons?.[name];

  if (painted) {
    const dim = focused ? 26 : 22;
    return (
      <View
        style={[
          styles.tabArtWrap,
          focused && {
            shadowColor: colors.primary,
            shadowOpacity: 0.95,
            shadowRadius: 14,
            elevation: 10,
          },
        ]}
      >
        <Image
          source={painted}
          style={{ width: dim, height: dim, opacity: focused ? 1 : 0.58 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (chrome !== 'vector') {
    return (
      <Text
        style={{
          fontSize: focused ? 24 : 20,
          opacity: focused ? 1 : 0.4,
          transform: [{ scale: focused ? 1.15 : 1 }],
        }}
      >
        {fallback}
      </Text>
    );
  }

  const map = themeId === 'ember' ? EMBER_TAB_GLYPH : TAB_GLYPH;
  const tint = focused ? colors.primary : colors.textMuted;
  const ember = themeId === 'ember';
  return (
    <View
      style={[
        styles.tabWrap,
        ember && styles.tabWrapEmber,
        focused && {
          backgroundColor: `${colors.primary}${ember ? '40' : '2E'}`,
          shadowColor: colors.primary,
          shadowOpacity: ember ? 0.9 : 0.7,
          shadowRadius: 10,
          elevation: 8,
        },
      ]}
    >
      <ThemeGlyph name={map[name]} size={focused ? 24 : 20} color={tint} filled={focused} />
    </View>
  );
}

export const CATEGORY_GLYPH: Record<TaskCategory | 'all', GlyphName> = {
  all: 'all',
  home: 'house',
  school: 'school',
  social: 'social',
  hobby: 'hobby',
  sport: 'sport',
};

export function CategoryGlyph({
  category,
  size = 14,
  color,
}: {
  category: TaskCategory | 'all';
  size?: number;
  color?: string;
}) {
  const { chrome, colors, taskCategoryIcons, allCategoryIcon } = useTheme();
  if (chrome !== 'vector') {
    const emoji = category === 'all' ? allCategoryIcon : taskCategoryIcons[category];
    return <Text style={{ fontSize: size }}>{emoji}</Text>;
  }
  return <ThemeGlyph name={CATEGORY_GLYPH[category]} size={size} color={color ?? colors.accent} />;
}

export function PointsMark({ size = 18 }: { size?: number }) {
  const { chrome, colors, pointsEmoji, id: themeId } = useTheme();
  const gem = getThemeArt(themeId)?.gem;
  if (gem) {
    return <Image source={gem} style={{ width: size + 4, height: size + 4 }} resizeMode="contain" />;
  }
  if (chrome !== 'vector') {
    return <Text style={{ fontSize: size }}>{pointsEmoji}</Text>;
  }
  return <ThemeGlyph name="gem" size={size} color={colors.gold} />;
}

const styles = StyleSheet.create({
  tabWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabWrapEmber: {
    borderRadius: 8,
  },
  tabArtWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
