import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import type { ShopFreebies } from '@kidsapp/shared';
import { Card } from './Card';
import { Button } from './Button';
import { KidAvatar } from './KidAvatar';
import { Celebration } from './Celebration';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { useFocusLoad } from '../hooks/useFocusLoad';
import { useTheme } from '../lib/theme-context';
import { spacing } from '../constants/theme';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';
import { playSfx } from '../lib/sfx';

export function ShopDailyGifts({ kidId, refreshing }: { kidId: string; refreshing?: boolean }) {
  const { patchUser } = useAuth();
  const { colors, pointsEmoji, id: themeId, sfx } = useTheme();
  const [freebies, setFreebies] = useState<ShopFreebies | null>(null);
  const [busy, setBusy] = useState<'points' | 'rental' | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateMsg, setCelebrateMsg] = useState('');
  const [celebrateKind, setCelebrateKind] = useState<'points' | 'rental'>('rental');

  const pointsWord = themeId === 'ember' ? t('emberFireStones') : pointsEmoji;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.sm, paddingVertical: 10, paddingHorizontal: spacing.sm + 4 },
        title: {
          color: colors.text,
          fontSize: 15,
          fontWeight: '800',
          writingDirection: 'rtl',
          marginBottom: spacing.xs,
        },
        row: { marginTop: spacing.xs, gap: spacing.sm, alignItems: 'center' },
        copy: { flex: 1, alignItems: 'flex-end' },
        label: { color: colors.text, fontSize: 14, fontWeight: '700', writingDirection: 'rtl' },
        hint: { color: colors.textMuted, fontSize: 11, marginTop: 2, writingDirection: 'rtl' },
        done: { color: colors.gold, fontSize: 13, fontWeight: '700', writingDirection: 'rtl' },
        btn: { minWidth: 108 },
      }),
    [themeId, colors]
  );

  const load = useCallback(async () => {
    const res = await api.getShopFreebies(kidId);
    setFreebies(res.freebies);
    if (res.kid) patchUser(res.kid);
  }, [kidId, patchUser]);

  useFocusLoad(load, !!kidId);

  useEffect(() => {
    if (refreshing) void load();
  }, [refreshing, load]);

  const claimPoints = async () => {
    if (!freebies || freebies.pointsClaimed) return;
    setBusy('points');
    try {
      const res = await api.claimShopPoints(kidId);
      setFreebies(res.freebies);
      patchUser(res.kid);
      setCelebrateKind('points');
      setCelebrateMsg(`+${res.points}`);
      setCelebrate(true);
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
      playSfx('error');
    } finally {
      setBusy(null);
    }
  };

  const claimRental = async () => {
    if (!freebies?.rental || freebies.rentalClaimed) return;
    setBusy('rental');
    try {
      const res = await api.claimShopRental(kidId);
      setFreebies(res.freebies);
      patchUser(res.kid);
      setCelebrateKind('rental');
      setCelebrateMsg(t('shopDailyAvatarDone'));
      setCelebrate(true);
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
      playSfx('error');
    } finally {
      setBusy(null);
    }
  };

  if (!freebies) return null;

  const waiting = !freebies.pointsClaimed || (freebies.rental && !freebies.rentalClaimed);

  return (
    <>
      <Card style={styles.card} glow={!!waiting}>
        <Text style={styles.title}>{t('shopDailyGift')}</Text>

        <View style={[rtl.headerSplit, styles.row]}>
          {freebies.pointsClaimed ? (
            <Text style={styles.done}>
              {t('shopDailyPointsDone').replace('{n}', String(freebies.points))}
            </Text>
          ) : (
            <Button
              title={t('shopDailyPointsClaim').replace('{n}', String(freebies.points))}
              onPress={claimPoints}
              compact
              loading={busy === 'points'}
              disabled={busy !== null}
              style={styles.btn}
            />
          )}
          <View style={styles.copy}>
            <Text style={styles.label}>🎁 {t('shopDailyPoints')}</Text>
            <Text style={styles.hint}>{pointsWord}</Text>
          </View>
        </View>

        {freebies.rental ? (
          <View style={[rtl.headerSplit, styles.row]}>
            {freebies.rentalClaimed ? (
              <Text style={styles.done}>{t('shopDailyAvatarDone')}</Text>
            ) : (
              <Button
                title={t('shopDailyAvatarClaim')}
                onPress={claimRental}
                compact
                variant="secondary"
                loading={busy === 'rental'}
                disabled={busy !== null}
                style={styles.btn}
              />
            )}
            <View style={[rtl.rowInline, { flex: 1, justifyContent: 'flex-end', gap: spacing.sm }]}>
              <View style={styles.copy}>
                <Text style={styles.label}>{freebies.rental.label}</Text>
                <Text style={styles.hint}>{t('shopDailyAvatarHint')}</Text>
              </View>
              <KidAvatar avatar={freebies.rental.id} size={40} />
            </View>
          </View>
        ) : null}
      </Card>
      <Celebration
        visible={celebrate}
        sfx={celebrateKind === 'points' ? 'cheer' : sfx}
        kicker={celebrateKind === 'points' ? t('wow') : undefined}
        icon={celebrateKind === 'points' ? '🎉' : undefined}
        huge={celebrateKind === 'points'}
        confettiCount={celebrateKind === 'points' ? 72 : 48}
        message={celebrateMsg}
        onDone={() => setCelebrate(false)}
      />
    </>
  );
}
