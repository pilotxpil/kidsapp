import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BGM_FILE = require('../assets/bgm/quest-loop.mp3');
const MUTE_KEY = 'quest_bgm_muted';
const VOLUME = 0.16;
const FADE_MS = 800;

let player: AudioPlayer | null = null;
let muted = false;
let starting = false;

export async function initBgm() {
  try {
    const stored = await AsyncStorage.getItem(MUTE_KEY);
    muted = stored === '1';
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
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
  if (!player) return;
  const start = player.volume;
  const steps = 8;
  const stepMs = FADE_MS / steps;
  for (let i = 1; i <= steps; i++) {
    player.volume = start + ((target - start) * i) / steps;
    await sleep(stepMs);
  }
}

async function fadeOutAndStop() {
  if (!player) return;
  const current = player;
  const start = current.volume;
  const steps = 6;
  const stepMs = FADE_MS / steps;
  for (let i = steps - 1; i >= 0; i--) {
    current.volume = (start * i) / steps;
    await sleep(stepMs);
  }
  current.pause();
  current.release();
  if (player === current) player = null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function startBgm() {
  if (muted || starting || player) return;
  starting = true;
  try {
    await initBgm();
    if (muted) return;

    const next = createAudioPlayer(BGM_FILE);
    next.loop = true;
    next.volume = 0;
    player = next;
    next.play();
    await fadeTo(VOLUME);
  } catch {
    player?.release();
    player = null;
  } finally {
    starting = false;
  }
}

export async function stopBgm() {
  starting = false;
  if (!player) return;
  try {
    await fadeOutAndStop();
  } catch {
    player?.release();
    player = null;
  }
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
    if (!player.playing) {
      player.play();
    }
  } catch {
    // ignore
  }
}
