/**
 * KidsQuest audio generator — every sound in the app is synthesized here from code, so the
 * music and effects are 100% original (no samples, no licences).
 *
 *   node scripts/audio/synth.mjs            # writes assets/bgm/*.mp3, assets/sfx/<world>/*.wav, lib/sfx-files.ts
 *
 * Needs `lame` (brew install lame) for the music MP3s.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TAU = Math.PI * 2;

// ─── basics ──────────────────────────────────────────────────────────────────
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const noiseGen = rng(1234);
const noise = () => noiseGen() * 2 - 1;

function polyblep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}
function saw(phase, dt) {
  return 2 * phase - 1 - polyblep(phase, dt);
}
function square(phase, dt, pw = 0.5) {
  let v = phase < pw ? 1 : -1;
  v += polyblep(phase, dt);
  v -= polyblep((phase + 1 - pw) % 1, dt);
  return v;
}
function tri(phase) {
  return 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25));
}

class OnePole {
  constructor(sr, hz) {
    this.sr = sr;
    this.z = 0;
    this.set(hz);
  }
  set(hz) {
    this.a = Math.exp((-TAU * Math.min(hz, this.sr * 0.45)) / this.sr);
  }
  lp(x) {
    this.z = x * (1 - this.a) + this.z * this.a;
    return this.z;
  }
  hp(x) {
    return x - this.lp(x);
  }
}
class Biquad {
  constructor(sr, type, hz, q = 0.707) {
    const w = (TAU * hz) / sr;
    const c = Math.cos(w);
    const s = Math.sin(w);
    const al = s / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') {
      b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2;
    } else if (type === 'hp') {
      b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2;
    } else {
      b0 = al; b1 = 0; b2 = -al; // band-pass (constant peak gain)
    }
    const a0 = 1 + al;
    this.b = [b0 / a0, b1 / a0, b2 / a0];
    this.a = [(-2 * c) / a0, (1 - al) / a0];
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  run(x) {
    const y = this.b[0] * x + this.b[1] * this.x1 + this.b[2] * this.x2 - this.a[0] * this.y1 - this.a[1] * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

function adsr(t, dur, a, d, s, r) {
  if (t < 0) return 0;
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur) return s;
  const rt = t - dur;
  return rt < r ? s * (1 - rt / r) : 0;
}

// ─── instruments: each adds into `buf` at sample `at` ───────────────────────
const INSTR = {
  marimba(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * Math.min(1.6, dur + 0.9));
    const parts = [[1, 1, 3.2], [3.93, 0.32, 9], [9.2, 0.08, 20]];
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      let v = 0;
      for (const [m, amp, dec] of parts) v += amp * Math.sin(TAU * f * m * t) * Math.exp(-dec * t);
      v *= Math.min(1, t / 0.002);
      buf[at + i] += v * vel * 0.55;
    }
  },
  kalimba(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * 1.4);
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      const v = (Math.sin(TAU * f * t) + 0.22 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-14 * t)) * Math.exp(-3.4 * t);
      buf[at + i] += v * Math.min(1, t / 0.003) * vel * 0.5;
    }
  },
  musicbox(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * 1.8);
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      const v =
        (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2.01 * t) * Math.exp(-4 * t) + 0.12 * Math.sin(TAU * f * 3.03 * t) * Math.exp(-7 * t)) *
        Math.exp(-2.6 * t);
      buf[at + i] += v * Math.min(1, t / 0.002) * vel * 0.42;
    }
  },
  bell(buf, sr, at, f, dur, vel, o = {}) {
    const ratio = o.ratio ?? 3.5;
    const n = Math.floor(sr * (o.len ?? 2.0));
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      const idx = (o.index ?? 2.4) * Math.exp(-6 * t);
      const v = Math.sin(TAU * f * t + idx * Math.sin(TAU * f * ratio * t)) * Math.exp(-(o.decay ?? 2.4) * t);
      buf[at + i] += v * Math.min(1, t / 0.002) * vel * 0.4;
    }
  },
  steelpan(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * 1.5);
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      const idx = 1.6 * Math.exp(-5 * t);
      const v =
        (Math.sin(TAU * f * t + idx * Math.sin(TAU * f * 2 * t)) + 0.3 * Math.sin(TAU * f * 2.02 * t) * Math.exp(-6 * t)) *
        Math.exp(-2.8 * t);
      buf[at + i] += v * Math.min(1, t / 0.004) * vel * 0.45;
    }
  },
  pluck(buf, sr, at, f, dur, vel, o = {}) {
    // Karplus–Strong string
    const len = Math.max(2, Math.round(sr / f));
    const line = new Float32Array(len);
    for (let i = 0; i < len; i++) line[i] = noise();
    const n = Math.floor(sr * Math.min(2, dur + (o.ring ?? 0.8)));
    const damp = o.damp ?? 0.996;
    let idx = 0;
    const lp = new OnePole(sr, o.tone ?? 4000);
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const cur = line[idx];
      const next = line[(idx + 1) % len];
      line[idx] = damp * 0.5 * (cur + next);
      idx = (idx + 1) % len;
      buf[at + i] += lp.lp(cur) * vel * 0.5;
    }
  },
  lead(buf, sr, at, f, dur, vel, o = {}) {
    const n = Math.floor(sr * (dur + 0.12));
    const lp = new OnePole(sr, o.tone ?? Math.min(6000, f * 4));
    let ph = 0;
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      const vib = t > 0.14 ? 1 + 0.006 * Math.sin(TAU * 5.6 * t) : 1;
      const ff = f * vib;
      ph = (ph + ff / sr) % 1;
      const raw = o.wave === 'saw' ? saw(ph, ff / sr) : square(ph, ff / sr, o.pw ?? 0.32);
      buf[at + i] += lp.lp(raw) * adsr(t, dur, 0.008, 0.09, 0.55, 0.1) * vel * 0.22;
    }
  },
  pad(buf, sr, at, f, dur, vel, o = {}) {
    const n = Math.floor(sr * (dur + 0.6));
    const lp = new OnePole(sr, o.tone ?? 1600);
    const det = [0.994, 1, 1.007];
    const ph = [0.1, 0.4, 0.7];
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      let v = 0;
      for (let k = 0; k < 3; k++) {
        const ff = f * det[k];
        ph[k] = (ph[k] + ff / sr) % 1;
        v += saw(ph[k], ff / sr);
      }
      buf[at + i] += lp.lp(v / 3) * adsr(t, dur, o.attack ?? 0.25, 0.3, 0.8, 0.55) * vel * 0.2;
    }
  },
  arp(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * (dur + 0.25));
    let ph = 0;
    const lp = new OnePole(sr, 3000);
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      lp.set(600 + 4200 * Math.exp(-9 * t));
      ph = (ph + f / sr) % 1;
      buf[at + i] += lp.lp(saw(ph, f / sr)) * adsr(t, dur, 0.004, 0.12, 0.35, 0.18) * vel * 0.24;
    }
  },
  bass(buf, sr, at, f, dur, vel, o = {}) {
    const n = Math.floor(sr * (dur + 0.08));
    let ph = 0;
    const lp = new OnePole(sr, o.tone ?? 700);
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      ph = (ph + f / sr) % 1;
      const raw = o.wave === 'saw' ? saw(ph, f / sr) * 0.7 : 0.75 * tri(ph) + 0.35 * square(ph, f / sr);
      buf[at + i] += lp.lp(raw) * adsr(t, dur, 0.005, 0.12, 0.7, 0.06) * vel * 0.42;
    }
  },
  // ─ drums (f ignored unless noted)
  kick(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * 0.35);
    let ph = 0;
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      const ff = 45 + 110 * Math.exp(-28 * t);
      ph += ff / sr;
      buf[at + i] += Math.sin(TAU * ph) * Math.exp(-9 * t) * vel * 0.9;
    }
  },
  taiko(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * 0.6);
    let ph = 0;
    const lp = new OnePole(sr, 900);
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      const ff = (f || 70) * (1 + 0.6 * Math.exp(-30 * t));
      ph += ff / sr;
      const v = Math.sin(TAU * ph) * Math.exp(-6 * t) + lp.lp(noise()) * Math.exp(-35 * t) * 0.8;
      buf[at + i] += v * vel * 0.8;
    }
  },
  snare(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * 0.22);
    const hp = new OnePole(sr, 1200);
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      const v = hp.hp(noise()) * Math.exp(-18 * t) * 0.8 + Math.sin(TAU * 190 * t) * Math.exp(-30 * t) * 0.5;
      buf[at + i] += v * vel * 0.5;
    }
  },
  clap(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * 0.25);
    const bp = new Biquad(sr, 'bp', 1400, 1.1);
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      const bursts = Math.exp(-80 * (t % 0.011)) * (t < 0.033 ? 1 : 0) + (t >= 0.033 ? Math.exp(-14 * (t - 0.033)) : 0);
      buf[at + i] += bp.run(noise()) * bursts * vel * 0.9;
    }
  },
  hat(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * 0.06);
    const hp = new Biquad(sr, 'hp', 7000);
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      buf[at + i] += hp.run(noise()) * Math.exp(-70 * t) * vel * 0.35;
    }
  },
  shaker(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * 0.08);
    const bp = new Biquad(sr, 'bp', 5200, 1.4);
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.012) * Math.exp(-45 * t);
      buf[at + i] += bp.run(noise()) * env * vel * 0.5;
    }
  },
  wood(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * 0.12);
    const ff = f || 880;
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      buf[at + i] += (Math.sin(TAU * ff * t) + 0.4 * Math.sin(TAU * ff * 2.7 * t)) * Math.exp(-45 * t) * vel * 0.5;
    }
  },
  conga(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * 0.3);
    let ph = 0;
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      const ff = (f || 220) * (1 + 0.25 * Math.exp(-40 * t));
      ph += ff / sr;
      buf[at + i] += Math.sin(TAU * ph) * Math.exp(-11 * t) * vel * 0.6;
    }
  },
  bubble(buf, sr, at, f, dur, vel) {
    const n = Math.floor(sr * 0.14);
    let ph = 0;
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / sr;
      const ff = (f || 400) * (1 + 2.2 * (t / 0.14));
      ph += ff / sr;
      buf[at + i] += Math.sin(TAU * ph) * Math.sin(Math.PI * (t / 0.14)) * vel * 0.4;
    }
  },
};

// ─── effects / mix ───────────────────────────────────────────────────────────
function reverb(input, sr, { room = 0.82, damp = 0.35, wet = 0.22 } = {}) {
  const scale = sr / 44100;
  const combs = [1116, 1188, 1277, 1356].map((d) => ({ buf: new Float32Array(Math.round(d * scale)), i: 0, f: 0 }));
  const alls = [556, 441].map((d) => ({ buf: new Float32Array(Math.round(d * scale)), i: 0 }));
  const out = new Float32Array(input.length);
  for (let n = 0; n < input.length; n++) {
    const x = input[n] * 0.18;
    let y = 0;
    for (const c of combs) {
      const o = c.buf[c.i];
      c.f = o * (1 - damp) + c.f * damp;
      c.buf[c.i] = x + c.f * room;
      c.i = (c.i + 1) % c.buf.length;
      y += o;
    }
    for (const a of alls) {
      const o = a.buf[a.i];
      a.buf[a.i] = y + o * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      y = o - y;
    }
    out[n] = input[n] + y * wet * 3;
  }
  return out;
}

function echo(input, sr, { time = 0.3, fb = 0.35, mix = 0.3 } = {}) {
  const d = Math.round(time * sr);
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const delayed = i >= d ? out[i - d] : 0;
    out[i] = input[i] + delayed * fb;
  }
  for (let i = 0; i < input.length; i++) out[i] = input[i] * (1 - mix) + out[i] * mix;
  return out;
}

function master(buf, peak = 0.9) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  const g = max > 0 ? (peak * 1.25) / max : 1;
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = Math.tanh(buf[i] * g) * (peak / Math.tanh(1.25));
  return out;
}

function writeWav(file, data, sr) {
  const n = data.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(data[i] * 32767))), 44 + i * 2);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, b);
}

// ─── composition helpers ─────────────────────────────────────────────────────
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};
// chord = [root midi, quality]; tones relative to root
const QUAL = { maj: [0, 4, 7], min: [0, 3, 7], sus: [0, 5, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10] };

function scaleNotes(tonic, mode, lo, hi) {
  const out = [];
  for (let n = lo; n <= hi; n++) if (SCALES[mode].includes((((n - tonic) % 12) + 12) % 12)) out.push(n);
  return out;
}

/** Motif-based melody: chord tones on strong beats, stepwise passing tones elsewhere, phrase ends resolve. */
function melody(world, chords, rhythmA, rhythmB, seed) {
  const r = rng(seed);
  const notes = scaleNotes(world.tonic, world.mode, world.melLo, world.melHi);
  const ev = [];
  let prev = notes[Math.floor(notes.length / 2)];
  const nearest = (target, pool) => pool.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
  let motifCache = null;
  chords.forEach((ch, bar) => {
    const section = bar < chords.length / 2 ? 'A' : 'B';
    const rhythm = section === 'A' ? rhythmA : rhythmB;
    const tones = QUAL[ch[1]].map((x) => ch[0] + x);
    const chordPool = notes.filter((n) => tones.some((t) => (((n - t) % 12) + 12) % 12 === 0));
    const phraseEnd = bar % 4 === 3;
    // Repeat the opening motif shape on bars 0, 4 (A) and 8, 12 (B) → memorable hooks.
    const reuse = bar % 4 === 2 && motifCache && section === motifCache.section;
    let t = 0;
    rhythm.forEach((dur, k) => {
      if (dur < 0) {
        t += -dur; // rest
        return;
      }
      const strong = Math.abs(t - Math.round(t)) < 1e-6;
      let n;
      if (reuse && motifCache.notes[k] !== undefined) {
        n = nearest(motifCache.notes[k] + (tones[0] - motifCache.root), notes);
      } else if (phraseEnd && k === rhythm.length - 1) {
        const pc = (x) => ((x % 12) + 12) % 12;
        const landing = chordPool.filter((x) => pc(x) === pc(world.tonic) || pc(x) === pc(tones[0]) || pc(x) === pc(tones[1]));
        n = nearest(prev, landing.length ? landing : chordPool.length ? chordPool : notes);
      } else if (strong) {
        const cands = chordPool.filter((x) => Math.abs(x - prev) <= 7);
        n = cands.length ? cands[Math.floor(r() * cands.length)] : nearest(prev, chordPool.length ? chordPool : notes);
      } else {
        const i = notes.indexOf(nearest(prev, notes));
        const step = r() < 0.5 ? 1 : -1;
        n = notes[Math.max(0, Math.min(notes.length - 1, i + step * (r() < 0.8 ? 1 : 2)))];
      }
      ev.push({ beat: bar * 4 + t, dur: dur * 0.92, note: n, vel: strong ? 0.95 : 0.75 });
      if (bar % 4 === 0) {
        motifCache = motifCache && motifCache.bar === bar ? motifCache : { bar, section, root: tones[0], notes: [] };
        motifCache.notes[k] = n;
      }
      prev = n;
      t += dur;
    });
  });
  return ev;
}

