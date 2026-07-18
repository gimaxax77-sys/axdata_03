// 피처 그래픽 생성기 — Play 스토어 상단 배너 1024×500 PNG.
//   실행: node scripts/gen-feature-graphic.mjs
// 생성된 캐릭터 초상(assets/char)을 활용해 타이틀+태그라인+캐릭터 배너 구성.
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
import fs from 'node:fs';
const { chromium } = pkg;
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = 'docs/store';
fs.mkdirSync(OUT, { recursive: true });

// 초상을 base64 data URI로 인라인(파일 로드 실패 방지).
const portrait = (id) => {
  const buf = fs.readFileSync(`assets/char/fantasy/${id}.png`);
  return `data:image/png;base64,${buf.toString('base64')}`;
};

// 화려한 등급 위주로 3~4명 배치(불·빛·어둠·물).
const heroes = ['aurel', 'kael', 'nyx', 'frost'];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1024px;height:500px;overflow:hidden;font-family:sans-serif}
  .wrap{position:relative;width:1024px;height:500px;
    background:radial-gradient(120% 100% at 20% 30%, #3a2ب6b 0%, #1b1430 55%, #0e0a1c 100%);
    background:radial-gradient(120% 100% at 20% 30%, #3a2b6b 0%, #1b1430 55%, #0e0a1c 100%);
    overflow:hidden}
  .glow{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55}
  .g1{width:420px;height:420px;left:-80px;top:-120px;background:#e8a91f}
  .g2{width:360px;height:360px;right:120px;bottom:-140px;background:#e0407a}
  .rays{position:absolute;inset:0;opacity:.10;
    background:conic-gradient(from 0deg at 30% 40%, #fff 0deg, transparent 14deg, transparent 32deg, #fff 46deg, transparent 60deg, transparent 78deg, #fff 92deg, transparent 106deg)}
  .left{position:absolute;left:56px;top:0;height:500px;display:flex;flex-direction:column;justify-content:center;width:520px;z-index:3}
  .title{color:#fff;font-size:82px;font-weight:900;line-height:1.02;letter-spacing:-1px;
    text-shadow:0 4px 24px rgba(0,0,0,.7), 0 0 40px rgba(245,197,66,.35)}
  .title .accent{color:#ffd257}
  .tag{color:#d9d2f0;font-size:30px;font-weight:700;margin-top:20px;
    text-shadow:0 2px 10px rgba(0,0,0,.8)}
  .sub{color:#a99fce;font-size:21px;margin-top:12px;font-weight:600}
  .heroes{position:absolute;right:-10px;top:0;height:500px;width:520px;z-index:2}
  .heroes img{position:absolute;bottom:-30px;border-radius:24px;
    box-shadow:0 20px 60px rgba(0,0,0,.6);border:3px solid rgba(255,255,255,.08)}
  .h0{width:300px;height:300px;right:210px;bottom:110px;transform:rotate(-6deg);z-index:4}
  .h1{width:340px;height:340px;right:20px;bottom:60px;transform:rotate(5deg);z-index:5}
  .h2{width:250px;height:250px;right:340px;bottom:20px;transform:rotate(-3deg);opacity:.96;z-index:3}
  .h3{width:230px;height:230px;right:0px;bottom:290px;transform:rotate(8deg);opacity:.9;z-index:3}
  .fade{position:absolute;left:400px;top:0;width:280px;height:500px;z-index:3;
    background:linear-gradient(to right, #1b1430 0%, rgba(27,20,48,0) 100%)}
</style></head><body>
  <div class="wrap">
    <div class="glow g1"></div><div class="glow g2"></div>
    <div class="rays"></div>
    <div class="heroes">
      <img class="h3" src="${portrait(heroes[3])}">
      <img class="h2" src="${portrait(heroes[2])}">
      <img class="h0" src="${portrait(heroes[0])}">
      <img class="h1" src="${portrait(heroes[1])}">
    </div>
    <div class="fade"></div>
    <div class="left">
      <div class="title">엘드리아<br><span class="accent">연대기</span></div>
      <div class="tag">모으고 · 키우고 · 방치로 정복</div>
      <div class="sub">✦ 5속성 영웅 수집형 방치 RPG</div>
    </div>
  </div>
</body></html>`;

const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
await p.setContent(html, { waitUntil: 'load' });
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/feature-graphic.png`, clip: { x: 0, y: 0, width: 1024, height: 500 } });
await b.close();
console.log('생성: docs/store/feature-graphic.png (1024×500)');
