import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/theme-context';
import { getThemeArt } from '../constants/theme-art';
import { SafeScreen } from './SafeScreen';
import { ThemeBackground } from './ThemeBackground';

interface ThemedScreenProps {
  children: React.ReactNode;
  tabs?: boolean;
  style?: object;
}

export function ThemedScreen({ children, tabs, style }: ThemedScreenProps) {
  const { colors, id: themeId } = useTheme();
  const art = getThemeArt(themeId);
  const emberWorld = themeId === 'ember' && art?.bg;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }, style]}>
      {emberWorld ? (
        <>
          <Image source={art!.bg} style={styles.world} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(10,10,12,0.15)', 'rgba(10,10,12,0.55)', 'rgba(10,10,12,0.88)']}
            locations={[0, 0.38, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </>
      ) : (
        <ThemeBackground key={themeId} />
      )}
      <SafeScreen tabs={tabs} style={styles.content}>
        {children}
      </SafeScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  world: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  content: { flex: 1, zIndex: 1 },
});
