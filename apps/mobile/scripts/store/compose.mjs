/**
 * Builds the Google Play graphics from raw device captures:
 *   docs/store/raw/*.png  →  docs/store/screenshots/NN.png (1080×1920) + docs/store/feature-graphic.png (1024×500)
 *
 *   node apps/mobile/scripts/store/compose.mjs
 *
 * Renders HTML with headless Google Chrome (correct Hebrew bidi + the app's Fredoka font).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const STORE = path.join(ROOT, 'docs/store');
const FONTS = path.join(ROOT, 'node_modules/@expo-google-fonts/fredoka');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const SKY = {
  ocean: ['#2C8BFF', '#5FD3FF'],
  volcano: ['#FF5A2E', '#FFB347'],
  jungle: ['#13B566', '#9BE15D'],
  space: ['#24166B', '#7A4DFF'],
  candy: ['#FF5FA8', '#FFC46B'],
};

const FRAMES = [
  { file: '01-home', world: 'ocean', title: 'משימות קטנות, הרפתקאות גדולות', sub: 'פיקו מחכה לילדים בעולם משלהם' },
  { file: '02-celebrate', world: 'ocean', title: 'כל משימה נגמרת בחגיגה', sub: 'מטבעות, קונפטי וצלילים' },
  { file: '03-wheel', world: 'space', title: 'מתנה יומית שמחכה לילדים', sub: 'גלגל מזל, כוכב יומי ותיבת אוצר' },
  { file: '04-space', world: 'space', title: '5 עולמות, לכל אחד מוזיקה משלו', sub: "אוקיינוס, הר געש, ג'ונגל, חלל וממתקים" },
  { file: '05-levelup', world: 'candy', title: 'עולים שלבים ואוספים תגים', sub: 'כל התקדמות מקבלת חגיגה' },
  { file: '06-learn', world: 'jungle', title: 'לומדים ומרוויחים מטבעות', sub: 'חבילות לימוד לפי כיתה' },
  { file: '07-parent', world: 'volcano', title: 'להורים: אישור בלחיצה אחת', sub: 'משימות, פרסים ובונוסים לכל המשפחה' },
];

function star(cx, cy, o, i) {
  const p = [];
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? o : i;
    const a = ((-90 + k * 36) * Math.PI) / 180;
    p.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return p.join(' ');
}

function pikoSvg(size, mood = 'happy') {
  const mouth =
    mood === 'cheer'
      ? '<path d="M50 76 q10 14 20 0 Z" fill="#241547"/><path d="M54.5 81.5 q5.5 4 11 0" fill="#FF7A9C"/>'
      : '<path d="M52 76 q8 9 16 0" stroke="#241547" stroke-width="3.4" stroke-linecap="round" fill="none"/>';
  const eyes =
    mood === 'cheer'
      ? '<path d="M44 66 q5 -7 10 0" stroke="#241547" stroke-width="3.4" stroke-linecap="round" fill="none"/><path d="M66 66 q5 -7 10 0" stroke="#241547" stroke-width="3.4" stroke-linecap="round" fill="none"/>'
      : '<ellipse cx="49" cy="64" rx="4.6" ry="6" fill="#241547"/><circle cx="50.6" cy="61.8" r="1.8" fill="#fff"/><ellipse cx="71" cy="64" rx="4.6" ry="6" fill="#241547"/><circle cx="72.6" cy="61.8" r="1.8" fill="#fff"/>';
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120">
    <polygon points="${star(60, 71, 44, 25)}" fill="#241547" stroke="#241547" stroke-width="19" stroke-linejoin="round"/>
    <polygon points="${star(60, 66, 44, 25)}" fill="#241547" stroke="#241547" stroke-width="19" stroke-linejoin="round"/>
    <polygon points="${star(60, 66, 44, 25)}" fill="#FFC233" stroke="#FFC233" stroke-width="12" stroke-linejoin="round"/>
    <path d="M41 44 q6 -10 15 -12" stroke="#FFF7DA" stroke-width="5" stroke-linecap="round" fill="none"/>
    ${eyes}
    <ellipse cx="42" cy="74" rx="5" ry="3" fill="#FF8FB1" opacity="0.8"/><ellipse cx="78" cy="74" rx="5" ry="3" fill="#FF8FB1" opacity="0.8"/>
    ${mouth}
  </svg>`;
}

const fontFace = `
@font-face { font-family: Fredoka; font-weight: 500; src: url('file://${FONTS}/500Medium/Fredoka_500Medium.ttf'); }
@font-face { font-family: Fredoka; font-weight: 600; src: url('file://${FONTS}/600SemiBold/Fredoka_600SemiBold.ttf'); }
@font-face { font-family: Fredoka; font-weight: 700; src: url('file://${FONTS}/700Bold/Fredoka_700Bold.ttf'); }`;

function bubbles(n, seed) {
  let s = seed;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => {
    const size = 14 + r() * 34;
    return `<div class="b" style="width:${size}px;height:${size}px;left:${r() * 100}%;top:${r() * 100}%"></div>`;
  }).join('');
}

function frameHtml(f, i) {
  const [a, b] = SKY[f.world];
  const img = path.join(STORE, 'raw', `${f.file}.png`);
  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><style>${fontFace}
  html,body{margin:0;width:1080px;height:1920px;overflow:hidden}
  body{background:linear-gradient(180deg,${a},${b});font-family:Fredoka;position:relative}
  .b{position:absolute;border-radius:50%;border:4px solid rgba(255,255,255,.35)}
  h1{position:absolute;top:120px;left:60px;right:60px;margin:0;text-align:center;color:#fff;font-weight:700;font-size:86px;line-height:1.1;text-wrap:balance;text-shadow:0 7px 0 rgba(36,21,71,.28)}
  p{position:absolute;top:${f.title.length > 22 ? 360 : 270}px;left:60px;right:60px;margin:0;text-align:center;color:#fff;font-weight:600;font-size:44px;opacity:.96}
  .phone{position:absolute;top:${f.title.length > 22 ? 470 : 390}px;left:50%;width:800px;margin-left:-400px;transform:rotate(-2.2deg);
    border:14px solid #241547;border-radius:70px;overflow:hidden;background:#241547;box-shadow:0 22px 0 rgba(36,21,71,.85)}
  .phone img{display:block;width:100%}
  .piko{position:absolute;${i % 2 ? 'left' : 'right'}:36px;top:${f.title.length > 22 ? 420 : 340}px;transform:rotate(${i % 2 ? -12 : 12}deg);filter:drop-shadow(0 8px 0 rgba(36,21,71,.25));z-index:3}
  </style></head><body>${bubbles(14, i * 31 + 7)}
  <h1>${f.title}</h1><p>${f.sub}</p>
  <div class="phone"><img src="file://${img}"></div>
  <div class="piko">${pikoSvg(150, i % 2 ? 'cheer' : 'happy')}</div>
  </body></html>`;
}

function featureHtml() {
  const icons = { ocean: '🌊', volcano: '🌋', jungle: '🌴', space: '🚀', candy: '🍭' };
  const worlds = Object.entries(SKY)
    .map(([k, [a, b]]) => `<span style="background:linear-gradient(180deg,${a},${b})">${icons[k]}</span>`)
    .join('');
  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><style>${fontFace}
  html,body{margin:0;width:1024px;height:500px;overflow:hidden}
  body{background:radial-gradient(circle at 30% 40%,#5FD3FF,#2C8BFF 55%,#1757D6);font-family:Fredoka;position:relative}
  .b{position:absolute;border-radius:50%;border:4px solid rgba(255,255,255,.35)}
  .txt{position:absolute;right:64px;top:72px;width:600px;text-align:right;color:#fff}
  h1{margin:0;font-size:118px;font-weight:700;line-height:1;text-shadow:0 8px 0 rgba(36,21,71,.3);direction:ltr;text-align:right}
  p{margin:22px 0 0;font-size:42px;font-weight:600;line-height:1.2;white-space:nowrap}
  .worlds{display:flex;gap:14px;margin-top:34px;justify-content:flex-start}
  .worlds span{width:64px;height:64px;border-radius:18px;border:5px solid #241547;box-shadow:0 5px 0 #241547;display:flex;align-items:center;justify-content:center;font-size:34px}
  .piko{position:absolute;left:48px;top:80px;transform:rotate(-8deg);filter:drop-shadow(0 12px 0 rgba(36,21,71,.3))}
  </style></head><body>${bubbles(12, 99)}
  <div class="piko">${pikoSvg(330, 'cheer')}</div>
  <div class="txt"><h1>KidsQuest</h1><p>משימות קטנות, הרפתקאות גדולות</p><div class="worlds">${worlds}</div></div>
  </body></html>`;
}

function shoot(html, out, w, h) {
  const tmp = path.join(os.tmpdir(), `kq-store-${process.pid}-${path.basename(out)}.html`);
  fs.writeFileSync(tmp, html);
  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--force-device-scale-factor=1',
    '--virtual-time-budget=2500',
    `--window-size=${w},${h}`,
    `--screenshot=${out}`,
    `file://${tmp}`,
  ], { stdio: 'ignore' });
  fs.rmSync(tmp, { force: true });
  console.log(path.relative(ROOT, out));
}

fs.mkdirSync(path.join(STORE, 'screenshots'), { recursive: true });
FRAMES.forEach((f, i) => {
  if (!fs.existsSync(path.join(STORE, 'raw', `${f.file}.png`))) return console.warn(`skip ${f.file} (no raw capture)`);
  shoot(frameHtml(f, i), path.join(STORE, 'screenshots', `${f.file}.png`), 1080, 1920);
});
shoot(featureHtml(), path.join(STORE, 'feature-graphic.png'), 1024, 500);
