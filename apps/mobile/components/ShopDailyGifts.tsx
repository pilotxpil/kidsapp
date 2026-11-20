import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import type { ShopFreebies } from '@kidsapp/shared';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { useFocusLoad } from '../hooks/useFocusLoad';
import { useErrorHandler } from '../lib/premium';
import { AvatarSticker, Coin, GiftBox, Row, Sticker, ToyButton, Txt } from './ui';
import { RewardBurst } from './kid/RewardBurst';

/** Daily shop freebies: a few free coins, and sometimes a paid avatar on loan for today. */
export function ShopDailyGifts({ kidId, refreshing }: { kidId: string; refreshing?: boolean }) {
  const { patchUser } = useAuth();
  const onError = useErrorHandler();
  const [freebies, setFreebies] = useState<ShopFreebies | null>(null);
  const [busy, setBusy] = useState<'points' | 'rental' | null>(null);
  const [burst, setBurst] = useState<{ title: string; body?: string; coins?: number } | null>(null);

  const load = useCallback(async () => {
    const res = await api.getShopFreebies(kidId);
    setFreebies(res.freebies);
    if (res.kid) patchUser(res.kid);
  }, [kidId, patchUser]);
  useFocusLoad(load, !!kidId);

  useEffect(() => {
    if (refreshing) void load().catch(() => {});
  }, [refreshing, load]);

  const claimPoints = async () => {
    if (!freebies || freebies.pointsClaimed) return;
    setBusy('points');
    try {
      const res = await api.claimShopPoints(kidId);
      setFreebies(res.freebies);
      patchUser(res.kid);
      setBurst({ title: 'מטבעות חינם!', coins: res.points });
    } catch (e) {
      onError(e);
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
      setBurst({ title: `${res.rental.label} עליך!`, body: 'הדמות שלך עד סוף היום. תיהנו!' });
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  };

  if (!freebies) return null;

  return (
    <>
      <Sticker pad={14} color="#FFF6D6">
        <View style={{ gap: 12 }}>
          <Row gap={10}>
            <GiftBox size={34} />
            <Txt v="title" style={{ flex: 1 }}>
              מתנת היום בחנות
            </Txt>
          </Row>
          <Row justify="between">
            <Row gap={8}>
              <Coin size={26} />
              <Txt v="strong" num>
                {freebies.points} מטבעות חינם
              </Txt>
            </Row>
            {freebies.pointsClaimed ? (
              <Txt v="caption" muted>
                קיבלת היום
              </Txt>
            ) : (
              <ToyButton title="לקחת" size="sm" variant="gold" loading={busy === 'points'} onPress={claimPoints} sound="coin" />
            )}
          </Row>
          {freebies.rental ? (
            <Row justify="between">
              <Row gap={8}>
                <AvatarSticker avatar={freebies.rental.id} size={36} />
                <View>
                  <Txt v="strong">{freebies.rental.label}</Txt>
                  <Txt v="tiny" muted>
                    דמות חינם רק להיום
                  </Txt>
                </View>
              </Row>
              {freebies.rentalClaimed ? (
                <Txt v="caption" muted>
                  שלך עד הלילה
                </Txt>
              ) : (
                <ToyButton title="ללבוש" size="sm" variant="primary" loading={busy === 'rental'} onPress={claimRental} />
              )}
            </Row>
          ) : null}
        </View>
      </Sticker>
      <RewardBurst visible={!!burst} title={burst?.title ?? ''} body={burst?.body} coins={burst?.coins} onClose={() => setBurst(null)} />
    </>
  );
}
