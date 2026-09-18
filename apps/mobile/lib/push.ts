import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import type { PushPlatform } from '@kidsapp/shared';
import { api } from './api';

let cachedToken: string | null = null;
let handlerReady = false;

function resolvePlatform(): PushPlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'web') return 'web';
  return 'unknown';
}

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

function canUsePush(): boolean {
  // Importing expo-notifications in Expo Go (Android) throws at module init.
  return Platform.OS !== 'web' && !isRunningInExpoGo() && Device.isDevice;
}

async function loadNotifications() {
  if (!canUsePush()) return null;
  const Notifications = await import('expo-notifications');
  if (!handlerReady) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerReady = true;
  }
  return Notifications;
}

/** Request permission, get Expo push token, and register with the API. */
export async function registerPushNotifications(): Promise<string | null> {
  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'KidsQuest',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    const projectId = getProjectId();
    if (!projectId) {
      console.warn('[push] missing EAS projectId');
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    cachedToken = token;
    await api.registerPushToken(token, resolvePlatform());
    return token;
  } catch (err) {
    console.warn('[push] register failed', err);
    return null;
  }
}

/** Unregister current device token from the API (e.g. on logout). */
export async function unregisterPushNotifications(): Promise<void> {
  let token = cachedToken;
  cachedToken = null;

  if (!token && canUsePush()) {
    try {
      const Notifications = await loadNotifications();
      const projectId = getProjectId();
      if (Notifications && projectId) {
        const result = await Notifications.getExpoPushTokenAsync({ projectId });
        token = result.data;
      }
    } catch {
      return;
    }
  }
  if (!token) return;
  try {
    await api.unregisterPushToken(token);
  } catch {
    // Best-effort — session may already be cleared
  }
}