function renderTrack(world) {
  const sr = 32000;
  const spb = 60 / world.bpm;
  const bars = world.chords.length;
  const loopSec = bars * 4 * spb;
  const total = Math.ceil(loopSec * 2 * sr) + sr * 2;
  const stems = { lead: new Float32Array(total), harm: new Float32Array(total), bass: new Float32Array(total), drums: new Float32Array(total), fx: new Float32Array(total) };
  const at = (beat) => Math.round(beat * spb * sr);
  const swing = (beat) => (world.swing && Math.abs((beat % 1) - 0.5) < 1e-6 ? beat + world.swing : beat);

  const mel = melody(world, world.chords, world.rhythmA, world.rhythmB, world.seed);
  for (let pass = 0; pass < 2; pass++) {
    const off = pass * bars * 4;
    for (const e of mel) {
      INSTR[world.leadInstr](stems.lead, sr, at(swing(e.beat) + off), midi(e.note), e.dur * spb, e.vel * world.mix.lead, world.leadOpts);
    }
    world.chords.forEach((ch, bar) => {
      const tones = QUAL[ch[1]].map((x) => ch[0] + x);
      const b0 = off + bar * 4;
      world.harmony(stems.harm, sr, at, tones, b0, spb, swing);
      world.bassline(stems.bass, sr, at, ch[0], tones, b0, spb, swing, bar);
      world.drums(stems.drums, sr, at, b0, bar, swing);
      if (world.fx) world.fx(stems.fx, sr, at, b0, bar, tones);
    });
  }
  const mix = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    mix[i] = stems.lead[i] + stems.harm[i] * world.mix.harm + stems.bass[i] * world.mix.bass + stems.drums[i] * world.mix.drums + stems.fx[i] * (world.mix.fx ?? 0.3);
  }
  let wet = world.echo ? echo(mix, sr, world.echo) : mix;
  wet = reverb(wet, sr, world.reverb);
  // Second pass = steady state (first pass's tail flows into it) → seamless loop.
  const start = Math.round(loopSec * sr);
  const loop = wet.slice(start, start + Math.round(loopSec * sr));
  return { data: master(loop, 0.86), sr, loopSec };
}

