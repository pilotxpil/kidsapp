import React, { useEffect, useMemo, useState } from 'react';
import {
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  View,
} from 'react-native';
import {
  PARENT_AVATARS,
  COSMETIC_ITEMS,
  FREE_AVATAR_IDS,
} from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme-context';
import { playSfx } from '../lib/sfx';
import { ShopAvatarGrid } from './ShopAvatarGrid';
import { AvatarShopTeaser } from './AvatarShopTeaser';
import { shopAvatarImage } from '../lib/avatar-images';
import { t } from '../lib/i18n';

interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: 'parent' | 'kid';
  onOpenShop?: () => void;
}

export function AvatarPickerModal({ visible, onClose, mode, onOpenShop }: AvatarPickerModalProps) {
  const { user, refreshUser, patchUser } = useAuth();
  const { borderRadius, colors, cardBorder } = useTheme();
  const [saving, setSaving] = useState<string | null>(null);
  const [ownedFromApi, setOwnedFromApi] = useState<string[] | null>(null);
  const isParent = mode === 'parent' || user?.role === 'parent';
  const current = user?.avatar ?? (isParent ? PARENT_AVATARS[0] : FREE_AVATAR_IDS[0]);

  const ownedIds = useMemo(() => {
    const ids = new Set<string>([
      ...FREE_AVATAR_IDS,
      ...(user?.ownedCosmetics ?? []),
      ...(ownedFromApi ?? []),
    ]);
    if (user?.rentalAvatar) ids.add(user.rentalAvatar);
    if (current && shopAvatarImage(current)) ids.add(current);
    return COSMETIC_ITEMS.filter((c) => c.type === 'avatar' && ids.has(c.id)).map((c) => c.id);
  }, [user?.ownedCosmetics, user?.rentalAvatar, ownedFromApi, current]);

  useEffect(() => {
    if (!visible || isParent) return;
    setOwnedFromApi(null);
    void (async () => {
      const [cos] = await Promise.all([api.getCosmetics().catch(() => null), refreshUser()]);
      if (cos?.owned) setOwnedFromApi(cos.owned);
    })();
  }, [visible, isParent, refreshUser]);

  const handleSelect = async (avatar: string) => {
    if (!user || saving) return;
    if (avatar === current) {
      onClose();
      return;
    }
    setSaving(avatar);
    try {
      playSfx('tap');
      if (user.role === 'parent') {
        await api.updateMe({ avatar });
        await refreshUser();
      } else {
        try {
          const res = await api.equipCosmetic(avatar);
          patchUser(res.kid);
        } catch {
          await api.updateKid(user._id, { avatar });
          await refreshUser();
        }
      }
      onClose();
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.bgCard,
              borderRadius: borderRadius.lg,
              ...cardBorder(3),
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{t('selectAvatar')}</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {t(isParent ? 'selectAvatarHintParent' : 'selectAvatarHintKid')}
          </Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.gridWrap}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {isParent ? (
              <ShopAvatarGrid selected={current} onSelect={handleSelect} savingId={saving} />
            ) : (
              <>
                <Text style={[styles.section, { color: colors.text }]}>{t('ownedAvatars')}</Text>
                <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{t('ownedAvatarsHint')}</Text>
                <ShopAvatarGrid
                  selected={current}
                  onSelect={handleSelect}
                  savingId={saving}
                  ids={ownedIds}
                  caption={(id) => (id === current ? t('avatarEquipped') : t('freeToChoose'))}
                />
                {onOpenShop ? (
                  <AvatarShopTeaser
                    onPress={() => {
                      onClose();
                      onOpenShop();
                    }}
                  />
                ) : null}
              </>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeText, { color: colors.primary }]}>{t('close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    padding: spacing.lg,
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
    width: '100%',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  section: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  scroll: { width: '100%', maxHeight: 420 },
  gridWrap: { width: '100%', paddingBottom: spacing.sm },
  closeBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  closeText: { fontWeight: '700', fontSize: 16 },
});
