import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { Task, KidProfile } from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { getThemeArt } from '../constants/theme-art';
import { useTheme } from '../lib/theme-context';
import { useType } from '../lib/typography';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';
import { Button } from './Button';
import { FadeInUp } from './animations/FadeInUp';
import { AnimatedCounter } from './animations/AnimatedCounter';
import { BouncyPressable } from './animations/BouncyPressable';

interface EmberHomeProps {
  displayName: string;
  points: number;
  profile: KidProfile | null;
  tasks: Task[];
  completingId: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onComplete: (task: Task) => void;
}

export function EmberHome({
  displayName,
  points,
  profile,
  tasks,
  completingId,
  refreshing,
  onRefresh,
  onComplete,
}: EmberHomeProps) {
  const router = useRouter();
  const { colors, borderRadius, id: themeId } = useTheme();
  const type = useType();
  const art = getThemeArt(themeId);
  const featured = tasks.find((tk) => tk.completionStatus === 'available') ?? tasks[0];
  const canComplete = featured?.completionStatus === 'available';
  const xpPct =
    profile && profile.xpToNextLevel > 0
      ? Math.min((profile.xpProgress / profile.xpToNextLevel) * 100, 100)
      : 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, width: '100%' },
        header: {
          marginTop: spacing.sm,
          marginBottom: spacing.lg,
          alignItems: 'flex-start',
        },
        greetBlock: { flex: 1, minWidth: 0 },
        hello: {
          color: colors.primaryLight,
          fontSize: 30,
          fontWeight: '800',
          letterSpacing: 0.2,
          textShadowColor: 'rgba(0,0,0,0.75)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 10,
          ...type.display,
        },
        ready: {
          color: colors.text,
          fontSize: 14,
          fontWeight: '600',
          marginTop: 6,
          opacity: 0.92,
          ...type.body,
        },
        gemChip: {
          alignItems: 'center',
          backgroundColor: 'rgba(8,6,4,0.72)',
          borderWidth: 1,
          borderColor: 'rgba(255,138,61,0.5)',
          borderRadius: 999,
          paddingVertical: 6,
          paddingHorizontal: spacing.sm,
          gap: spacing.sm,
          shadowColor: colors.glow,
          shadowOpacity: 0.7,
          shadowRadius: 12,
          elevation: 8,
          flexGrow: 0,
          flexShrink: 0,
        },
        gemImg: { width: 40, height: 40 },
        gemNums: { alignItems: 'flex-end' },
        gemCount: { color: colors.text, fontSize: 20, fontWeight: '800', ...type.display },
        gemLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', ...type.ui },
        panel: {
          backgroundColor: 'rgba(10,7,5,0.72)',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(255,138,61,0.4)',
          padding: spacing.md,
          marginBottom: spacing.md,
          shadowColor: colors.glow,
          shadowOpacity: 0.4,
          shadowRadius: 18,
          elevation: 8,
          overflow: 'hidden',
          width: '100%',
          maxWidth: '100%',
        },
        missionRow: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
        emblem: {
          width: 72,
          height: 64,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,179,0,0.55)',
        },
        emblemImg: { width: '100%', height: '100%' },
        missionText: { flex: 1, minWidth: 0, maxWidth: '100%' },
        missionTitle: { color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 0.6, ...type.ui },
        missionDesc: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 4, ...type.title },
        barTrack: {
          height: 10,
          borderRadius: borderRadius.full,
          backgroundColor: 'rgba(0,0,0,0.5)',
          overflow: 'hidden',
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: 'rgba(255,138,61,0.22)',
        },
        barFill: { height: '100%', borderRadius: borderRadius.full, overflow: 'hidden' },
        xpMeta: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm, ...type.ui },
        fullBtn: { alignSelf: 'stretch', width: '100%' },
        tiles: { gap: spacing.sm, width: '100%', maxWidth: '100%' },
        tile: { width: '100%', maxWidth: '100%' },
        tileArt: { width: '100%', height: 108, marginBottom: spacing.sm },
        tileTitle: { color: colors.text, fontSize: 18, fontWeight: '800', ...type.display },
        tileSub: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm, marginTop: 2, ...type.body },
      }),
    [themeId, colors, borderRadius, type.display, type.body, type.ui, type.title]
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, rtl.scrollContent]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <FadeInUp index={0}>
        <View style={[styles.header, rtl.headerSplit]}>
          <View style={[styles.gemChip, rtl.rowInline]}>
            {art?.gem ? <Image source={art.gem} style={styles.gemImg} resizeMode="contain" /> : null}
            <View style={styles.gemNums}>
              <AnimatedCounter value={points} style={styles.gemCount} />
              <Text style={[styles.gemLabel, rtl.text]}>{t('emberFireStones')}</Text>
            </View>
          </View>
          <View style={styles.greetBlock}>
            <Text style={[styles.hello, rtl.text]} numberOfLines={2}>
              {t('hello')}, {displayName}!
            </Text>
            <Text style={[styles.ready, rtl.text]}>{t('emberReady')}</Text>
          </View>
        </View>
      </FadeInUp>

      <FadeInUp index={1}>
        <View style={styles.panel}>
          <View style={[styles.missionRow, rtl.row]}>
            <View style={styles.emblem}>
              {art?.map ? <Image source={art.map} style={styles.emblemImg} resizeMode="cover" /> : null}
            </View>
            <View style={styles.missionText}>
              <Text style={[styles.missionTitle, rtl.text]}>{t('emberDailyMission')}</Text>
              <Text style={[styles.missionDesc, rtl.text]} numberOfLines={2}>
                {featured?.title ?? t('noTasks')}
              </Text>
            </View>
          </View>
          {profile ? (
            <>
              <Text style={[styles.xpMeta, rtl.text]}>
                {t('level')} {profile.level} · {profile.xpProgress}/{profile.xpToNextLevel} XP
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${xpPct}%` }]}>
                  <LinearGradient
                    colors={[colors.primaryLight, colors.primary]}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              </View>
            </>
          ) : null}
          {canComplete && featured ? (
            <Button
              title={t('continueMission')}
              onPress={() => onComplete(featured)}
              loading={completingId === featured._id}
              style={styles.fullBtn}
            />
          ) : (
            <Button title={t('toTasks')} onPress={() => router.push('/(kid)/tasks')} style={styles.fullBtn} />
          )}
        </View>
      </FadeInUp>

      <FadeInUp index={2}>
        <View style={styles.tiles}>
          <BouncyPressable style={[styles.panel, styles.tile]} onPress={() => router.push('/(kid)/shop')}>
            {art?.chest ? <Image source={art.chest} style={styles.tileArt} resizeMode="contain" /> : null}
            <Text style={[styles.tileTitle, rtl.text]} numberOfLines={1}>
              {t('shop')}
            </Text>
            <Text style={[styles.tileSub, rtl.text]} numberOfLines={2}>
              {t('upgradeCharacter')}
            </Text>
            <Button title={t('toShop')} onPress={() => router.push('/(kid)/shop')} style={styles.fullBtn} />
          </BouncyPressable>
          <BouncyPressable style={[styles.panel, styles.tile]} onPress={() => router.push('/(kid)/tasks')}>
            {art?.map ? <Image source={art.map} style={styles.tileArt} resizeMode="contain" /> : null}
            <Text style={[styles.tileTitle, rtl.text]} numberOfLines={1}>
              {t('tasks')}
            </Text>
            <Text style={[styles.tileSub, rtl.text]} numberOfLines={2}>
              {t('pickNewMission')}
            </Text>
            <Button title={t('toTasks')} onPress={() => router.push('/(kid)/tasks')} style={styles.fullBtn} />
          </BouncyPressable>
        </View>
      </FadeInUp>
    </ScrollView>
  );
}
