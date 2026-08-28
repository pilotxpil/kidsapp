/**
 * Generate original 8-bit SFX inspired by block-game UI / XP / item pickups.
 * Not copied from any commercial game assets.
 */
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const outDir = path.join(__dirname, '../apps/mobile/assets/sfx');

function wav(samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

function tone(freq, dur, vol = 0.35, type = 'square') {
  const n = Math.floor(RATE * dur);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const attack = Math.min(1, i / (RATE * 0.004));
    const release = Math.max(0, 1 - (i - n * 0.6) / (n * 0.4));
    const env = attack * Math.max(0, release);
    let s = Math.sin(2 * Math.PI * freq * t);
    if (type === 'square') s = s >= 0 ? 1 : -1;
    if (type === 'noise') s = Math.random() * 2 - 1;
    if (type === 'sine') s = Math.sin(2 * Math.PI * freq * t);
    out[i] = s * vol * env;
  }
  return out;
}

function silence(dur) {
  return new Array(Math.floor(RATE * dur)).fill(0);
}

function concat(...parts) {
  return parts.flat();
}

fs.mkdirSync(outDir, { recursive: true });

// UI button click — short inventory-style pop
fs.writeFileSync(
  path.join(outDir, 'tap.wav'),
  wav(tone(620, 0.035, 0.25, 'square'))
);

// XP orb pickup — rapid ascending green sparkle
fs.writeFileSync(
  path.join(outDir, 'complete.wav'),
  wav(
    concat(
      tone(330, 0.05, 0.22, 'square'),
      tone(440, 0.05, 0.24, 'square'),
      tone(554, 0.06, 0.26, 'square'),
      tone(659, 0.08, 0.24, 'square'),
      tone(880, 0.1, 0.2, 'square')
    )
  )
);

// Diamond pickup — bright high chime
fs.writeFileSync(
  path.join(outDir, 'gem.wav'),
  wav(
    concat(
      tone(988, 0.05, 0.28, 'sine'),
      tone(1319, 0.06, 0.3, 'sine'),
      tone(1760, 0.1, 0.26, 'sine'),
      tone(2093, 0.12, 0.22, 'sine')
    )
  )
);

// Emerald / coin pickup
fs.writeFileSync(
  path.join(outDir, 'coin.wav'),
  wav(
    concat(
      tone(784, 0.04, 0.26, 'square'),
      tone(988, 0.05, 0.28, 'square'),
      tone(1175, 0.08, 0.26, 'square')
    )
  )
);

// Damage / error — low thud
fs.writeFileSync(
  path.join(outDir, 'error.wav'),
  wav(
    concat(
      tone(120, 0.08, 0.32, 'square'),
      tone(80, 0.14, 0.28, 'square'),
      silence(0.02)
    )
  )
);

console.log('Wrote Minecraft-inspired SFX to', outDir);
