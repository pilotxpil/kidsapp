import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UiThemeId } from '@kidsapp/shared';
import { getTheme } from '../constants/themes';

export type SfxName =
  | 'tap'
  | 'complete'
  | 'gem'
  | 'coin'
  | 'error'
  | 'cheer'
  | 'whoosh'
  | 'star1'
  | 'star2'
  | 'star3'
  | 'star4';

const FILES: Record<SfxName, number> = {
  tap: require('../assets/sfx/tap.wav'),
  complete: require('../assets/sfx/complete.wav'),
  gem: require('../assets/sfx/gem.wav'),
  coin: require('../assets/sfx/coin.wav'),
  error: require('../assets/sfx/error.wav'),
  cheer: require('../assets/sfx/cheer.wav'),
  whoosh: require('../assets/sfx/whoosh.wav'),
  star1: require('../assets/sfx/star1.wav'),
  star2: require('../assets/sfx/star2.wav'),
  star3: require('../assets/sfx/star3.wav'),
  star4: require('../assets/sfx/star4.wav'),
};

const MUTE_KEY = 'quest_sfx_muted';
const OLD_VOLUME_KEY = 'quest_sfx_volume';

let muted = false;
let prefsLoaded = false;
let themeId: UiThemeId = 'ember';

export function setSfxTheme(id: UiThemeId) {
  themeId = id;
}

export async function ensureAudioSession() {
  await setIsAudioActiveAsync(true);
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'mixWithOthers',
  });
}

export async function initSfx() {
  try {
    if (!prefsLoaded) {
      const storedMute = await AsyncStorage.getItem(MUTE_KEY);
      muted = storedMute === '1';
      await AsyncStorage.removeItem(OLD_VOLUME_KEY);
      prefsLoaded = true;
    }
    await ensureAudioSession();
  } catch {
    // Expo Go / web may skip audio session setup
  }
}

export function isSfxMuted() {
  return muted;
}

export async function setSfxMuted(value: boolean) {
  muted = value;
  await AsyncStorage.setItem(MUTE_KEY, value ? '1' : '0');
  if (!value) {
    try {
      await ensureAudioSession();
    } catch {
      // ignore
    }
  }
}

export async function playSfx(name: SfxName, opts?: { volume?: number }) {
  if (muted) return;
  try {
    await ensureAudioSession();
    const resolved = name === 'tap' ? getTheme(themeId).sfx : name;
    const player = createAudioPlayer(FILES[resolved], { keepAudioSessionActive: true });
    player.muted = false;
    player.volume = opts?.volume ?? 1;
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        sub.remove();
        player.release();
      }
    });
    player.play();
  } catch {
    // Expo Go / web may skip playback
  }
}

/** Rising arcade blings for daily-star taps (1–4). */
export function playStarTapSfx(tapIndex: number) {
  const names: SfxName[] = ['star1', 'star2', 'star3', 'star4'];
  const idx = Math.min(Math.max(tapIndex, 1), 4) - 1;
  void playSfx(names[idx], { volume: idx === 3 ? 1 : 0.9 });
}

export function sfxForRewardTitle(title: string): SfxName {
  const t = title.toLowerCase();
  if (t.includes('robux') || t.includes('roblox') || t.includes('רובלוקס')) return 'coin';
  if (t.includes('brawl') || t.includes('gem') || t.includes('ברול')) return 'gem';
  if (t.includes('minecraft') || t.includes('mine') || t.includes('מיינקראפט')) return 'complete';
  return 'complete';
}