// ─── the five worlds ─────────────────────────────────────────────────────────
const C = (n, q = 'maj') => [n, q];
const WORLDS = {
  // Ocean — breezy marimba, bubbly, relaxed swing
  ocean: {
    bpm: 100, tonic: 60, mode: 'major', melLo: 72, melHi: 88, seed: 11, swing: 0.06,
    chords: [C(60), C(57, 'min'), C(53), C(55), C(60), C(57, 'min'), C(53), C(55), C(53), C(55), C(52, 'min'), C(57, 'min'), C(53), C(55), C(60), C(60)],
    rhythmA: [1, 0.5, 0.5, 1, 1], rhythmB: [1.5, 0.5, 1, -0.5, 0.5],
    leadInstr: 'marimba', leadOpts: {},
    harmony(buf, sr, at, tones, b0, spb, sw) {
      [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) => INSTR.pluck(buf, sr, at(sw(b0 + i * 0.5)), midi(tones[i % 3] + 60 - (tones[0] >= 60 ? 12 : 0)), 0.4, 0.5, { tone: 2600, ring: 0.5 }));
    },
    bassline(buf, sr, at, root, tones, b0, spb) {
      const r = root - 24 + (root >= 60 ? -12 : 0);
      INSTR.bass(buf, sr, at(b0), midi(r), spb * 1.4, 0.9);
      INSTR.bass(buf, sr, at(b0 + 2), midi(r + 7), spb * 0.9, 0.7);
      INSTR.bass(buf, sr, at(b0 + 3), midi(r + 12), spb * 0.5, 0.6);
    },
    drums(buf, sr, at, b0, bar, sw) {
      INSTR.kick(buf, sr, at(b0), 0, 0, 0.7);
      INSTR.kick(buf, sr, at(b0 + 2.5), 0, 0, 0.45);
      INSTR.wood(buf, sr, at(b0 + 1), 1300, 0, 0.35);
      INSTR.wood(buf, sr, at(b0 + 3), 1300, 0, 0.35);
      for (let i = 0; i < 8; i++) INSTR.shaker(buf, sr, at(sw(b0 + i * 0.5)), 0, 0, i % 2 ? 0.35 : 0.55);
    },
    fx(buf, sr, at, b0, bar) {
      if (bar % 2 === 1) for (let k = 0; k < 3; k++) INSTR.bubble(buf, sr, at(b0 + 3 + k * 0.17), 300 + k * 140, 0, 0.5);
    },
    mix: { lead: 1, harm: 0.55, bass: 0.8, drums: 0.7, fx: 0.4 },
    reverb: { room: 0.8, damp: 0.4, wet: 0.24 },
  },
  // Volcano — taiko-driven, heroic square lead, dorian minor
  volcano: {
    bpm: 124, tonic: 62, mode: 'dorian', melLo: 69, melHi: 86, seed: 23,
    chords: [C(62, 'min'), C(60), C(58), C(60), C(62, 'min'), C(60), C(58), C(57), C(55, 'min'), C(62, 'min'), C(58), C(60), C(55, 'min'), C(57), C(62, 'min'), C(62, 'min')],
    rhythmA: [0.75, 0.75, 0.5, 1, 1], rhythmB: [0.5, 0.5, 0.5, 0.5, 1, 1],
    leadInstr: 'lead', leadOpts: { pw: 0.28, tone: 3800 },
    harmony(buf, sr, at, tones, b0, spb) {
      tones.slice(0, 3).forEach((t) => INSTR.pad(buf, sr, at(b0), midi(t - 12), spb * 3.8, 0.55, { tone: 1400, attack: 0.05 }));
    },
    bassline(buf, sr, at, root, tones, b0, spb) {
      const r = root - 24;
      for (let i = 0; i < 8; i++) INSTR.bass(buf, sr, at(b0 + i * 0.5), midi(i === 7 ? r + 7 : r), spb * 0.42, i % 2 ? 0.6 : 0.85, { wave: 'saw', tone: 900 });
    },
    drums(buf, sr, at, b0, bar) {
      INSTR.taiko(buf, sr, at(b0), 62, 0, 1);
      INSTR.taiko(buf, sr, at(b0 + 1.5), 62, 0, 0.6);
      INSTR.taiko(buf, sr, at(b0 + 2), 62, 0, 0.9);
      INSTR.snare(buf, sr, at(b0 + 1), 0, 0, 0.6);
      INSTR.snare(buf, sr, at(b0 + 3), 0, 0, 0.7);
      for (let i = 0; i < 8; i++) INSTR.hat(buf, sr, at(b0 + i * 0.5), 0, 0, i % 2 ? 0.18 : 0.3);
      if (bar % 4 === 3) [3, 3.25, 3.5, 3.75].forEach((b, k) => INSTR.taiko(buf, sr, at(b0 + b), 95 + k * 12, 0, 0.7));
    },
    mix: { lead: 1, harm: 0.38, bass: 0.7, drums: 0.75 },
    reverb: { room: 0.78, damp: 0.45, wet: 0.2 },
  },
  // Jungle — steelpan + kalimba, congas, bouncy mixolydian
  jungle: {
    bpm: 112, tonic: 67, mode: 'mixolydian', melLo: 74, melHi: 91, seed: 37, swing: 0.08,
    chords: [C(67), C(65), C(60), C(67), C(67), C(65), C(60), C(62), C(64, 'min'), C(60), C(62), C(67), C(64, 'min'), C(60), C(62), C(67)],
    rhythmA: [0.5, 0.5, 1, 0.5, 0.5, 1], rhythmB: [1, 0.5, 0.5, 1.5, 0.5],
    leadInstr: 'steelpan', leadOpts: {},
    harmony(buf, sr, at, tones, b0, spb, sw) {
      [0, 1.5, 2, 3.5].forEach((b, i) => INSTR.kalimba(buf, sr, at(sw(b0 + b)), midi(tones[(i + 1) % 3] + (tones[0] > 64 ? -12 : 0)), 0.3, 0.55));
    },
    bassline(buf, sr, at, root, tones, b0, spb, sw) {
      const r = root - 24 - (root > 64 ? 12 : 0);
      [[0, 0], [1.5, 7], [2, 12], [3, 7]].forEach(([b, iv]) => INSTR.bass(buf, sr, at(sw(b0 + b)), midi(r + iv), spb * 0.45, 0.8));
    },
    drums(buf, sr, at, b0, bar, sw) {
      INSTR.kick(buf, sr, at(b0), 0, 0, 0.6);
      INSTR.kick(buf, sr, at(b0 + 2), 0, 0, 0.5);
      [0.5, 1.5, 2.5, 3, 3.5].forEach((b, k) => INSTR.conga(buf, sr, at(sw(b0 + b)), k % 2 ? 300 : 220, 0, 0.55));
      [1, 3].forEach((b) => INSTR.wood(buf, sr, at(b0 + b), 1050, 0, 0.4));
      for (let i = 0; i < 16; i++) INSTR.shaker(buf, sr, at(b0 + i * 0.25), 0, 0, i % 4 === 2 ? 0.6 : 0.3);
    },
    mix: { lead: 1, harm: 0.6, bass: 0.75, drums: 0.7 },
    reverb: { room: 0.76, damp: 0.5, wet: 0.18 },
  },
  // Space — dreamy pads, filtered arps with echo, bell lead, lydian float
  space: {
    bpm: 92, tonic: 65, mode: 'lydian', melLo: 72, melHi: 89, seed: 51,
    chords: [C(65, 'maj7'), C(67), C(64, 'min'), C(69, 'min'), C(65, 'maj7'), C(67), C(64, 'min'), C(62, 'min'), C(65, 'maj7'), C(67), C(69, 'min7'), C(64, 'min'), C(62, 'min7'), C(67), C(65, 'maj7'), C(65, 'maj7')],
    rhythmA: [2, 1, 1], rhythmB: [1, 1, 1.5, 0.5],
    leadInstr: 'bell', leadOpts: { ratio: 1.41, index: 1.6, decay: 1.4, len: 2.6 },
    harmony(buf, sr, at, tones, b0, spb) {
      tones.slice(0, 3).forEach((t) => INSTR.pad(buf, sr, at(b0), midi(t - 12), spb * 3.9, 0.6, { tone: 1100, attack: 0.6 }));
      for (let i = 0; i < 16; i++) INSTR.arp(buf, sr, at(b0 + i * 0.25), midi(tones[[0, 1, 2, 1][i % 4]] + (i % 8 >= 4 ? 12 : 0)), spb * 0.22, 0.45);
    },
    bassline(buf, sr, at, root, tones, b0, spb) {
      INSTR.bass(buf, sr, at(b0), midi(root - 24), spb * 3.6, 0.8, { tone: 420 });
    },
    drums(buf, sr, at, b0) {
      INSTR.kick(buf, sr, at(b0), 0, 0, 0.55);
      INSTR.clap(buf, sr, at(b0 + 2), 0, 0, 0.35);
      for (let i = 0; i < 8; i++) INSTR.hat(buf, sr, at(b0 + i * 0.5 + 0.25), 0, 0, 0.35);
    },
    fx(buf, sr, at, b0, bar, tones) {
      if (bar % 4 === 3) [0, 0.25, 0.5, 0.75, 1].forEach((b, k) => INSTR.bell(buf, sr, at(b0 + 3 + b * 0.25), midi(tones[0] + 24 + k * 2), 0.2, 0.25, { ratio: 3.5, decay: 4 }));
    },
    mix: { lead: 0.9, harm: 0.55, bass: 0.7, drums: 0.6, fx: 0.5 },
    echo: { time: (60 / 92) * 0.75, fb: 0.38, mix: 0.28 },
    reverb: { room: 0.88, damp: 0.3, wet: 0.32 },
  },
  // Candy — music box + glock, claps, sugar-rush tempo
  candy: {
    bpm: 132, tonic: 65, mode: 'major', melLo: 77, melHi: 93, seed: 67,
    chords: [C(65), C(62, 'min'), C(58), C(60), C(65), C(62, 'min'), C(58), C(60), C(55, 'min'), C(60), C(65), C(62, 'min'), C(58), C(60), C(65), C(65)],
    rhythmA: [0.5, 0.5, 0.5, 0.5, 1, 1], rhythmB: [1, 0.5, 0.5, 0.5, 0.5, 1],
    leadInstr: 'musicbox', leadOpts: {},
    harmony(buf, sr, at, tones, b0, spb) {
      [0.5, 1.5, 2.5, 3.5].forEach((b) => tones.slice(0, 3).forEach((t) => INSTR.pluck(buf, sr, at(b0 + b), midi(t + (t >= 62 ? -12 : 0) + 12), 0.2, 0.32, { tone: 3200, ring: 0.25, damp: 0.99 })));
    },
    bassline(buf, sr, at, root, tones, b0, spb) {
      const r = root - 24;
      [[0, 0], [1, 12], [2, 7], [3, 12]].forEach(([b, iv]) => INSTR.bass(buf, sr, at(b0 + b), midi(r + iv), spb * 0.4, 0.75, { tone: 900 }));
    },
    drums(buf, sr, at, b0, bar) {
      for (let i = 0; i < 4; i++) INSTR.kick(buf, sr, at(b0 + i), 0, 0, 0.55);
      INSTR.clap(buf, sr, at(b0 + 1), 0, 0, 0.6);
      INSTR.clap(buf, sr, at(b0 + 3), 0, 0, 0.6);
      for (let i = 0; i < 8; i++) INSTR.hat(buf, sr, at(b0 + i * 0.5 + 0.5), 0, 0, 0.45);
    },
    fx(buf, sr, at, b0, bar, tones) {
      if (bar % 4 === 1) for (let k = 0; k < 6; k++) INSTR.bell(buf, sr, at(b0 + 3 + k * 0.12), midi(tones[k % 3] + 24 + Math.floor(k / 3) * 12), 0.1, 0.3, { ratio: 3.5, decay: 5, len: 0.8 });
    },
    mix: { lead: 1, harm: 0.45, bass: 0.7, drums: 0.65, fx: 0.4 },
    reverb: { room: 0.72, damp: 0.4, wet: 0.18 },
  },
};

