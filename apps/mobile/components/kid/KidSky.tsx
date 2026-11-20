import React from 'react';
import { Pressable, View } from 'react-native';
import { calculateLevel } from '@kidsapp/shared';
import { useAuth } from '../../lib/auth';
import { c } from '../../lib/i18n';
import { WHITE } from '../../constants/themes';
import { AvatarSticker, CoinChip, LevelRing, Row, StreakChip, Txt } from '../ui';

/** Header painted into the sky: avatar in its level ring, name, coins and streak. */
export function KidSkyHeader({
  points,
  streak,
  xp,
  onAvatar,
  line,
}: {
  points: number;
  streak: number;
  xp: number;
  onAvatar?: () => void;
  line?: string;
}) {
  const { user } = useAuth();
  const lvl = calculateLevel(xp);
  const avatar = user?.rentalAvatar || user?.avatar || '🙂';
  return (
    <View style={{ gap: 12 }}>
      <Row justify="between" align="center">
        <Row gap={12} style={{ flex: 1 }}>
          <Pressable onPress={onAvatar} accessibilityRole="button" accessibilityLabel={c.kid.changeAvatar}>
            <LevelRing progress={lvl.xpInLevel / lvl.xpToNext} size={78}>
              <AvatarSticker avatar={avatar} size={58} bg={WHITE} />
            </LevelRing>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Txt v="h1" color={WHITE} numberOfLines={1}>
              {c.kid.hello.replace('{name}', user?.displayName ?? '')}
            </Txt>
            <Txt v="strong" color={WHITE} style={{ opacity: 0.92 }}>
              {c.kid.level.replace('{n}', String(lvl.level))}
            </Txt>
          </View>
        </Row>
        <View style={{ gap: 8, alignItems: 'center' }}>
          <CoinChip points={points} />
          <StreakChip days={streak} />
        </View>
      </Row>
      {line ? (
        <Txt v="title" color={WHITE} style={{ opacity: 0.95 }}>
          {line}
        </Txt>
      ) : null}
    </View>
  );
}

/** Compact sky header for secondary kid tabs. */
export function KidSkyTitle({ title, sub, points }: { title: string; sub?: string; points?: number }) {
  return (
    <Row justify="between" align="center">
      <View style={{ flex: 1 }}>
        <Txt v="display" color={WHITE}>
          {title}
        </Txt>
        {sub ? (
          <Txt v="strong" color={WHITE} style={{ opacity: 0.92 }}>
            {sub}
          </Txt>
        ) : null}
      </View>
      {points != null ? <CoinChip points={points} /> : null}
    </Row>
  );
}
