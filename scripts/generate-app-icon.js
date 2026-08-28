/**
 * Generate Minecraft-style grass block app icons (pixel art, no external deps).
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const outDir = path.join(__dirname, '../apps/mobile/assets/images');

const GRASS_TOP = [0x5d, 0x8c, 0x3b];
const GRASS_SIDE_LIGHT = [0x6b, 0x9b, 0x42];
const GRASS_SIDE_DARK = [0x4a, 0x72, 0x30];
const DIRT = [0x8b, 0x69, 0x14];
const DIRT_DARK = [0x6b, 0x4f, 0x10];
const SKY = [0x1a, 0x1a, 0x1a];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(size, rgbaFn) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a = 255] = rgbaFn(x, y, size);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const compressed = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

function grassBlockPixel(x, y, size) {
  const u = Math.floor((x / size) * 16);
  const v = Math.floor((y / size) * 16);
  const edge = (x / size) < 0.08 || (y / size) < 0.08 || (x / size) > 0.92 || (y / size) > 0.92;
  if (edge) return SKY;

  if (v < 6) {
    const checker = (u + v) % 2;
    return checker ? GRASS_TOP : GRASS_SIDE_LIGHT;
  }
  if (v < 8) {
    return u % 3 === 0 ? GRASS_SIDE_DARK : GRASS_SIDE_LIGHT;
  }
  return v % 2 === 0 ? DIRT : DIRT_DARK;
}

function writeIcon(name, size) {
  fs.writeFileSync(path.join(outDir, name), png(size, grassBlockPixel));
}

fs.mkdirSync(outDir, { recursive: true });
writeIcon('icon.png', 1024);
writeIcon('splash-icon.png', 512);
writeIcon('favicon.png', 48);
writeIcon('android-icon-foreground.png', 432);
writeIcon('android-icon-background.png', 432);
writeIcon('android-icon-monochrome.png', 432);

console.log('Wrote Minecraft grass block icons to', outDir);