// ─── sound effects ───────────────────────────────────────────────────────────
const SFX_SR = 22050;
const sfxBuf = (sec) => new Float32Array(Math.round(sec * SFX_SR));
const sAt = (sec) => Math.round(sec * SFX_SR);
function sweep(buf, startSec, durSec, f0, f1, wave, vel, decay = 6) {
  const n = Math.round(durSec * SFX_SR);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SFX_SR;
    const f = f0 * Math.pow(f1 / f0, t / durSec);
    ph = (ph + f / SFX_SR) % 1;
    const w = wave === 'sq' ? square(ph, f / SFX_SR, 0.4) : wave === 'tri' ? tri(ph) : Math.sin(TAU * ph);
    const env = Math.min(1, t / 0.004) * Math.exp(-decay * t) * Math.min(1, (durSec - t) / 0.01);
    const k = sAt(startSec) + i;
    if (k < buf.length) buf[k] += w * env * vel;
  }
}
function noiseBurst(buf, startSec, durSec, filter, vel, shape = 'decay') {
  const n = Math.round(durSec * SFX_SR);
  for (let i = 0; i < n; i++) {
    const t = i / SFX_SR;
    const env = shape === 'swell' ? Math.sin(Math.PI * (t / durSec)) : Math.min(1, t / 0.003) * Math.exp((-5 * t) / durSec);
    const k = sAt(startSec) + i;
    if (k < buf.length) buf[k] += filter(noise(), t) * env * vel;
  }
}
const notes = (instr, buf, seq, opts) => seq.forEach(([sec, m, vel = 0.9]) => INSTR[instr](buf, SFX_SR, sAt(sec), midi(m), 0.25, vel, opts));

