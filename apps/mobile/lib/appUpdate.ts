import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { API_URL } from './config';
import { t } from './i18n';

const PACKAGE_ID = 'com.kidsapp.quest';
const DISMISS_KEY = 'kidsapp_update_dismiss';
const SNOOZE_MS = 24 * 60 * 60 * 1000;

type DismissState = {
  storeVersion: string;
  until: number;
};

/** Compare dotted versions: returns true if `a` is strictly newer than `b`. */
export function isVersionNewer(a: string, b: string): boolean {
  const pa = a.split(/[.+-]/).map((p) => parseInt(p, 10) || 0);
  const pb = b.split(/[.+-]/).map((p) => parseInt(p, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

async function fetchIosLookup(): Promise<{ version: string; url: string } | null> {
  const res = await fetch(
    `https://itunes.apple.com/lookup?bundleId=${PACKAGE_ID}&country=il`,
    { method: 'GET' }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: Array<{ version?: string; trackId?: number; trackViewUrl?: string }>;
  };
  const app = data.results?.[0];
  if (!app?.version) return null;
  const url =
    app.trackViewUrl ||
    (app.trackId ? `https://apps.apple.com/app/id${app.trackId}` : null);
  if (!url) return null;
  return { version: app.version, url };
}

function parsePlayStoreVersion(html: string): string | null {
  const patterns = [
    /\[\[\["(\d+(?:\.\d+){1,3})"\]\]/,
    /"softwareVersion"\s*:\s*"(\d+(?:\.\d+){1,3})"/,
    /Current Version<\/div><span[^>]*>\s*(\d+(?:\.\d+){1,3})\s*</i,
    /\[null,\[\[\["(\d+(?:\.\d+){1,3})"\]\]/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

async function fetchAndroidStoreVersion(): Promise<string | null> {
  const res = await fetch(
    `https://play.google.com/store/apps/details?id=${PACKAGE_ID}&hl=en&gl=IL`,
    {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }
  );
  if (!res.ok) return null;
  const html = await res.text();
  return parsePlayStoreVersion(html);
}

/** API-configured versions (set STORE_VERSION_* on the server after each release). */
async function fetchApiVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/app/version`);
    if (!res.ok) return null;
    const data = (await res.json()) as { android?: string; ios?: string };
    if (Platform.OS === 'ios') return data.ios ?? null;
    if (Platform.OS === 'android') return data.android ?? null;
    return null;
  } catch {
    return null;
  }
}

async function resolveLatestVersion(): Promise<{ version: string; storeUrl: string } | null> {
  if (Platform.OS === 'ios') {
    const lookup = await fetchIosLookup().catch(() => null);
    if (lookup) return { version: lookup.version, storeUrl: lookup.url };
    // Without App Store listing we can't deep-link reliably — skip prompt.
    return null;
  }

  if (Platform.OS === 'android') {
    const playUrl = `https://play.google.com/store/apps/details?id=${PACKAGE_ID}`;
    const fromStore = await fetchAndroidStoreVersion().catch(() => null);
    if (fromStore) return { version: fromStore, storeUrl: playUrl };
    const api = await fetchApiVersion();
    if (api) return { version: api, storeUrl: playUrl };
    return null;
  }

  return null;
}

async function wasDismissed(storeVersion: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const state = JSON.parse(raw) as DismissState;
    if (state.storeVersion !== storeVersion) return false;
    return Date.now() < state.until;
  } catch {
    return false;
  }
}

async function dismissFor(storeVersion: string): Promise<void> {
  const state: DismissState = {
    storeVersion,
    until: Date.now() + SNOOZE_MS,
  };
  await AsyncStorage.setItem(DISMISS_KEY, JSON.stringify(state));
}

async function openStore(url: string): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      const market = `market://details?id=${PACKAGE_ID}`;
      if (await Linking.canOpenURL(market)) {
        await Linking.openURL(market);
        return;
      }
    }
    await Linking.openURL(url);
  } catch (err) {
    console.warn('[appUpdate] open store failed', err);
  }
}

function showUpdateAlert(
  currentVersion: string,
  storeVersion: string,
  storeUrl: string
): void {
  const body = t('updateAvailableBody')
    .replace('{store}', storeVersion)
    .replace('{current}', currentVersion);

  Alert.alert(t('updateAvailableTitle'), body, [
    {
      text: t('updateLater'),
      style: 'cancel',
      onPress: () => {
        void dismissFor(storeVersion);
      },
    },
    {
      text: t('updateNow'),
      onPress: () => {
        void openStore(storeUrl);
      },
    },
  ]);
}

/**
 * Compare installed app version to the store (with API fallback) and prompt if outdated.
 * Skipped on web and in __DEV__.
 */
export async function checkForStoreUpdate(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (__DEV__) return;

  const currentVersion = Application.nativeApplicationVersion;
  if (!currentVersion) return;

  try {
    const latest = await resolveLatestVersion();
    if (!latest) return;
    if (!isVersionNewer(latest.version, currentVersion)) return;
    if (await wasDismissed(latest.version)) return;
    showUpdateAlert(currentVersion, latest.version, latest.storeUrl);
  } catch (err) {
    console.warn('[appUpdate] check failed', err);
  }
}
