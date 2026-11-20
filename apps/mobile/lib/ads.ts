import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * AdMob (Families-policy settings): child-directed, under-age-of-consent, G-rated,
 * non-personalized. Banners are shown ONLY on parent screens of free families.
 *
 * Unit ids come from EAS env (EXPO_PUBLIC_ADMOB_BANNER_ANDROID / _IOS). Unset → no ads.
 */
type AdsModule = typeof import('react-native-google-mobile-ads');

let mod: AdsModule | null | undefined;
let initialized = false;

export function bannerUnitId(): string | undefined {
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID;
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS;
  return undefined;
}

export function adsAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  if (Constants.executionEnvironment === 'storeClient') return false;
  return Boolean(bannerUnitId());
}

export function loadAds(): AdsModule | null {
  if (mod !== undefined) return mod;
  if (!adsAvailable()) {
    mod = null;
    return mod;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('react-native-google-mobile-ads') as AdsModule;
  } catch {
    mod = null;
  }
  return mod;
}

export async function initAds(): Promise<boolean> {
  const m = loadAds();
  if (!m) return false;
  if (initialized) return true;
  try {
    const ads = m.default();
    await ads.setRequestConfiguration({
      maxAdContentRating: m.MaxAdContentRating.G,
      tagForChildDirectedTreatment: true,
      tagForUnderAgeOfConsent: true,
    });
    await ads.initialize();
    initialized = true;
    return true;
  } catch {
    return false;
  }
}
