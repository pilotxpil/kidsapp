import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SfxName = 'tap' | 'complete' | 'gem' | 'coin' | 'error' | 'star1' | 'star2' | 'star3' | 'star4';

const FILES: Record<SfxName, number> = {
  tap: require('../assets/sfx/tap.wav'),
  complete: require('../assets/sfx/complete.wav'),
  gem: require('../assets/sfx/gem.wav'),
  coin: require('../assets/sfx/coin.wav'),
  error: require('../assets/sfx/error.wav'),
  star1: require('../assets/sfx/star1.wav'),
  star2: require('../assets/sfx/star2.wav'),
  star3: require('../assets/sfx/star3.wav'),
  star4: require('../assets/sfx/star4.wav'),
};

const MUTE_KEY = 'quest_sfx_muted';
let muted = false;
let ready = false;

export async function initSfx() {
  try {
    const stored = await AsyncStorage.getItem(MUTE_KEY);
    muted = stored === '1';
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
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

export async function playSfx(name: SfxName, opts?: { volume?: number }) {
  if (muted) return;
  try {
    if (!ready) await initSfx();
    const volume = opts?.volume ?? 0.65;
    const player = createAudioPlayer(FILES[name]);
    player.volume = volume;
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
  // Final tap: full victory fanfare
  const volume = idx === 3 ? 1 : 0.85 + idx * 0.04;
  void playSfx(names[idx], { volume });
}

export function sfxForRewardTitle(title: string): SfxName {
  const t = title.toLowerCase();
  if (t.includes('robux') || t.includes('roblox') || t.includes('רובלוקס')) return 'coin';
  if (t.includes('brawl') || t.includes('gem') || t.includes('ברול')) return 'gem';
  if (t.includes('minecraft') || t.includes('mine') || t.includes('מיינקראפט')) return 'complete';
  return 'complete';
}
