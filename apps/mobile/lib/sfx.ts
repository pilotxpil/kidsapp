import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SfxName = 'tap' | 'complete' | 'gem' | 'coin' | 'error';

const FILES: Record<SfxName, number> = {
  tap: require('../assets/sfx/tap.wav'),
  complete: require('../assets/sfx/complete.wav'),
  gem: require('../assets/sfx/gem.wav'),
  coin: require('../assets/sfx/coin.wav'),
  error: require('../assets/sfx/error.wav'),
};

const MUTE_KEY = 'quest_sfx_muted';
let muted = false;
let ready = false;

export async function initSfx() {
  try {
    const stored = await AsyncStorage.getItem(MUTE_KEY);
    muted = stored === '1';
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    });
    ready = true;
  } catch {
    ready = true;
  }
}

export function isSfxMuted() {
  return muted;
}

export async function setSfxMuted(value: boolean) {
  muted = value;
  await AsyncStorage.setItem(MUTE_KEY, value ? '1' : '0');
}

export async function playSfx(name: SfxName) {
  if (muted) return;
  try {
    if (!ready) await initSfx();
    const { sound } = await Audio.Sound.createAsync(FILES[name], { shouldPlay: true, volume: 0.75 });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch {
    // Expo Go / web may skip playback
  }
}

export function sfxForRewardTitle(title: string): SfxName {
  const t = title.toLowerCase();
  if (t.includes('robux') || t.includes('roblox') || t.includes('רובלוקס')) return 'coin';
  if (t.includes('brawl') || t.includes('gem') || t.includes('ברול')) return 'gem';
  if (t.includes('minecraft') || t.includes('mine') || t.includes('מיינקראפט')) return 'complete';
  return 'complete';
}
