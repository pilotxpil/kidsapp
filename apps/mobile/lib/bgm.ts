import { Audio, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BGM_FILE = require('../assets/bgm/quest-loop.mp3');
const MUTE_KEY = 'quest_bgm_muted';
const VOLUME = 0.16;
const FADE_MS = 800;

let sound: Audio.Sound | null = null;
let muted = false;
let starting = false;

export async function initBgm() {
  try {
    const stored = await AsyncStorage.getItem(MUTE_KEY);
    muted = stored === '1';
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
    await startBgm();
  }
}

async function fadeTo(target: number) {
  if (!sound) return;
  const steps = 8;
  const stepMs = FADE_MS / steps;
  for (let i = 1; i <= steps; i++) {
    await sound.setVolumeAsync((target * i) / steps);
    await sleep(stepMs);
  }
}

async function fadeOutAndStop() {
  if (!sound) return;
  const steps = 6;
  const stepMs = FADE_MS / steps;
  for (let i = steps - 1; i >= 0; i--) {
    await sound.setVolumeAsync((VOLUME * i) / steps);
    await sleep(stepMs);
  }
  await sound.stopAsync();
  await sound.unloadAsync();
  sound = null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function startBgm() {
  if (muted || starting || sound) return;
  starting = true;
  try {
    await initBgm();
    if (muted) return;

    const { sound: s } = await Audio.Sound.createAsync(BGM_FILE, {
      isLooping: true,
      volume: 0,
      shouldPlay: true,
    });
    sound = s;
    await fadeTo(VOLUME);
  } catch {
    if (sound) {
      await sound.unloadAsync().catch(() => {});
      sound = null;
    }
  } finally {
    starting = false;
  }
}

export async function stopBgm() {
  starting = false;
  if (!sound) return;
  try {
    await fadeOutAndStop();
  } catch {
    sound = null;
  }
}

export async function pauseBgm() {
  if (!sound) return;
  try {
    await sound.pauseAsync();
  } catch {
    // ignore
  }
}

export async function resumeBgm() {
  if (muted || !sound) return;
  try {
    const status = (await sound.getStatusAsync()) as AVPlaybackStatus;
    if (status.isLoaded && !status.isPlaying) {
      await sound.playAsync();
    }
  } catch {
    // ignore
  }
}
