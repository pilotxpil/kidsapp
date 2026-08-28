import { Platform } from 'react-native';
import Constants from 'expo-constants';

function getDevMachineHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;

  if (!hostUri) return null;

  // hostUri examples: "192.168.1.5:8081" or "exp://192.168.1.5:8081"
  const withoutScheme = hostUri.replace(/^[a-z]+:\/\//, '');
  const host = withoutScheme.split(':')[0];
  return host || null;
}

function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const devHost = getDevMachineHost();
  if (devHost) {
    return `http://${devHost}:3001`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001';
  }

  return 'http://localhost:3001';
}

export const API_URL = resolveApiUrl();

if (__DEV__) {
  console.log('[KidsQuest] API_URL:', API_URL);
}
