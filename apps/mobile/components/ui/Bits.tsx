import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../lib/theme-context';
import { CORAL, GOLD, INK, INK_FAINT, INK_SOFT, LINE, MINT, WHITE } from '../../constants/themes';
import { haptic } from '../../lib/haptics';
import { ROW, START } from '../../lib/dir';
import { Txt } from './Txt';
import { Coin, Flame } from './Toys';
import { Piko, type PikoMood } from './Piko';
import { ToyButton } from './ToyButton';
import { Row } from './Layout';
import { KidAvatar } from '../KidAvatar';

export function formatNum(n: number): string {
  return Math.round(n).toLocaleString('he-IL');
}

/** Coin counter chip — the kid's wallet, always ink-outlined. */
export function CoinChip({ points, size = 'md', style }: { points: number; size?: 'sm' | 'md' | 'lg'; style?: StyleProp<ViewStyle> }) {
  const icon = size === 'lg' ? 30 : size === 'md' ? 24 : 18;
  const font = size === 'lg' ? 22 : size === 'md' ? 17 : 14;
  return (
    <View style={[styles.chip, { flexDirection: ROW, paddingVertical: size === 'sm' ? 3 : 5 }, style]}>
      <Coin size={icon} />
      <Txt v="title" size={font} num>
        {formatNum(points)}
      </Txt>
    </View>
  );
}

export function StreakChip({ days, style }: { days: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.chip, { flexDirection: ROW }, style]}>
      <Flame size={22} dim={days === 0} />
      <Txt v="title" size={16} num>
        {days}
      </Txt>
    </View>
  );
}

/** Small rounded label. */
export function Pill({
  label,
  color,
  bg,
  icon,
  style,
}: {
  label: string;
  color?: string;
  bg?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { world } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? world.accentSoft, flexDirection: ROW }, style]}>
      {icon}
      <Txt v="tiny" color={color ?? world.accentDark}>
        {label}
      </Txt>
    </View>
  );
}

/** Chunky progress bar (ink outlined, glossy fill). Animates when the value grows. */
export function ProgressBar({
  value,
  color,
  height = 16,
  track = WHITE,
}: {
  value: number;
  color?: string;
  height?: number;
  track?: string;
}) {
  const { world } = useTheme();
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withSpring(Math.max(0, Math.min(1, value)), { damping: 18, stiffness: 120 });
  }, [value, v]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(v.value * 100, v.value > 0 ? 8 : 0)}%` }));
  return (
    // Track is a ROW so the fill (first child) starts on the physical right.
    <View style={[styles.track, { flexDirection: ROW, height, borderRadius: height, backgroundColor: track }]}>
      <Animated.View
        style={[
          styles.fill,
          { borderRadius: height, backgroundColor: color ?? world.accent },
          fill,
        ]}
      >
        <View style={[styles.gloss, { borderRadius: height }]} />
      </Animated.View>
    </View>
  );
}

/** Level ring around an avatar. */
export function LevelRing({
  progress,
  size = 76,
  stroke = 7,
  color,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const { world } = useTheme();
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={INK} strokeWidth={stroke + 4} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={WHITE} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? GOLD}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Avatar on a round sticker. */
export function AvatarSticker({
  avatar,
  size = 56,
  bg,
  ring = true,
}: {
  avatar: string;
  size?: number;
  bg?: string;
  ring?: boolean;
}) {
  const { world } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg ?? world.accentSoft,
        borderWidth: ring ? 2.5 : 0,
        borderColor: INK,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <KidAvatar avatar={avatar} size={size - (ring ? 5 : 0)} style={{ borderRadius: size / 2 }} />
    </View>
  );
}

/** iOS-style switch drawn as a toy. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  const { world } = useTheme();
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = withSpring(value ? 1 : 0, { damping: 16, stiffness: 300 });
  }, [value, x]);
  // Knob sits on the right when on (RTL "start").
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - x.value) * -20 }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => {
        haptic.select();
        onChange(!value);
      }}
      hitSlop={8}
      style={[styles.toggle, { backgroundColor: value ? world.accent : LINE }]}
    >
      <Animated.View style={[styles.knob, knob]} />
    </Pressable>
  );
}

/** Segmented control (2–4 options). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { world } = useTheme();
  return (
    <View style={[styles.seg, { flexDirection: ROW, backgroundColor: world.paperDeep }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) haptic.select();
              onChange(o.value);
            }}
            style={[styles.segItem, on && styles.segOn]}
          >
            <Txt v="caption" align="center" color={on ? INK : INK_SOFT} style={{ fontSize: 14 }}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Choice chip (selectable). */
export function ChoiceChip({
  label,
  selected,
  onPress,
  lead,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  lead?: React.ReactNode;
}) {
  const { world } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={[
        styles.choice,
        { flexDirection: ROW },
        selected
          ? { backgroundColor: world.accent, borderColor: INK }
          : { backgroundColor: WHITE, borderColor: LINE },
      ]}
    >
      {lead}
      <Txt v="caption" color={selected ? world.onAccent : INK} style={{ fontSize: 14 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function SectionTitle({ title, action, onAction, count }: { title: string; action?: string; onAction?: () => void; count?: number }) {
  const { world } = useTheme();
  return (
    <Row justify="between" style={{ marginTop: 6, marginBottom: 2 }}>
      <Row gap={8}>
        <Txt v="h2">{title}</Txt>
        {count != null && count > 0 ? <CountBadge n={count} /> : null}
      </Row>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Txt v="caption" color={world.accentDark} style={{ fontSize: 14 }}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </Row>
  );
}

export function CountBadge({ n, color = CORAL }: { n: number; color?: string }) {
  return (
    <View style={[styles.count, { backgroundColor: color }]}>
      <Txt v="tiny" color={WHITE} align="center" num>
        {n > 99 ? '99+' : n}
      </Txt>
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={{ height: 1.5, backgroundColor: LINE, marginHorizontal: inset }} />;
}

/** Empty states are invitations: Piko + one line + one action. */
export function EmptyState({
  title,
  body,
  action,
  onAction,
  mood = 'happy',
}: {
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
  mood?: PikoMood;
}) {
  return (
    <View style={styles.empty}>
      <Piko size={84} mood={mood} />
      <Txt v="h2" align="center">
        {title}
      </Txt>
      {body ? (
        <Txt v="body" muted align="center" style={{ maxWidth: 300 }}>
          {body}
        </Txt>
      ) : null}
      {action && onAction ? <ToyButton title={action} onPress={onAction} size="md" style={{ alignSelf: 'center', marginTop: 6 }} /> : null}
    </View>
  );
}

export function Dot({ color = MINT, size = 10 }: { color?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />;
}

export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Txt v="caption" color={INK_FAINT}>
      {children}
    </Txt>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: WHITE,
    borderWidth: 2.5,
    borderColor: INK,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    boxShadow: `0px 3px 0px ${INK}`,
  } as ViewStyle,
  pill: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  track: {
    width: '100%',
    borderWidth: 2.5,
    borderColor: INK,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
  gloss: {
    position: 'absolute',
    top: 2,
    left: 6,
    right: 6,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: INK,
    padding: 2,
    alignItems: START,
    justifyContent: 'center',
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 22,
    backgroundColor: WHITE,
    borderWidth: 2.5,
    borderColor: INK,
  },
  seg: { borderRadius: 16, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  segOn: { backgroundColor: WHITE, borderWidth: 2, borderColor: INK },
  choice: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 2,
  },
  count: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: INK,
  },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 28, paddingHorizontal: 16 },
});