/** Each world gets its own instrument family so a tap already tells you which world you're in. */
const SFX = {
  ocean: {
    tap: (b = sfxBuf(0.16)) => (sweep(b, 0, 0.12, 380, 1100, 'sine', 0.8, 10), b),
    whoosh: (b = sfxBuf(0.4)) => {
      const bp = new Biquad(SFX_SR, 'bp', 900, 0.8);
      noiseBurst(b, 0, 0.38, (x) => bp.run(x), 0.9, 'swell');
      sweep(b, 0.05, 0.12, 300, 800, 'sine', 0.3, 12);
      return b;
    },
    coin: (b = sfxBuf(0.7)) => (notes('marimba', b, [[0, 84], [0.08, 91]]), b),
    gem: (b = sfxBuf(1.2)) => (notes('bell', b, [[0, 96, 0.7], [0.06, 100, 0.6], [0.12, 103, 0.6]], { ratio: 3.5 }), b),
    complete: (b = sfxBuf(1.1)) => (notes('marimba', b, [[0, 72], [0.09, 76], [0.18, 79], [0.27, 84, 1]]), b),
    error: (b = sfxBuf(0.5)) => (notes('marimba', b, [[0, 62], [0.13, 56]]), sweep(b, 0, 0.3, 300, 150, 'sine', 0.3, 8), b),
    cheer: (b = sfxBuf(1.6)) => {
      notes('marimba', b, [[0, 72], [0.07, 76], [0.14, 79], [0.21, 84], [0.28, 88], [0.35, 91, 1]]);
      for (let k = 0; k < 8; k++) INSTR.bubble(b, SFX_SR, sAt(0.4 + k * 0.07), midi(70 + k * 3), 0, 0.5);
      return b;
    },
    stars: [79, 84, 88, 91].map((m) => (b = sfxBuf(0.7)) => (notes('marimba', b, [[0, m]]), INSTR.bubble(b, SFX_SR, 0, midi(m - 12), 0, 0.4), b)),
  },
  volcano: {
    tap: (b = sfxBuf(0.14)) => {
      const lp = new OnePole(SFX_SR, 1400);
      noiseBurst(b, 0, 0.08, (x) => lp.lp(x), 0.9);
      sweep(b, 0, 0.1, 210, 120, 'sine', 0.8, 30);
      return b;
    },
    whoosh: (b = sfxBuf(0.45)) => {
      const lp = new OnePole(SFX_SR, 300);
      noiseBurst(b, 0, 0.42, (x, t) => (lp.set(300 + 3500 * (t / 0.42)), lp.lp(x)), 1.1, 'swell');
      return b;
    },
    coin: (b = sfxBuf(0.8)) => (notes('bell', b, [[0, 81], [0.07, 88]], { ratio: 2.76, index: 3, decay: 3.2 }), b),
    gem: (b = sfxBuf(1.2)) => (notes('bell', b, [[0, 93, 0.7], [0.07, 98, 0.7]], { ratio: 4.1, decay: 2.5 }), b),
    complete: (b = sfxBuf(1.2)) => {
      INSTR.taiko(b, SFX_SR, 0, 70, 0, 1);
      notes('lead', b, [[0.05, 62, 0.8], [0.15, 66, 0.8], [0.25, 69, 0.8], [0.35, 74, 1]], { pw: 0.3, tone: 4000 });
      return b;
    },
    error: (b = sfxBuf(0.6)) => (INSTR.taiko(b, SFX_SR, 0, 50, 0, 1), sweep(b, 0, 0.45, 160, 70, 'sq', 0.25, 5), b),
    cheer: (b = sfxBuf(1.7)) => {
      [0, 0.1, 0.2, 0.3].forEach((s, k) => INSTR.taiko(b, SFX_SR, sAt(s), 70 + k * 10, 0, 0.8));
      [62, 66, 69, 74].forEach((m) => INSTR.pad(b, SFX_SR, sAt(0.4), midi(m), 0.8, 1, { attack: 0.02, tone: 2600 }));
      return b;
    },
    stars: [69, 74, 78, 81].map((m) => (b = sfxBuf(0.6)) => (notes('lead', b, [[0, m]], { pw: 0.25 }), INSTR.taiko(b, SFX_SR, 0, 90, 0, 0.5), b)),
  },
  jungle: {
    tap: (b = sfxBuf(0.12)) => (INSTR.wood(b, SFX_SR, 0, 1180, 0, 1), b),
    whoosh: (b = sfxBuf(0.4)) => {
      const bp = new Biquad(SFX_SR, 'bp', 3200, 1.2);
      noiseBurst(b, 0, 0.36, (x, t) => bp.run(x) * (0.6 + 0.4 * Math.sin(TAU * 28 * t)), 1, 'swell');
      return b;
    },
    coin: (b = sfxBuf(0.9)) => (notes('steelpan', b, [[0, 79], [0.09, 86]]), b),
    gem: (b = sfxBuf(1.1)) => (notes('kalimba', b, [[0, 91], [0.06, 95], [0.12, 98]]), b),
    complete: (b = sfxBuf(1.2)) => (notes('steelpan', b, [[0, 67], [0.09, 71], [0.18, 74], [0.27, 79, 1]]), INSTR.conga(b, SFX_SR, 0, 220, 0, 0.6), b),
    error: (b = sfxBuf(0.45)) => (INSTR.wood(b, SFX_SR, 0, 420, 0, 1), INSTR.wood(b, SFX_SR, sAt(0.12), 330, 0, 1), b),
    cheer: (b = sfxBuf(1.6)) => {
      notes('steelpan', b, [[0, 67], [0.07, 71], [0.14, 74], [0.21, 79], [0.28, 83], [0.35, 86, 1]]);
      for (let k = 0; k < 10; k++) INSTR.shaker(b, SFX_SR, sAt(0.35 + k * 0.08), 0, 0, 0.7);
      return b;
    },
    stars: [79, 83, 86, 91].map((m) => (b = sfxBuf(0.8)) => (notes('kalimba', b, [[0, m]]), INSTR.wood(b, SFX_SR, 0, 1500, 0, 0.4), b)),
  },
  space: {
    tap: (b = sfxBuf(0.12)) => (sweep(b, 0, 0.09, 1500, 380, 'sq', 0.45, 18), b),
    whoosh: (b = sfxBuf(0.55)) => {
      const bp = new Biquad(SFX_SR, 'bp', 1800, 2);
      noiseBurst(b, 0, 0.5, (x) => bp.run(x), 0.6, 'swell');
      sweep(b, 0, 0.5, 200, 1600, 'sine', 0.25, 2);
      return b;
    },
    coin: (b = sfxBuf(0.7)) => (notes('arp', b, [[0, 84], [0.06, 88], [0.12, 91]]), b),
    gem: (b = sfxBuf(1.4)) => {
      notes('bell', b, [[0, 96, 0.6], [0.09, 103, 0.5]], { ratio: 1.41, index: 2, decay: 1.8 });
      return b;
    },
    complete: (b = sfxBuf(1.3)) => {
      const tmp = sfxBuf(1.3);
      notes('arp', tmp, [[0, 72], [0.07, 76], [0.14, 79], [0.21, 84], [0.28, 88]]);
      const e = echo(tmp, SFX_SR, { time: 0.16, fb: 0.4, mix: 0.45 });
      b.set(e);
      return b;
    },
    error: (b = sfxBuf(0.45)) => (sweep(b, 0, 0.35, 220, 90, 'sq', 0.35, 4), b),
    cheer: (b = sfxBuf(1.8)) => {
      notes('arp', b, [[0, 72], [0.06, 76], [0.12, 79], [0.18, 84], [0.24, 88], [0.3, 91], [0.36, 96]]);
      sweep(b, 0.3, 1, 300, 2400, 'sine', 0.2, 2);
      return b;
    },
    stars: [84, 88, 91, 96].map((m) => (b = sfxBuf(0.8)) => {
      const tmp = sfxBuf(0.8);
      notes('arp', tmp, [[0, m]]);
      b.set(echo(tmp, SFX_SR, { time: 0.12, fb: 0.35, mix: 0.4 }));
      return b;
    }),
  },
  candy: {
    tap: (b = sfxBuf(0.12)) => (sweep(b, 0, 0.07, 1500, 700, 'sine', 0.7, 25), sweep(b, 0.005, 0.04, 2600, 2400, 'tri', 0.2, 40), b),
    whoosh: (b = sfxBuf(0.4)) => (sweep(b, 0, 0.32, 500, 1600, 'sine', 0.55, 1.5), b),
    coin: (b = sfxBuf(0.9)) => (notes('bell', b, [[0, 88], [0.07, 95]], { ratio: 3.5, decay: 3 }), b),
    gem: (b = sfxBuf(1.2)) => (notes('musicbox', b, [[0, 96], [0.05, 100], [0.1, 103]]), b),
    complete: (b = sfxBuf(1.3)) => (notes('musicbox', b, [[0, 77], [0.08, 81], [0.16, 84], [0.24, 89, 1]]), b),
    error: (b = sfxBuf(0.5)) => (sweep(b, 0, 0.4, 700, 220, 'tri', 0.5, 3), b),
    cheer: (b = sfxBuf(1.6)) => {
      notes('bell', b, [[0, 77], [0.06, 81], [0.12, 84], [0.18, 89], [0.24, 93], [0.3, 96]], { ratio: 3.5, decay: 3 });
      [0.45, 0.6].forEach((s) => INSTR.clap(b, SFX_SR, sAt(s), 0, 0, 0.7));
      return b;
    },
    stars: [84, 89, 93, 96].map((m) => (b = sfxBuf(0.8)) => (notes('musicbox', b, [[0, m]]), b)),
  },
};

