import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';
import { c } from '../lib/i18n';
import { GOLD, INK, WHITE } from '../constants/themes';
import { Coin, Icon, Piko, Row, Sticker, Txt, WorldSky, GUTTER } from '../components/ui';
import { AppVersionLabel } from '../components/AppVersionLabel';

function DoorCard({
  title,
  sub,
  color,
  art,
  onPress,
}: {
  title: string;
  sub: string;
  color: string;
  art: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Sticker color={color} onPress={onPress} accessibilityLabel={title} pad={18} radius={26}>
      <Row gap={14}>
        <View style={styles.art}>{art}</View>
        <View style={{ flex: 1 }}>
          <Txt v="h1">{title}</Txt>
          <Txt v="body" muted>
            {sub}
          </Txt>
        </View>
        <Icon name="forward" size={26} color={INK} stroke={2.8} />
      </Row>
    </Sticker>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { world } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: world.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} bounces={false}>
        <WorldSky>
          <View style={styles.hero}>
            <Piko size={150} mood="cheer" bob />
            <Txt v="hero" color={WHITE} align="center" style={styles.brand}>
              {c.brand.name}
            </Txt>
            <Txt v="h2" color={WHITE} align="center" style={{ opacity: 0.95 }}>
              {c.brand.tagline}
            </Txt>
          </View>
        </WorldSky>

        <View style={{ paddingHorizontal: GUTTER, gap: 16, marginTop: 4 }}>
          <DoorCard
            title={c.welcome.kid}
            sub={c.welcome.kidSub}
            color={GOLD}
            art={<Coin size={52} />}
            onPress={() => router.push('/kid-login')}
          />
          <DoorCard
            title={c.welcome.parent}
            sub={c.welcome.parentSub}
            color={WHITE}
            art={<Piko size={58} mood="wink" />}
            onPress={() => router.push('/parent-login')}
          />

          <Pressable onPress={() => router.push('/parent-register')} accessibilityRole="link" style={styles.link}>
            <Txt v="title" align="center" color={world.accentDark}>
              {c.welcome.newFamily}
            </Txt>
          </Pressable>

          <Row justify="center" gap={24}>
            <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link" hitSlop={8}>
              <Txt v="caption" muted>
                {c.welcome.privacy}
              </Txt>
            </Pressable>
            <Pressable onPress={() => router.push('/terms')} accessibilityRole="link" hitSlop={8}>
              <Txt v="caption" muted>
                {c.welcome.terms}
              </Txt>
            </Pressable>
          </Row>
          <AppVersionLabel />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 12 },
  brand: { marginTop: 6, letterSpacing: 0.5 },
  art: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  link: { paddingVertical: 8 },
});
