import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { PushPlatform } from '@kidsapp/shared';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let cachedToken: string | null = null;

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

/** Request permission, get Expo push token, and register with the API. */
export async function registerPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;

  try {
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

  if (!token && Platform.OS !== 'web' && Device.isDevice) {
    try {
      const projectId = getProjectId();
      if (projectId) {
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
