import { createAudioPlayer, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAudioSession } from './sfx';

import { BGM_FILES } from './sfx-files';
import { worldSound } from './sfx';

// Every world has its own original loop, synthesized by scripts/audio/synth.mjs.
const MUTE_KEY = 'quest_bgm_muted';
const OLD_VOLUME_KEY = 'quest_bgm_volume';
const BASE_VOLUME = 0.42;

let player: AudioPlayer | null = null;
let muted = false;
let prefsLoaded = false;
let activeThemeId = 'ember';
let playingThemeId: string | null = null;
let seq = 0;

function sourceFor(themeId: string) {
  return BGM_FILES[worldSound(themeId)];
}

function releasePlayer(target: AudioPlayer | null) {
  if (!target) return;
  try {
    target.pause();
    target.release();
  } catch {
    // ignore
  }
  if (player === target) {
    player = null;
    playingThemeId = null;
  }
}

export async function initBgm() {
  try {
    if (!prefsLoaded) {
      const storedMute = await AsyncStorage.getItem(MUTE_KEY);
      muted = storedMute === '1';
      await AsyncStorage.removeItem(OLD_VOLUME_KEY);
      prefsLoaded = true;
    }
    await ensureAudioSession();
  } catch {
    // ignore
  }
}

export function isBgmMuted() {
  return muted;
}

export async function setBgmMuted(value: boolean) {
  muted = value;
  await AsyncStorage.setItem(MUTE_KEY, value ? '1' : '0');
  if (value) {
    await stopBgm();
  } else {
    await stopBgm();
    await startBgm(activeThemeId);
  }
}

export async function startBgm(themeId?: string) {
  if (themeId) activeThemeId = themeId;
  if (player && playingThemeId === activeThemeId && !muted) {
    try {
      player.play();
    } catch {
      // ignore
    }
    return;
  }
  const my = ++seq;
  try {
    await initBgm();
    if (muted || my !== seq) return;
    await setIsAudioActiveAsync(true);

    const old = player;
    player = null;
    playingThemeId = null;
    releasePlayer(old);
    if (my !== seq) return;

    const next = createAudioPlayer(sourceFor(activeThemeId), { keepAudioSessionActive: true });
    next.loop = true;
    next.muted = false;
    next.volume = BASE_VOLUME;
    if (my !== seq) {
      releasePlayer(next);
      return;
    }
    player = next;
    playingThemeId = activeThemeId;
    next.play();
    next.muted = false;
    next.volume = BASE_VOLUME;
  } catch {
    if (my === seq) {
      releasePlayer(player);
    }
  }
}

export async function stopBgm() {
  seq += 1;
  const current = player;
  player = null;
  playingThemeId = null;
  releasePlayer(current);
}

export async function pauseBgm() {
  if (!player) return;
  try {
    player.pause();
  } catch {
    // ignore
  }
}

export async function resumeBgm() {
  if (muted || !player) return;
  try {
    await setIsAudioActiveAsync(true);
    player.muted = false;
    player.volume = BASE_VOLUME;
    player.play();
  } catch {
    // ignore
  }
}
