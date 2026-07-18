// 스토어 스크린샷 생성기 — play.html을 실제 폰 비율로 렌더해 docs/store/*.png 저장.
//   실행: npm run gen:screens  (사전: npm run build:play 로 docs/play.html 최신화)
// 데모 세이브(13영웅 + 재화)를 주입해 화면이 살아있게 캡처한다.
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
import fs from 'node:fs';
import { createGameState } from '../system/core/gameState.mjs';
import { createUnit } from '../system/core/units.mjs';
import { serialize } from '../system/core/save.mjs';
import { earn } from '../system/core/economy.mjs';
import { CONCEPTS } from '../system/concepts/index.mjs';

const { chromium } = pkg;
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = 'docs/store';
fs.mkdirSync(OUT, { recursive: true });

// 데모 세이브 구성
const roster = CONCEPTS.fantasy.roster;
const units = roster.slice(0, 13).map((c, i) =>
  createUnit(c.archetype, { level: 10 + i * 3, rank: 1 + (i % 3), characterId: c.id, element: c.element, rarity: c.rarity, signature: c.signature }));
const s = createGameState({ units, party: units.slice(0, 4).map((u) => u.uid) });
s.peakStage = 42; s.maxStage = 42; s.stage = 42;
earn(s.wallet, { currency: 1284000, growth: 86400, summon: 173, gem: 940 });
const save = serialize(s);

const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 3 }); // ≈1236×2745
await p.addInitScript((sv) => localStorage.setItem('eldria_save_v2', sv), save);
await p.goto('file://' + process.cwd() + '/docs/play.html');
await p.waitForTimeout(2800);
const click = async (t) => {
  const box = await p.evaluate((t) => {
    const el = [...document.querySelectorAll('span,div')].find((n) => (n.textContent || '').trim() === t);
    if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, t);
  if (box) { await p.mouse.click(box.x, box.y); return true; } return false;
};
for (let i = 0; i < 3; i++) { if (await click('건너뛰기')) await p.waitForTimeout(300); else break; }
const shot = async (name) => { await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };

await shot('01-idle');
await click('🐹캐릭터'); await p.waitForTimeout(1400); await shot('02-roster');
await click('🔮소환'); await p.waitForTimeout(1200); await shot('03-gacha');
await click('📅콘텐츠'); await p.waitForTimeout(1200); await shot('04-content');
await b.close();
console.log('완료: docs/store/*.png');
