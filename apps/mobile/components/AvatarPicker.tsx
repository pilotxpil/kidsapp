import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { AVATARS, PARENT_AVATARS } from '@kidsapp/shared';
import { spacing } from '../constants/theme';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme-context';
import { playSfx } from '../lib/sfx';
import { BouncyPressable } from './animations/BouncyPressable';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';

interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AvatarPickerModal({ visible, onClose }: AvatarPickerModalProps) {
  const { user, refreshUser } = useAuth();
  const { borderRadius, colors, cardBorder } = useTheme();
  const [saving, setSaving] = useState<string | null>(null);
  const current = user?.avatar ?? AVATARS[0];
  const options = user?.role === 'parent' ? PARENT_AVATARS : AVATARS;

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
      } else {
        await api.updateKid(user._id, { avatar });
      }
      await refreshUser();
      onClose();
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
          <Text style={[styles.title, { color: colors.text }]}>{t('selectAvatar')}</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>{t('selectAvatarHint')}</Text>
          <View style={[styles.grid, rtl.tabs]}>
            {options.map((emoji) => {
              const selected = emoji === current;
              const loading = saving === emoji;
              return (
                <BouncyPressable
                  key={emoji}
                  style={[
                    styles.btn,
                    {
                      borderRadius: borderRadius.md,
                      backgroundColor: colors.bgCardLight,
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 3 : 2,
                    },
                  ]}
                  onPress={() => handleSelect(emoji)}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Text style={styles.emoji}>{emoji}</Text>
                  )}
                </BouncyPressable>
              );
            })}
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeText, { color: colors.primary }]}>{t('close')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
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
    maxWidth: 340,
    padding: spacing.lg,
    alignItems: 'center',
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
  grid: {
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    width: '100%',
    marginBottom: spacing.sm,
  },
  btn: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 28 },
  closeBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  closeText: { fontWeight: '700', fontSize: 16 },
});
