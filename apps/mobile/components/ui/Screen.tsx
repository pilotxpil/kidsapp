import React, { useCallback, useState } from 'react';
import { setStatusBarStyle } from 'expo-status-bar';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, G, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme-context';
import { INK, WHITE, type Scenery } from '../../constants/themes';
import { Txt } from './Txt';
import { Ambience } from './Ambience';
import { Row } from './Layout';
import { ToyButton } from './ToyButton';

export const TAB_BAR_SPACE = 104;
export const GUTTER = 16;

/** Decorations painted into the world header — one motif per world, kept sparse. */
function SceneryDecor({ scenery }: { scenery: Scenery }) {
  const w = 'rgba(255,255,255,';
  switch (scenery) {
    case 'waves':
      return (
        <G>
          <Circle cx={38} cy={46} r={9} fill="none" stroke={`${w}0.55)`} strokeWidth={3} />
          <Circle cx={58} cy={26} r={5} fill="none" stroke={`${w}0.45)`} strokeWidth={2.5} />
          <Circle cx={350} cy={60} r={12} fill="none" stroke={`${w}0.4)`} strokeWidth={3} />
          <Circle cx={372} cy={34} r={6} fill="none" stroke={`${w}0.5)`} strokeWidth={2.5} />
          <Circle cx={250} cy={22} r={4} fill={`${w}0.5)`} />
        </G>
      );
    case 'lava':
      return (
        <G>
          <Path d="M30 70 l6 -14 l6 14 z" fill={`${w}0.35)`} />
          <Circle cx={70} cy={30} r={4} fill="#FFE27A" />
          <Circle cx={330} cy={24} r={5} fill="#FFE27A" />
          <Circle cx={360} cy={58} r={3} fill={`${w}0.7)`} />
          <Circle cx={210} cy={18} r={3} fill={`${w}0.6)`} />
          <Path d="M365 80 q8 -18 16 0 z" fill={`${w}0.3)`} />
        </G>
      );
    case 'leaves':
      return (
        <G>
          <Path d="M20 30 q26 -8 40 14 q-26 8 -40 -14z" fill={`${w}0.32)`} />
          <Path d="M340 20 q30 0 44 24 q-30 2 -44 -24z" fill={`${w}0.28)`} />
          <Path d="M300 70 q14 -10 30 0 q-14 10 -30 0z" fill={`${w}0.3)`} />
          <Circle cx={90} cy={70} r={4} fill="#FFE27A" />
        </G>
      );
    case 'stars':
      return (
        <G>
          {[
            [30, 30, 2.5],
            [80, 60, 1.8],
            [140, 20, 2],
            [230, 40, 1.6],
            [300, 18, 2.4],
            [360, 50, 2],
            [385, 22, 1.5],
            [190, 72, 1.5],
          ].map(([x, y, r], i) => (
            <Circle key={i} cx={x} cy={y} r={r} fill={WHITE} opacity={0.85} />
          ))}
          <Circle cx={352} cy={86} r={14} fill="#FFC233" stroke={INK} strokeWidth={2.5} />
          <Path d="M334 88 q18 -10 36 -4" stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'sprinkles':
      return (
        <G>
          {[
            [30, 30, 20, '#FFF27A'],
            [70, 64, -30, '#7AE7FF'],
            [120, 24, 60, WHITE],
            [300, 30, -20, '#7AE7FF'],
            [350, 64, 40, '#FFF27A'],
            [380, 24, -60, WHITE],
          ].map(([x, y, a, c], i) => (
            <Rect
              key={i}
              x={Number(x)}
              y={Number(y)}
              width={14}
              height={5}
              rx={2.5}
              fill={String(c)}
              transform={`rotate(${a} ${x} ${y})`}
            />
          ))}
        </G>
      );
  }
}

function edgePath(scenery: Scenery): string {
  switch (scenery) {
    case 'waves':
      return 'M0 18 Q25 4 50 18 T100 18 T150 18 T200 18 T250 18 T300 18 T350 18 T400 18 V40 H0Z';
    case 'lava':
      return 'M0 14 H40 Q48 14 48 24 Q48 32 56 32 Q64 32 64 22 V14 H170 Q178 14 178 26 Q178 36 188 36 Q198 36 198 26 V14 H300 Q306 14 306 20 Q306 28 314 28 Q322 28 322 20 V14 H400 V40 H0Z';
    case 'leaves':
      return 'M0 22 Q20 4 40 22 Q60 6 80 22 Q100 8 120 22 Q140 2 160 22 Q180 8 200 22 Q220 4 240 22 Q260 8 280 22 Q300 2 320 22 Q340 8 360 22 Q380 4 400 22 V40 H0Z';
    case 'stars':
      return 'M0 26 Q100 6 200 20 T400 14 V40 H0Z';
    case 'sprinkles':
      return 'M0 20 Q12.5 6 25 20 Q37.5 6 50 20 Q62.5 6 75 20 Q87.5 6 100 20 Q112.5 6 125 20 Q137.5 6 150 20 Q162.5 6 175 20 Q187.5 6 200 20 Q212.5 6 225 20 Q237.5 6 250 20 Q262.5 6 275 20 Q287.5 6 300 20 Q312.5 6 325 20 Q337.5 6 350 20 Q362.5 6 375 20 Q387.5 6 400 20 V40 H0Z';
  }
}

/** Status bar icons follow the focused screen: light over painted skies, dark on paper. */
export function useStatusBar(style: 'light' | 'dark') {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style, true);
    }, [style])
  );
}

