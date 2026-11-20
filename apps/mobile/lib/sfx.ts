import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio';
import { SFX_FILES, type SfxWorld } from './sfx-files';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UiThemeId } from '@kidsapp/shared';

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

/** Theme id (stored on users) → the world whose instrument family plays its sounds. */
const WORLD_OF: Record<string, SfxWorld> = {
  roblox: 'ocean',
  ember: 'volcano',
  minecraft: 'jungle',
  brawl: 'space',
  sparkle: 'candy',
};

export function worldSound(themeId: string): SfxWorld {
  return WORLD_OF[themeId] ?? 'ocean';
}

// Cached players: taps must start instantly, so each sound is decoded once and rewound.
const cache = new Map<string, AudioPlayer>();
function playerFor(world: SfxWorld, name: SfxName): AudioPlayer {
  const key = `${world}:${name}`;
  let p = cache.get(key);
  if (!p) {
    p = createAudioPlayer(SFX_FILES[world][name], { keepAudioSessionActive: true });
    cache.set(key, p);
  }
  return p;
}

const MUTE_KEY = 'quest_sfx_muted';
const OLD_VOLUME_KEY = 'quest_sfx_volume';

let muted = false;
let prefsLoaded = false;
let themeId: UiThemeId = 'ember';

export function setSfxTheme(id: UiThemeId) {
  themeId = id;
  preloadSfx();
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
    const player = playerFor(worldSound(themeId), name);
    player.volume = opts?.volume ?? 1;
    player.muted = false;
    await player.seekTo(0);
    player.play();
  } catch {
    // Expo Go / web may skip playback
  }
}

/** Warm the current world's sounds so the first tap is not late. */
export function preloadSfx() {
  const world = worldSound(themeId);
  (['tap', 'whoosh', 'coin', 'complete'] as SfxName[]).forEach((n) => {
    try {
      playerFor(world, n);
    } catch {
      // ignore
    }
  });
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
