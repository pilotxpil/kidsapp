import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { LearningCategory, LearningPackSummary } from '@kidsapp/shared';
import { LEARNING_CATEGORIES, LEARNING_CATEGORY_ORDER, packDisplaySubtitle, packDisplayTitle } from '@kidsapp/shared';
import { useAuth } from '../../../lib/auth';
import { api } from '../../../lib/api';
import { useFocusLoad } from '../../../hooks/useFocusLoad';
import { useTheme } from '../../../lib/theme-context';
import { c } from '../../../lib/i18n';
import { ScreenCacheKey, readScreenCache, writeScreenCache } from '../../../lib/screen-cache';
import { INK } from '../../../constants/themes';
import { CheckBadge, Coin, EmptyState, KidScreen, ProgressBar, Row, SectionTitle, Sticker, Txt } from '../../../components/ui';
import { KidSkyTitle } from '../../../components/kid/KidSky';
import { ScreenSkeleton } from '../../../components/ScreenSkeleton';

type LearnCache = { packs: LearningPackSummary[]; assignedOnly: boolean };

function PackCard({ pack, onPress }: { pack: LearningPackSummary; onPress: () => void }) {
  const { world } = useTheme();
  const cat = LEARNING_CATEGORIES[pack.category];
  const progress = pack.activityCount ? pack.completedCount / pack.activityCount : 0;
  const sub = packDisplaySubtitle(pack.title);
  return (
    <Sticker onPress={onPress} pad={14} accessibilityLabel={packDisplayTitle(pack.title)} color={pack.completed ? '#EFFAF4' : undefined}>
      <Row gap={12}>
        <View style={{ width: 56, height: 56, borderRadius: 18, borderWidth: 2, borderColor: INK, backgroundColor: world.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={30} align="center" style={{ lineHeight: 36 }}>
            {cat?.icon ?? '📘'}
          </Txt>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt v="title" numberOfLines={2}>
            {packDisplayTitle(pack.title)}
          </Txt>
          {sub ? (
            <Txt v="caption" muted numberOfLines={1}>
              {sub}
            </Txt>
          ) : null}
          <ProgressBar value={progress} height={12} color="#1DBF7F" />
          <Row justify="between">
            <Txt v="tiny" muted num>
              {pack.completedCount}/{pack.activityCount}
            </Txt>
            <Row gap={3}>
              <Coin size={14} />
              <Txt v="tiny" num>
                +{pack.pointsPerActivity}
              </Txt>
            </Row>
          </Row>
        </View>
        {pack.completed ? <CheckBadge size={32} /> : null}
      </Row>
    </Sticker>
  );
}

export default function KidLearnScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const cached = useRef(readScreenCache<LearnCache>(ScreenCacheKey.kidLearn)).current;
  const [packs, setPacks] = useState<LearningPackSummary[]>(cached?.packs ?? []);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [, res] = await Promise.all([refreshUser(), api.getLearningPacks()]);
    setPacks(res.packs);
    writeScreenCache(ScreenCacheKey.kidLearn, { packs: res.packs, assignedOnly: !!res.assignedOnly });
  }, [refreshUser]);
  const ready = useFocusLoad(load, !!user);

  const groups = useMemo(() => {
    const map = new Map<LearningCategory, LearningPackSummary[]>();
    for (const p of packs) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return LEARNING_CATEGORY_ORDER.filter((k) => map.has(k)).map((k) => ({
      key: k,
      label: LEARNING_CATEGORIES[k].label,
      packs: map.get(k)!.sort((a, b) => Number(a.completed) - Number(b.completed)),
    }));
  }, [packs]);

  return (
    <KidScreen
      compactSky
      sky={<KidSkyTitle title={c.kid.learnTitle} sub={c.kid.learnSub} points={user?.points ?? 0} />}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load().catch(() => {});
        setRefreshing(false);
      }}
    >
      {!ready && !packs.length ? (
        <ScreenSkeleton cards={3} />
      ) : packs.length === 0 ? (
        <Sticker>
          <EmptyState title="עוד אין חבילות לימוד" body="ההורים יכולים לבחור לך חבילות במסך הלימוד שלהם." mood="think" />
        </Sticker>
      ) : (
        groups.map((g) => (
          <View key={g.key} style={{ gap: 12 }}>
            <SectionTitle title={g.label} />
            {g.packs.map((p) => (
              <PackCard key={p.id} pack={p} onPress={() => router.push(`/(kid)/learn/${p.id}`)} />
            ))}
          </View>
        ))
      )}
    </KidScreen>
  );
}
