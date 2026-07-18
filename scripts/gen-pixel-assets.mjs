// 픽셀 화면용 에셋 생성 — 배경 씬 + 캐릭터/적 스프라이트 PNG.
//   실행: node scripts/gen-pixel-assets.mjs → assets/pixel/*.png
// 실제 픽셀 에셋팩이 준비되면 같은 파일명으로 교체하면 된다.
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
import fs from 'node:fs';
const { chromium } = pkg;
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
fs.mkdirSync('assets/pixel', { recursive: true });

// 공통 드로잉 유틸을 페이지 안에서 실행할 HTML을 만든다.
function pageHTML(w, h, drawJs) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}canvas{image-rendering:pixelated}</style></head>
  <body><canvas id="c" width="${w}" height="${h}"></canvas><script>
  const ctx=document.getElementById('c').getContext('2d'); ctx.imageSmoothingEnabled=false;
  function px(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x*B),Math.round(y*B),Math.round(w*B),Math.round(h*B));}
  function dot(x,y,c){ctx.fillStyle=c;ctx.fillRect(x*B,y*B,B,B);}
  function dither(x,y,w,h,a,b){for(let j=0;j<h;j++)for(let i=0;i<w;i++){ctx.fillStyle=((i+j)&1)?a:b;ctx.fillRect((x+i)*B,(y+j)*B,B,B);}}
  function sprite(map,pal,ox,oy){for(let r=0;r<map.length;r++)for(let c=0;c<map[r].length;c++){const ch=map[r][c];if(ch===' '||ch==='.')continue;ctx.fillStyle=pal[ch];ctx.fillRect((ox+c)*B,(oy+r)*B,B,B);}}
  function glow(cx,cy,rad,col){const g=ctx.createRadialGradient(cx*B,cy*B,0,cx*B,cy*B,rad*B);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect((cx-rad)*B,(cy-rad)*B,rad*2*B,rad*2*B);}
  ${drawJs}
  </script></body></html>`;
}

const HERO = [
 '......yyy......','.....yowoy.....','.....yowoy.....','......ooo......',
 '.....kfffk.....','.....kfffk.....','....ksSSSk.....','...ksSSSSSk. s.',
 '..dSrRRRrSd Ss.','..dSrRRRrSd sS.','..dSRRRRRSdSSs.','..dSRRRRRSd Ss.',
 '..dSrRRRrSd s..','...dSRRRSd.....','...krRRRrk.....','...kd r dk.....',
 '...kd r dk.....','...ks r sk.....','...kS r Sk.....','...kk r kk.....'];
const HPAL = "{k:'#160b24',f:'#f0c090',s:'#aeb8cf',S:'#e6ecf6',r:'#c0431f',R:'#e8642a',d:'#7a230e',y:'#f5c542',o:'#ff8c2a',w:'#ffe9a0'}";
const ENE = [
 '......pPPPp......','....pPWWWWWPp....','...pPWppppPWPp...','..pPWp.RR.pWPp..',
 '..PWp.ROOR.pWP..','..PWp.ROOR.pWP..','..pPWp.RR.pWPp..','...pPWppppPWPp...',
 '....pPWWWWWPp....','.....pPPPPPp....','.......pPp.......','......p P p......'];
const EPAL = "{p:'#8a1f4a',P:'#e0407a',W:'#ff9ec4',R:'#ffd257',O:'#fffbe0'}";

// ── 배경 씬 (137×297 논리, HUD·캐릭터 제외) ──
const BG_JS = `
const B=6, W=137, H=297;
const bands=['#3a2c63','#312555','#281e48','#20183b','#181230','#110c24'];
for(let i=0;i<bands.length;i++) px(0,i*9,W,9,bands[i]);
for(let i=0;i<bands.length-1;i++) dither(0,i*9+7,W,2,bands[i],bands[i+1]);
px(0,54,W,26,'#110c24');
glow(34,20,40,'rgba(120,90,200,.30)'); glow(104,14,30,'rgba(200,150,80,.22)');
[[10,6],[24,12],[46,5],[62,10],[78,7],[96,13],[120,6],[36,20],[88,22],[128,18]].forEach(([x,y],i)=>dot(x,y,i%2?'#efe7b0':'#b9c0e8'));
glow(108,12,16,'rgba(245,230,160,.5)');
sprite(['.www.','wwwWw','wWWWw','wwWww','.www.'],{w:'#f5e6a0',W:'#fffbe0'},105,8);
function ridge(base,amp,per,col){for(let x=0;x<W;x++){const h=base+Math.round(amp*Math.sin(x/per)+amp*0.4*Math.sin(x/(per*0.4)));px(x,h,1,80-h,col);}}
ridge(66,5,11,'#241b47'); ridge(70,4,7,'#1d1638'); dither(0,74,W,4,'#2a2150','#1d1638');
px(0,80,W,40,'#161028');
for(let x=6;x<W;x+=26){px(x,84,14,30,'#1c1533');px(x+2,86,10,4,'#241a3d');dither(x+2,90,10,20,'#120d24','#1a1330');px(x,84,14,1,'#2e2450');}
[16,113].forEach(x=>{px(x,52,7,70,'#2b2352');px(x,52,7,2,'#3b3170');px(x,52,1,70,'#3a3068');px(x+6,52,1,70,'#1c1638');px(x-1,50,9,3,'#332a5e');px(x-1,118,9,3,'#332a5e');glow(x+3,48,10,'rgba(255,150,40,.5)');sprite(['.o.','owo','wWw','.y.'],{o:'#ff8c2a',w:'#ffd257',W:'#ffe9a0',y:'#c0431f'},x+2,44);});
const fy=150; px(0,fy,W,H-fy,'#1a1330');
for(let y=fy;y<H;y+=7){for(let x=((y-fy)%14?0:5);x<W;x+=10){px(x,y,9,6,'#241a3d');px(x,y,9,1,'#31264f');px(x,y+5,9,1,'#150f28');px(x,y,1,6,'#2c2148');}}
glow(W/2,fy+22,34,'rgba(245,197,66,.16)');
for(let a=0;a<360;a+=4){const x=W/2+38*Math.cos(a*Math.PI/180),y=fy+22+11*Math.sin(a*Math.PI/180);dot(Math.round(x),Math.round(y),(a%24<4)?'#ffe9a0':'#e8b923');}
`;

// ── 스프라이트 단독 (투명 배경) ──
function spriteJS(map, pal, aura) {
  return `const B=8, W=${map[0].length+4}, H=${map.length+4};
  ${aura}
  sprite(${JSON.stringify(map)}, ${pal}, 2, 2);`;
}
const HERO_AURA = `glow(${(HERO[0].length+4)/2},${(HERO.length+4)/2},12,'rgba(255,120,30,.4)');`;
const ENE_AURA = `glow(${(ENE[0].length+4)/2},${(ENE.length+4)/2},12,'rgba(224,64,122,.4)');`;

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
async function render(w, h, drawJs, out) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.setContent(pageHTML(w, h, drawJs), { waitUntil: 'load' });
  await p.waitForTimeout(150);
  await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  await p.close();
  console.log('•', out);
}
await render(137 * 6, 297 * 6, BG_JS, 'assets/pixel/bg-sanctum.png');
await render((HERO[0].length + 4) * 8, (HERO.length + 4) * 8, spriteJS(HERO, HPAL, HERO_AURA), 'assets/pixel/hero-fire.png');
await render((ENE[0].length + 4) * 8, (ENE.length + 4) * 8, spriteJS(ENE, EPAL, ENE_AURA), 'assets/pixel/enemy-guardian.png');
await browser.close();
console.log('완료: assets/pixel/*.png');
