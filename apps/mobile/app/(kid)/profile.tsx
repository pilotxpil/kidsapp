import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BADGES, BADGE_REWARDS, MAX_HERO_LINE, calculateLevel, type KidProfile } from '@kidsapp/shared';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { useTheme } from '../../lib/theme-context';
import { c } from '../../lib/i18n';
import { useErrorHandler } from '../../lib/premium';
import { haptic } from '../../lib/haptics';
import { INK, WHITE } from '../../constants/themes';
import { ROW } from '../../lib/dir';
import {
  AvatarSticker,
  Coin,
  Dialog,
  Field,
  Flame,
  Gem,
  KidScreen,
  LevelRing,
  Row,
  SectionTitle,
  Sheet,
  Sticker,
  ToyButton,
  TrophyToy,
  Txt,
  formatNum,
  toast,
} from '../../components/ui';
import { WorldPicker } from '../../components/WorldPicker';
import { SoundSettings } from '../../components/SoundSettings';
import { AvatarPickerModal } from '../../components/AvatarPicker';
import { AppVersionLabel } from '../../components/AppVersionLabel';

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.statCell}>
      <Sticker pad={10}>
        <View style={{ alignItems: 'center', gap: 2 }}>
          {icon}
          <Txt v="h2" num align="center">
            {value}
          </Txt>
          <Txt v="tiny" muted align="center">
            {label}
          </Txt>
        </View>
      </Sticker>
    </View>
  );
}

