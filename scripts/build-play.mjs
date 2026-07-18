// 웹으로 export 한 뒤 JS 번들을 index.html에 인라인해
// 단일 자립형 HTML(docs/play.html)을 만든다 → 아티팩트/정적 호스팅용.
//   실행:  node scripts/build-play.mjs
// (사전에 `EXPO_OFFLINE=1 npx expo export --platform web` 로 dist 생성)
import fs from 'node:fs';
import path from 'node:path';

const jsDir = 'dist/_expo/static/js/web';
if (!fs.existsSync(jsDir)) {
  console.error('dist가 없습니다. 먼저: EXPO_OFFLINE=1 npx expo export --platform web');
  process.exit(1);
}
const jsFile = fs.readdirSync(jsDir).find((f) => f.endsWith('.js'));
let js = fs.readFileSync(path.join(jsDir, jsFile), 'utf8');

// ── 이미지 에셋 인라인 ─────────────────────────────────────────
// require()된 이미지는 런타임에 httpServerLocation+name+type 로 URL을 조립하므로
// 단일 파일에선 /assets/... 를 못 찾아 깨진다. dist/assets의 이미지를 base64
// data URI 맵(파일명 기준)으로 만들고, URL 조립부를 그 맵 조회로 감싼다.
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
const assetMap = {};
function walkAssets(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walkAssets(p); continue; }
    const ext = e.name.split('.').pop().toLowerCase();
    if (!MIME[ext]) continue; // 이미지만
    assetMap[e.name] = `data:${MIME[ext]};base64,${fs.readFileSync(p).toString('base64')}`;
  }
}
walkAssets('dist/assets');
// URL 조립부를 맵 조회로 감싼다(미니파이 변수명은 캡처해 대응).
let rewrites = 0;
js = js.replace(
  /(\w+)\.httpServerLocation\+"\/"\+\1\.name\+(\w+)\+"\."\+\1\.type/g,
  (m, a, l) => { rewrites++; return `(globalThis.__A__&&globalThis.__A__[${a}.name+${l}+"."+${a}.type]||${a}.httpServerLocation+"/"+${a}.name+${l}+"."+${a}.type)`; }
);

js = js.split('</script>').join('<\\/script>'); // 스크립트 조기 종료 방지

// 운영 컨셉 선택 — 인자로 concept 지정 시 해당 제품으로 빌드.
//   node scripts/build-play.mjs        → 판타지(docs/play.html)
//   node scripts/build-play.mjs scifi  → SF(docs/play-scifi.html)
const CONCEPT_META = {
  fantasy: { title: '엘드리아 연대기 · 방치형 RPG', out: 'docs/play.html', bg: '#1b1430' },
  scifi: { title: '오비탈 프로토콜 · 방치형 RPG', out: 'docs/play-scifi.html', bg: '#0d1420' },
};
const concept = process.argv[2] || 'fantasy';
const meta = CONCEPT_META[concept] || CONCEPT_META.fantasy;
// 번들 실행 전 운영 컨셉을 글로벌로 주입(판타지는 기본값이라 생략).
const inject = concept === 'fantasy' ? '' : `<script>globalThis.__ELDRIA_CONCEPT__=${JSON.stringify(concept)};</script>\n`;
// 인라인 에셋 맵 주입(있을 때만).
const assetInject = Object.keys(assetMap).length
  ? `<script>globalThis.__A__=${JSON.stringify(assetMap)}<\/script>\n` : '';

// 모바일 뷰포트 메타 필수 — 없으면 모바일 브라우저가 ~980px 가상 뷰포트로
// 렌더해 100vh 레이아웃이 깨지고 페이지 스크롤이 안 잡힌다.
const body = `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<title>${meta.title}</title>
<style id="expo-reset">html,body{height:100%;margin:0}body{overflow:hidden;background:${meta.bg}}#root{display:flex;height:100vh;height:100dvh;flex:1;overflow:hidden}</style>
<div id="root"></div>
${inject}${assetInject}<script>${js}</script>`;

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync(meta.out, body);
console.log(`생성: ${meta.out} (${concept})`, (body.length / 1024).toFixed(0) + 'KB',
  `· 인라인 이미지 ${Object.keys(assetMap).length}개 · URL재작성 ${rewrites}건`);
