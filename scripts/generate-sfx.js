/**
 * Generate original 16-bit SFX (not from any commercial game).
 * Square/noise tones inspired by arcade / block / gem pickups.
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
    const attack = Math.min(1, i / (RATE * 0.008));
    const release = Math.max(0, 1 - i / n);
    const env = attack * release;
    let s = Math.sin(2 * Math.PI * freq * t);
    if (type === 'square') s = s >= 0 ? 1 : -1;
    if (type === 'noise') s = Math.random() * 2 - 1;
    if (type === 'sine') s = Math.sin(2 * Math.PI * freq * t);
    out[i] = s * vol * env;
  }
  return out;
}

function concat(...parts) {
  return parts.flat();
}

fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'tap.wav'), wav(tone(1400, 0.045, 0.22, 'square')));

fs.writeFileSync(
  path.join(outDir, 'complete.wav'),
  wav(
    concat(
      tone(420, 0.07, 0.28, 'square'),
      tone(620, 0.09, 0.3, 'square'),
      tone(840, 0.12, 0.26, 'square')
    )
  )
);

fs.writeFileSync(
  path.join(outDir, 'gem.wav'),
  wav(
    concat(
      tone(880, 0.06, 0.28, 'sine'),
      tone(1174, 0.07, 0.3, 'sine'),
      tone(1760, 0.14, 0.24, 'sine')
    )
  )
);

fs.writeFileSync(
  path.join(outDir, 'coin.wav'),
  wav(concat(tone(1319, 0.07, 0.28, 'square'), tone(1661, 0.12, 0.26, 'square')))
);

fs.writeFileSync(path.join(outDir, 'error.wav'), wav(tone(180, 0.16, 0.28, 'square')));

console.log('Wrote original SFX to', outDir);