// ─── build ───────────────────────────────────────────────────────────────────
function main() {
  const bgmDir = path.join(ROOT, 'assets/bgm');
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'kq-audio-'));
  for (const [name, world] of Object.entries(WORLDS)) {
    const { data, sr, loopSec } = renderTrack(world);
    const wav = path.join(tmp, `${name}.wav`);
    writeWav(wav, data, sr);
    execFileSync('lame', ['--quiet', '-m', 'm', '-V', '5', '--resample', String(sr / 1000), wav, path.join(bgmDir, `${name}.mp3`)]);
    console.log(`bgm ${name}.mp3  ${loopSec.toFixed(1)}s loop`);
  }
  const names = ['tap', 'whoosh', 'coin', 'gem', 'complete', 'error', 'cheer', 'star1', 'star2', 'star3', 'star4'];
  const lines = [];
  for (const [world, set] of Object.entries(SFX)) {
    for (const n of names) {
      const fn = n.startsWith('star') ? set.stars[Number(n.slice(4)) - 1] : set[n];
      const data = master(fn(), 0.8);
      writeWav(path.join(ROOT, `assets/sfx/${world}/${n}.wav`), data, SFX_SR);
    }
    lines.push(
      `  ${world}: {\n${names.map((n) => `    ${n}: require('../assets/sfx/${world}/${n}.wav'),`).join('\n')}\n  },`
    );
    console.log(`sfx ${world}: ${names.length} sounds`);
  }
  const ts = `/* Generated by scripts/audio/synth.mjs — do not edit by hand. */
export type SfxWorld = 'ocean' | 'volcano' | 'jungle' | 'space' | 'candy';
export type SfxKey = ${names.map((n) => `'${n}'`).join(' | ')};

export const SFX_FILES: Record<SfxWorld, Record<SfxKey, number>> = {
${lines.join('\n')}
};

export const BGM_FILES: Record<SfxWorld, number> = {
${Object.keys(WORLDS).map((w) => `  ${w}: require('../assets/bgm/${w}.mp3'),`).join('\n')}
};
`;
  fs.writeFileSync(path.join(ROOT, 'lib/sfx-files.ts'), ts);
  fs.rmSync(tmp, { recursive: true, force: true });
}

main();