export default function KidProfileScreen() {
  const { user, logout, patchUser } = useAuth();
  const router = useRouter();
  const { world } = useTheme();
  const onError = useErrorHandler();
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [badge, setBadge] = useState<string | null>(null);
  const [line, setLine] = useState(user?.heroLine ?? '');
  const [savingLine, setSavingLine] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);

  const load = useCallback(async () => {
    if (!user?._id) return;
    const res = await api.getKidProfile(user._id);
    setProfile(res.profile);
  }, [user?._id]);
  useFocusLoad(load, !!user?._id);

  const xp = profile?.xp ?? user?.xp ?? 0;
  const lvl = calculateLevel(xp);
  const earned = new Set(profile?.badges ?? user?.badges ?? []);
  const avatar = user?.rentalAvatar || user?.avatar || '🙂';

  const saveLine = async () => {
    setSavingLine(true);
    try {
      const { user: u } = await api.updateMe({ heroLine: line.trim() });
      patchUser({ heroLine: u.heroLine });
      haptic.success();
      toast('נשמר!');
    } catch (e) {
      onError(e);
    } finally {
      setSavingLine(false);
    }
  };

  const badgeInfo = badge ? BADGES[badge] : null;

  return (
    <KidScreen
      sky={
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Pressable onPress={() => setAvatarOpen(true)} accessibilityRole="button" accessibilityLabel={c.kid.changeAvatar}>
            <LevelRing progress={lvl.xpInLevel / lvl.xpToNext} size={124} stroke={9}>
              <AvatarSticker avatar={avatar} size={94} bg={WHITE} />
            </LevelRing>
          </Pressable>
          <Txt v="display" color={WHITE} align="center">
            {user?.displayName}
          </Txt>
          <Txt v="strong" color={WHITE} align="center" style={{ opacity: 0.92 }}>
            {c.kid.level.replace('{n}', String(lvl.level))}. {c.kid.xpLeft.replace('{n}', String(lvl.xpToNext - lvl.xpInLevel))}
          </Txt>
        </View>
      }
      overlay={
        <>
          <AvatarPickerModal
            visible={avatarOpen}
            onClose={() => setAvatarOpen(false)}
            mode="kid"
            onOpenShop={() => {
              setAvatarOpen(false);
              router.push('/(kid)/avatar-shop');
            }}
          />
          <Sheet visible={!!badgeInfo} onClose={() => setBadge(null)} title={badgeInfo?.label} subtitle={badgeInfo?.description}>
            {badge ? (
              <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                <Txt size={64} align="center" style={{ lineHeight: 76, opacity: earned.has(badge) ? 1 : 0.35 }}>
                  {badgeInfo?.icon}
                </Txt>
                <Txt v="title" align="center">
                  {earned.has(badge) ? `+${BADGE_REWARDS[badge] ?? 0} XP` : 'עוד לא נפתח. אפשר להשיג אותו!'}
                </Txt>
              </View>
            ) : null}
          </Sheet>
          <Dialog
            visible={confirmOut}
            title={c.kid.logoutConfirm}
            message={c.kid.logoutBody}
            confirmLabel={c.kid.logout}
            destructive
            onConfirm={() => {
              setConfirmOut(false);
              void logout();
            }}
            onCancel={() => setConfirmOut(false)}
          />
        </>
      }
    >
      <View style={[styles.stats, { flexDirection: ROW }]}>
        <Stat icon={<Coin size={26} />} value={formatNum(profile?.points ?? user?.points ?? 0)} label={c.kid.statPoints} />
        <Stat icon={<Gem size={26} />} value={String(lvl.level)} label={c.kid.statLevel} />
        <Stat icon={<Flame size={26} />} value={String(profile?.streak ?? user?.streak ?? 0)} label={c.kid.statStreak} />
        <Stat icon={<Txt size={22} style={{ lineHeight: 26 }}>📚</Txt>} value={String(profile?.learningStreak ?? user?.learningStreak ?? 0)} label={c.kid.statLearn} />
      </View>

      <SectionTitle title={c.kid.badges} />
      <Sticker pad={12}>
        <View style={[styles.badges, { flexDirection: ROW }]}>
          {Object.entries(BADGES).map(([id, b]) => {
            const on = earned.has(id);
            return (
              <Pressable key={id} onPress={() => setBadge(id)} style={styles.badgeCell} accessibilityLabel={b.label}>
                <View style={[styles.badgeCoin, on ? { backgroundColor: '#FFF2C2' } : styles.badgeLocked]}>
                  <Txt size={28} align="center" style={{ lineHeight: 34, opacity: on ? 1 : 0.3 }}>
                    {b.icon}
                  </Txt>
                </View>
                <Txt v="tiny" align="center" numberOfLines={2} muted={!on}>
                  {b.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        {earned.size === 0 ? (
          <Row gap={8} style={{ marginTop: 8 }}>
            <TrophyToy size={24} />
            <Txt v="caption" muted style={{ flex: 1 }}>
              {c.kid.noBadges}
            </Txt>
          </Row>
        ) : null}
      </Sticker>

      <SectionTitle title={c.kid.world} />
      <Sticker pad={12}>
        <WorldPicker />
      </Sticker>

      <SectionTitle title={c.kid.myLine} />
      <Sticker pad={14}>
        <View style={{ gap: 10 }}>
          <Field value={line} onChangeText={setLine} maxLength={MAX_HERO_LINE} hint={c.kid.myLineHint} placeholder="למשל: אני אלוף העולם!" />
          <ToyButton title="שמירה" size="md" onPress={saveLine} loading={savingLine} disabled={line.trim() === (user?.heroLine ?? '')} />
        </View>
      </Sticker>

      <SectionTitle title={c.kid.settings} />
      <Sticker pad={14}>
        <SoundSettings />
      </Sticker>

      <ToyButton title={c.kid.logout} icon="logout" variant="secondary" full onPress={() => setConfirmOut(true)} />
      <Pressable onPress={() => router.push('/privacy')} hitSlop={8}>
        <Txt v="caption" align="center" color={world.accentDark}>
          {c.welcome.privacy}
        </Txt>
      </Pressable>
      <AppVersionLabel />
    </KidScreen>
  );
}

const styles = StyleSheet.create({
  stats: { marginHorizontal: -4 },
  statCell: { flex: 1, paddingHorizontal: 4 },
  badges: { flexWrap: 'wrap' },
  badgeCell: { width: '33.33%', alignItems: 'center', gap: 4, paddingVertical: 8 },
  badgeCoin: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 3px 0px ${INK}`,
  },
  badgeLocked: { backgroundColor: '#F1EEF8', borderStyle: 'dashed', boxShadow: 'none' },
});
