// 캐릭터 플레이스홀더 초상 생성기 — 헤드리스 Chromium으로 512×512 PNG를 렌더.
//   속성색 그라디언트 배경 + 등급 링/글로우 + 캐릭터 이모지 + 이름/등급 칩.
// 실제 일러스트가 준비되면 같은 파일명(assets/char/<concept>/<id>.png)으로 덮어쓰면 된다.
//   실행: node scripts/gen-portraits.mjs
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
import { CONCEPTS, elementMeta } from '../system/concepts/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = pkg;
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// 등급 그라디언트/글로우 (app/theme.js와 동일값).
const RARITY = {
  N: { grad: ['#8891a8', '#5c6480'], glow: 'rgba(154,160,181,0.25)', label: '노멀' },
  R: { grad: ['#6cbcf5', '#3a7fc4'], glow: 'rgba(90,169,230,0.45)', label: '레어' },
  SR: { grad: ['#d9a0ff', '#9b5fe0'], glow: 'rgba(201,139,255,0.5)', label: '에픽' },
  SSR: { grad: ['#ffe27a', '#e8a91f'], glow: 'rgba(245,197,66,0.6)', label: '전설' },
  UR: { grad: ['#ff9ec4', '#e0407a'], glow: 'rgba(255,94,138,0.7)', label: '신화' },
};
// 속성별 배경 색상.
const ELEMENT_BG = {
  FIRE: ['#3a1410', '#7a2418'], WATER: ['#0d2436', '#155a86'], WOOD: ['#0f2c18', '#2e7d45'],
  LIGHT: ['#33280d', '#8a6a1a'], DARK: ['#1c1330', '#3a2b6b'],
};

function portraitHTML({ emoji, name, rarity, element, elemEmoji }) {
  const r = RARITY[rarity] || RARITY.N;
  const bg = ELEMENT_BG[element] || ['#1b1430', '#2a2050'];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:512px;height:512px;overflow:hidden}
    .frame{position:relative;width:512px;height:512px;
      background:radial-gradient(circle at 50% 38%, ${bg[1]} 0%, ${bg[0]} 78%);
      display:flex;align-items:center;justify-content:center;
      font-family:'Noto Color Emoji','Apple Color Emoji',sans-serif}
    /* 등급 링 */
    .frame::before{content:'';position:absolute;inset:14px;border-radius:28px;
      border:6px solid transparent;
      background:linear-gradient(145deg, ${r.grad[0]}, ${r.grad[1]}) border-box;
      -webkit-mask:linear-gradient(#000 0 0) padding-box,linear-gradient(#000 0 0);
      -webkit-mask-composite:xor;mask-composite:exclude;
      box-shadow:0 0 42px ${r.glow}, inset 0 0 42px ${r.glow}}
    /* 기하 패턴(은은한 광채) */
    .rays{position:absolute;inset:0;opacity:.14;
      background:conic-gradient(from 0deg at 50% 42%, #fff 0deg, transparent 12deg, transparent 30deg, #fff 42deg, transparent 54deg, transparent 72deg, #fff 84deg, transparent 96deg);
      mask:radial-gradient(circle at 50% 42%, #000 30%, transparent 62%)}
    .emoji{font-size:280px;line-height:1;filter:drop-shadow(0 10px 24px rgba(0,0,0,.55));
      transform:translateY(-18px)}
    .elem{position:absolute;top:30px;right:34px;font-size:44px;
      filter:drop-shadow(0 3px 8px rgba(0,0,0,.6))}
    .plate{position:absolute;left:0;right:0;bottom:0;height:132px;
      background:linear-gradient(to top, rgba(0,0,0,.72) 0%, rgba(0,0,0,.35) 55%, transparent 100%)}
    .name{position:absolute;left:0;right:0;bottom:56px;text-align:center;
      color:#fff;font-family:sans-serif;font-weight:900;font-size:46px;
      text-shadow:0 3px 12px rgba(0,0,0,.8);letter-spacing:1px}
    .chip{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);
      color:#111;font-family:sans-serif;font-weight:900;font-size:20px;
      padding:3px 16px;border-radius:999px;
      background:linear-gradient(135deg, ${r.grad[0]}, ${r.grad[1]});
      box-shadow:0 3px 10px rgba(0,0,0,.5)}
  </style></head><body>
    <div class="frame">
      <div class="rays"></div>
      <div class="elem">${elemEmoji}</div>
      <div class="emoji">${emoji}</div>
      <div class="plate"></div>
      <div class="name">${name}</div>
      <div class="chip">${r.label}</div>
    </div>
  </body></html>`;
}

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });

let count = 0;
for (const cid of ['fantasy', 'scifi']) {
  const concept = CONCEPTS[cid];
  if (!concept) continue;
  const dir = path.join('assets', 'char', cid);
  fs.mkdirSync(dir, { recursive: true });
  for (const c of concept.roster) {
    const em = elementMeta(concept, c.element);
    await page.setContent(portraitHTML({
      emoji: c.emoji, name: c.name, rarity: c.rarity, element: c.element,
      elemEmoji: (em && em.emoji) || '',
    }), { waitUntil: 'load' });
    await page.waitForTimeout(120); // 폰트/이모지 안정화
    const out = path.join(dir, `${c.id}.png`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 512, height: 512 } });
    count++;
  }
}
await browser.close();
console.log(`생성 완료: ${count}개 초상 (assets/char/{fantasy,scifi}/*.png)`);
