// 앱 아이콘/스플래시/파비콘 PNG 생성기 — 디자인된 엠블럼을 Chromium으로
// 정확한 크기에 렌더해 스크린샷. (별도 이미지 툴 없이 브랜드 에셋 생성)
//   실행: node scripts/gen-icon.mjs
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import fs from 'node:fs';
const { chromium } = pw;

const OUT = 'assets';
fs.mkdirSync(OUT, { recursive: true });

// 엠블럼 HTML. bleed=true면 배경 꽉 채움(icon), false면 투명 배경(adaptive/splash).
function html({ size, emoji = '⚔️', scale = 0.52, bleed = true, glow = '#f5c542', ring = true }) {
  const bg = bleed
    ? `background:
        radial-gradient(circle at 50% 40%, ${glow}22 0%, transparent 55%),
        radial-gradient(circle at 50% 34%, #4a3a7a 0%, #2a1f47 46%, #140e24 100%);`
    : 'background:transparent;';
  const ringCss = ring
    ? `<div style="position:absolute;inset:${size * 0.08}px;border:${size * 0.012}px solid ${glow}66;border-radius:${size * 0.20}px;box-shadow:0 0 ${size * 0.05}px ${glow}44 inset;"></div>`
    : '';
  return `<!doctype html><meta charset="utf8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${size}px;height:${size}px;overflow:hidden}
    .wrap{position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;${bg}}
    .emoji{font-size:${Math.round(size * scale)}px;line-height:1;filter:drop-shadow(0 ${size * 0.01}px ${size * 0.03}px rgba(0,0,0,.5)) drop-shadow(0 0 ${size * 0.04}px ${glow}88);}
    .spark{position:absolute;color:${glow};font-size:${size * 0.08}px;opacity:.85}
  </style>
  <div class="wrap">
    ${ringCss}
    <div class="spark" style="top:${size * 0.20}px;left:${size * 0.22}px">✦</div>
    <div class="spark" style="bottom:${size * 0.22}px;right:${size * 0.20}px;font-size:${size * 0.055}px">✦</div>
    <div class="emoji">${emoji}</div>
  </div>`;
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function shot(name, opts) {
  const { size } = opts;
  const ctx = await b.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await pg.setContent(html(opts), { waitUntil: 'networkidle' });
  await pg.waitForTimeout(150);
  await pg.screenshot({ path: `${OUT}/${name}`, omitBackground: !opts.bleed, clip: { x: 0, y: 0, width: size, height: size } });
  await ctx.close();
  console.log('생성:', `${OUT}/${name}`, `${size}x${size}`);
}

const concept = process.argv[2] || 'fantasy';
const CFG = {
  fantasy: { emoji: '⚔️', glow: '#f5c542' },
  scifi: { emoji: '🛰️', glow: '#43e0d0' },
};
const c = CFG[concept] || CFG.fantasy;
const suffix = concept === 'fantasy' ? '' : `-${concept}`;

// icon: 꽉 찬 배경 + 엠블럼. adaptive: 투명 + 안전영역(작게). splash: 투명 + 중간.
await shot(`icon${suffix}.png`, { size: 1024, emoji: c.emoji, glow: c.glow, scale: 0.5, bleed: true, ring: true });
await shot(`adaptive-icon${suffix}.png`, { size: 1024, emoji: c.emoji, glow: c.glow, scale: 0.4, bleed: false, ring: false });
await shot(`splash-icon${suffix}.png`, { size: 1024, emoji: c.emoji, glow: c.glow, scale: 0.46, bleed: false, ring: true });
await shot(`favicon.png`, { size: 48, emoji: c.emoji, glow: c.glow, scale: 0.62, bleed: true, ring: false });

await b.close();
console.log('완료.');
