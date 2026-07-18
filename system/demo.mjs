// ─────────────────────────────────────────────────────────────
// 데모: 하나의 IP(시스템 + 데이터)를 두고
//   ① 컨셉만 바꿔 렌더 (판타지 ↔ SF)
//   ② 장르만 바꿔 구동 (RPG ↔ 방치형)
// 을 증명한다.  실행:  node system/demo.mjs
// ─────────────────────────────────────────────────────────────

import { createUnit } from './core/units.mjs';
import { computeStats } from './core/stats.mjs';
import { createGameState } from './core/gameState.mjs';
import { rpgGenre } from './genres/rpg.mjs';
import { idleGenre } from './genres/idle.mjs';
import { CONCEPTS, renderUnit, renderWallet } from './concepts/index.mjs';

const line = (c = '─') => console.log(c.repeat(58));

// 한 번만 만드는 IP 상태 (장르/컨셉 없음)
function freshState() {
  const units = [
    createUnit('VANGUARD', { level: 12, rank: 2 }),
    createUnit('STRIKER', { level: 15, rank: 2 }),
    createUnit('SUPPORT', { level: 10, rank: 1 }),
  ];
  const state = createGameState({ units, party: units.map((u) => u.uid) });
  return state;
}

// ── ① 같은 데이터, 컨셉만 스왑 ────────────────────────────────
console.log('\n■ ① 같은 IP 데이터 → 컨셉만 스왑 (숫자는 동일)');
const shared = freshState();
for (const key of ['fantasy', 'scifi']) {
  const concept = CONCEPTS[key];
  line();
  console.log(`[${concept.title}]  (${concept.id})`);
  for (const u of shared.units) {
    console.log('  ' + renderUnit(concept, u, computeStats(u)));
  }
}

// ── ② 같은 데이터, 장르만 스왑 ────────────────────────────────
console.log('\n\n■ ② 같은 IP 데이터 → 장르만 스왑 (같은 resolve 엔진)');

// RPG: 플레이어가 3번 전투를 트리거
line();
console.log('[장르 = ' + rpgGenre.name + ']  판타지 컨셉으로 표시');
const fx = CONCEPTS.fantasy;
const rpgState = freshState();
for (let i = 0; i < 3; i++) {
  const r = rpgGenre.battle(rpgState);
  console.log(`  전투#${i + 1} → ${r.log}  (남은 ${fx.terms.energy} ${rpgState.energy})`);
}
console.log('  결과 지갑: ' + renderWallet(fx, rpgState.wallet));
console.log(`  도달 ${fx.terms.stage}: ${rpgState.maxStage}`);

// 방치형: 같은 시작 상태로 2시간 오프라인 자동 진행
line();
console.log('[장르 = ' + idleGenre.name + ']  SF 컨셉으로 표시');
const sf = CONCEPTS.scifi;
const idleState = freshState();
const two_hours = 2 * 3600;
const tickResult = idleGenre.tick(idleState, two_hours);
console.log(`  2시간 오프라인 자동전투 → ${tickResult.clears}회 클리어`);
console.log('  누적 보상: ' + renderWallet(sf, idleState.wallet));
console.log(`  자동 도달 ${sf.terms.stage}: ${idleState.maxStage}`);
const pr = idleGenre.prestige(idleState);
console.log(`  환생 실행 → +${pr.prestigeGained} (총 ${pr.totalPrestige})`);

line('═');
console.log('결론: core/ 는 한 줄도 안 바뀌었고, 장르는 driver만,');
console.log('      컨셉은 label만 갈아끼웠다.  = IP(시스템) 재사용 완료.');
console.log('');
