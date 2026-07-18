// 코어 시스템 컨트롤 판넬 — 선택 모듈 on/off 관리 (system/core/features.mjs 편집)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { MODULE_META, FEATURES } from '../system/core/features.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '..', 'system', 'core', 'features.mjs');
const keys = Object.keys(MODULE_META);
const state = {};
for (const k of keys) state[k] = FEATURES[k] !== false;

function render() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('   코어 시스템 컨트롤 판넬 — 선택 모듈 on/off');
  console.log('   (최소 코어: 캐릭터·전투·파티·캠페인·성장 = 항상 켜짐)');
  console.log('══════════════════════════════════════════════════');
  const groups = {};
  keys.forEach((k, i) => { (groups[MODULE_META[k].group] ||= []).push({ n: i + 1, k }); });
  for (const [g, items] of Object.entries(groups)) {
    console.log(`\n[ ${g} ]`);
    for (const { n, k } of items) {
      const on = state[k];
      const mark = on ? 'ON ' : 'off';
      console.log(`  ${String(n).padStart(2)}. (${mark}) ${MODULE_META[k].label.padEnd(11, ' ')} — ${MODULE_META[k].desc}`);
    }
  }
  const onCnt = keys.filter((k) => state[k]).length;
  console.log(`\n  현재: ${onCnt}/${keys.length} 켜짐`);
  console.log('  명령:  [번호]=토글   s=단순코어(전부off)   f=풀모드(전부on)   w=저장&종료   q=저장없이종료');
}

function save() {
  let txt = fs.readFileSync(FILE, 'utf8');
  for (const k of keys) {
    const v = state[k];
    // FEATURES 블록의 'key: true|false,' 한 줄만 교체(META의 key:{...} 는 매칭 안 됨)
    txt = txt.replace(new RegExp(`(\\n\\s*${k}:\\s*)(true|false)(,)`), `$1${v}$3`);
  }
  fs.writeFileSync(FILE, txt, 'utf8');
  console.log('\n  ✔ 저장 완료 → system/core/features.mjs');
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function loop() {
  render();
  rl.question('\n  > ', (ansRaw) => {
    const ans = String(ansRaw).trim().toLowerCase();
    if (ans === 'q') { console.log('  (저장 안 함)'); rl.close(); return; }
    if (ans === 'w') { save(); rl.close(); return; }
    if (ans === 's') { keys.forEach((k) => { state[k] = false; }); return loop(); }
    if (ans === 'f') { keys.forEach((k) => { state[k] = true; }); return loop(); }
    const n = parseInt(ans, 10);
    if (n >= 1 && n <= keys.length) state[keys[n - 1]] = !state[keys[n - 1]];
    loop();
  });
}
loop();