/** The painted sky band at the top of every kid screen. */
export function WorldSky({ children, compact, ambience = true }: { children?: React.ReactNode; compact?: boolean; ambience?: boolean }) {
  const { world } = useTheme();
  const insets = useSafeAreaInsets();
  const [box, setBox] = useState({ w: 0, h: 0 });
  useStatusBar('light');
  return (
    <View
      style={{ paddingTop: insets.top + (compact ? 8 : 12) }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (Math.abs(width - box.w) > 1 || Math.abs(height - box.h) > 1) setBox({ w: width, h: height });
      }}
    >
      <LinearGradient colors={[world.sky[0], world.sky[1]]} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice">
        <SceneryDecor scenery={world.scenery} />
      </Svg>
      {ambience ? <Ambience kind={world.scenery} width={box.w} height={box.h} count={compact ? 7 : 11} /> : null}
      <View style={{ paddingHorizontal: GUTTER, paddingBottom: compact ? 30 : 40 }}>{children}</View>
      <Svg
        width="100%"
        height={26}
        viewBox="0 0 400 40"
        preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: -1, left: 0, right: 0 }}
      >
        <Path d={edgePath(world.scenery)} fill={world.paper} />
      </Svg>
    </View>
  );
}

interface KidScreenProps {
  sky?: React.ReactNode;
  compactSky?: boolean;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Leave room for the floating tab bar. */
  tabs?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  overlay?: React.ReactNode;
}

/** Kid screen: painted world sky + scrolling paper. */
export function KidScreen({ sky, compactSky, children, refreshing, onRefresh, tabs = true, contentStyle, overlay }: KidScreenProps) {
  const { world } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: world.paper }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: (tabs ? TAB_BAR_SPACE : 32) + insets.bottom }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={WHITE} colors={[world.accent]} />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <WorldSky compact={compactSky}>{sky}</WorldSky>
        <View style={[{ paddingHorizontal: GUTTER, gap: 14, marginTop: -6 }, contentStyle]}>{children}</View>
      </ScrollView>
      {overlay}
    </View>
  );
}

interface CalmScreenProps {
  title: string;
  subtitle?: string;
  /** Element on the physical left of the header (e.g. add button). */
  action?: React.ReactNode;
  back?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  tabs?: boolean;
  scroll?: boolean;
  overlay?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Parent screen: quiet paper, clear title, content in calm stickers. */
export function CalmScreen({
  title,
  subtitle,
  action,
  back,
  onBack,
  children,
  refreshing,
  onRefresh,
  tabs = true,
  scroll = true,
  overlay,
  contentStyle,
}: CalmScreenProps) {
  const { world } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  useStatusBar('dark');
  const header = (
    <View style={{ paddingTop: insets.top + 10, paddingHorizontal: GUTTER, paddingBottom: 12 }}>
      <Row justify="between" align="center" gap={10}>
        <Row gap={10} style={{ flex: 1 }}>
          {back ? (
            <ToyButton
              icon="back"
              variant="secondary"
              size="sm"
              accessibilityLabel="חזרה"
              onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <Txt v="h1" numberOfLines={1}>
              {title}
            </Txt>
            {subtitle ? (
              <Txt v="caption" muted numberOfLines={2}>
                {subtitle}
              </Txt>
            ) : null}
          </View>
        </Row>
        {action}
      </Row>
    </View>
  );

  const body = (
    <View style={[{ paddingHorizontal: GUTTER, gap: 14 }, contentStyle]}>{children}</View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: world.paper }}>
      {header}
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: (tabs ? TAB_BAR_SPACE : 32) + insets.bottom, paddingTop: 2 }}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={world.accent} colors={[world.accent]} />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}
      {overlay}
    </View>
  );
}
