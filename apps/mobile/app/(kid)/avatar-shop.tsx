import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { CosmeticItem } from '@kidsapp/shared';
import { FREE_AVATAR_IDS } from '@kidsapp/shared';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { useTheme } from '../../lib/theme-context';
import { c } from '../../lib/i18n';
import { useErrorHandler } from '../../lib/premium';
import { haptic } from '../../lib/haptics';
import { INK, MINT, WHITE } from '../../constants/themes';
import { ROW } from '../../lib/dir';
import { AvatarSticker, Coin, KidScreen, Row, SectionTitle, Sheet, ToyButton, Txt, formatNum, Icon } from '../../components/ui';
import { KidSkyTitle } from '../../components/kid/KidSky';
import { RewardBurst } from '../../components/kid/RewardBurst';
import { useRouter } from 'expo-router';

function AvatarCell({ item, owned, wearing, onPress }: { item: CosmeticItem; owned: boolean; wearing: boolean; onPress: () => void }) {
  const { world } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.cell} accessibilityRole="button" accessibilityLabel={item.label}>
      <View style={[styles.frame, wearing && { borderColor: MINT, borderWidth: 3.5 }]}>
        <AvatarSticker avatar={item.id} size={76} bg={world.accentSoft} ring={false} />
        {wearing ? (
          <View style={styles.wearing}>
            <Icon name="check" size={14} color={WHITE} stroke={3.2} />
          </View>
        ) : null}
      </View>
      <Txt v="caption" align="center" numberOfLines={1}>
        {item.label}
      </Txt>
      {!owned ? (
        <Row gap={3} justify="center">
          <Coin size={14} />
          <Txt v="tiny" num>
            {formatNum(item.cost)}
          </Txt>
        </Row>
      ) : null}
    </Pressable>
  );
}

export default function AvatarShopScreen() {
  const { user, patchUser, refreshUser } = useAuth();
  const router = useRouter();
  const onError = useErrorHandler();
  const [items, setItems] = useState<CosmeticItem[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [preview, setPreview] = useState<CosmeticItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const load = useCallback(async () => {
    const [, cos] = await Promise.all([refreshUser(), api.getCosmetics().catch(() => null)]);
    if (cos) {
      setItems(cos.items.filter((i) => i.type === 'avatar').sort((a, b) => a.cost - b.cost));
      setOwned(cos.owned);
    }
  }, [refreshUser]);
  useFocusLoad(load, !!user);

  const ownedSet = useMemo(
    () => new Set([...FREE_AVATAR_IDS, ...owned, ...(user?.ownedCosmetics ?? []), ...(user?.rentalAvatar ? [user.rentalAvatar] : [])]),
    [owned, user?.ownedCosmetics, user?.rentalAvatar]
  );
  const mine = items.filter((i) => ownedSet.has(i.id));
  const forSale = items.filter((i) => !ownedSet.has(i.id));
  const wearing = user?.rentalAvatar || user?.avatar;
  const points = user?.points ?? 0;

  const act = async () => {
    if (!preview) return;
    const isOwned = ownedSet.has(preview.id);
    setBusy(true);
    try {
      if (isOwned) {
        const res = await api.equipCosmetic(preview.id);
        patchUser(res.kid);
        haptic.success();
      } else {
        const res = await api.buyCosmetic(preview.id);
        patchUser(res.kid);
        setOwned((p) => [...p, preview.id]);
        setCelebrate(true);
      }
      setPreview(null);
      await refreshUser();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const pOwned = preview ? ownedSet.has(preview.id) : false;
  const pAfford = preview ? points >= preview.cost : false;

  return (
    <KidScreen
      compactSky
      sky={
        <View style={{ gap: 10 }}>
          <ToyButton icon="back" size="sm" variant="secondary" accessibilityLabel="חזרה" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(kid)/shop'))} sound={false} />
          <KidSkyTitle title={c.kid.avatars} sub={c.kid.avatarsSub} points={points} />
        </View>
      }
      overlay={
        <>
          <Sheet visible={!!preview} onClose={() => setPreview(null)} title={preview?.label}>
            {preview ? (
              <View style={{ alignItems: 'center', gap: 14 }}>
                <AvatarSticker avatar={preview.id} size={180} bg={WHITE} />
                {pOwned ? (
                  <ToyButton title={wearing === preview.id ? 'זו הדמות שלך' : 'ללבוש את הדמות'} variant="success" full loading={busy} disabled={wearing === preview.id} onPress={act} />
                ) : (
                  <ToyButton
                    title={pAfford ? `קנייה ב-${formatNum(preview.cost)}` : c.kid.needMore.replace('{n}', formatNum(preview.cost - points))}
                    variant="gold"
                    full
                    lead={<Coin size={22} />}
                    loading={busy}
                    disabled={!pAfford}
                    onPress={act}
                    sound="coin"
                  />
                )}
              </View>
            ) : null}
          </Sheet>
          <RewardBurst visible={celebrate} title="דמות חדשה!" body="היא כבר עליך. תתחדשו!" onClose={() => setCelebrate(false)} />
        </>
      }
    >
      <SectionTitle title="הדמויות שלי" />
      <View style={[styles.grid, { flexDirection: ROW }]}>
        {mine.map((i) => (
          <AvatarCell key={i.id} item={i} owned wearing={wearing === i.id} onPress={() => setPreview(i)} />
        ))}
      </View>
      {forSale.length ? <SectionTitle title="בחנות" /> : null}
      <View style={[styles.grid, { flexDirection: ROW }]}>
        {forSale.map((i) => (
          <AvatarCell key={i.id} item={i} owned={false} wearing={false} onPress={() => setPreview(i)} />
        ))}
      </View>
    </KidScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '33.33%', padding: 5, alignItems: 'center', gap: 4 },
  frame: {
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: INK,
    overflow: 'hidden',
    backgroundColor: WHITE,
    boxShadow: `0px 4px 0px ${INK}`,
  },
  wearing: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: MINT,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: INK,
    padding: 2,
  },
});
