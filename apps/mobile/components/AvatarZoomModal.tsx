import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COSMETIC_ITEMS, FREE_AVATAR_IDS } from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { KidAvatar } from './KidAvatar';
import { ShopAvatarGrid } from './ShopAvatarGrid';
import { Button } from './Button';
import { shopAvatarImage } from '../lib/avatar-images';
import { playSfx } from '../lib/sfx';
import { t } from '../lib/i18n';

interface AvatarZoomModalProps {
  visible: boolean;
  avatar: string;
  onClose: () => void;
  onShop: () => void;
}

export function AvatarZoomModal({ visible, avatar, onClose, onShop }: AvatarZoomModalProps) {
  const { user, refreshUser, patchUser } = useAuth();
  const { colors, borderRadius, cardBorder } = useTheme();
  const [saving, setSaving] = useState<string | null>(null);
  const [ownedFromApi, setOwnedFromApi] = useState<string[] | null>(null);
  const current = user?.avatar ?? avatar;
  const label = COSMETIC_ITEMS.find((c) => c.id === current)?.label;

  const ownedIds = useMemo(() => {
    const ids = new Set<string>([...FREE_AVATAR_IDS, ...(user?.ownedCosmetics ?? []), ...(ownedFromApi ?? [])]);
    if (current && shopAvatarImage(current)) ids.add(current);
    return COSMETIC_ITEMS.filter((c) => c.type === 'avatar' && ids.has(c.id)).map((c) => c.id);
  }, [user?.ownedCosmetics, ownedFromApi, current]);

  useEffect(() => {
    if (!visible) return;
    setOwnedFromApi(null);
    void (async () => {
      const [cos] = await Promise.all([api.getCosmetics().catch(() => null), refreshUser()]);
      if (cos?.owned) setOwnedFromApi(cos.owned);
    })();
  }, [visible, refreshUser]);

  const handleSelect = async (id: string) => {
    if (!user || saving) return;
    if (id === current) return;
    setSaving(id);
    try {
      playSfx('tap');
      try {
        const res = await api.equipCosmetic(id);
        patchUser(res.kid);
      } catch {
        await api.updateKid(user._id, { avatar: id });
        await refreshUser();
      }
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.bgCard,
              borderRadius: borderRadius.lg,
              ...cardBorder(3),
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
            <KidAvatar avatar={current} size={200} />
            {label ? <Text style={[styles.name, { color: colors.text }]}>{label}</Text> : null}
            <Text style={[styles.section, { color: colors.text }]}>{t('ownedAvatars')}</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>{t('ownedAvatarsHint')}</Text>
            <ShopAvatarGrid
              selected={current}
              onSelect={handleSelect}
              savingId={saving}
              ids={ownedIds}
              caption={(id) => (id === current ? t('avatarEquipped') : t('freeToChoose'))}
            />
          </ScrollView>
          <View style={styles.actions}>
            <Button title={t('buyOtherAvatar')} onPress={onShop} />
            <Button title={t('close')} onPress={onClose} variant="outline" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
    padding: spacing.lg,
    alignItems: 'center',
  },
  scroll: { width: '100%' },
  scrollInner: { alignItems: 'center', paddingBottom: spacing.sm },
  name: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  section: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
    marginTop: spacing.lg,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    width: '100%',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  actions: { width: '100%', gap: spacing.sm, marginTop: spacing.md },
});
