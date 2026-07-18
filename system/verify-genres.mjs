// ─────────────────────────────────────────────────────────────
// 장르 검증 — "같은 코어가 두 장르를 구동한다"를 단언(assert)으로 증명.
// 데모(demo.mjs)는 눈으로 보는 증명, 이건 CI가 돌릴 수 있는 회귀 테스트.
//   1) 동일 상태 → 동일 resolve 결과 (장르는 판정만 다르게 소비)
//   2) RPG 능동 루프: 행동력 소모/차단/회복, 승리 시 전진, 패배 시 정지
//   3) 방치 자동 루프: 시간 예산으로 누적, 벽에서 정지
//   4) 콘텐츠 확장 이후 상태(파티 편성·아레나·길드 필드)에서도 무결
// 실행:  node system/verify-genres.mjs   (실패 시 종료코드 1)
// ─────────────────────────────────────────────────────────────

import { createUnit } from './core/units.mjs';
import { createGameState, togglePartyMember } from './core/gameState.mjs';
import { resolve } from './core/resolution.mjs';
import { getStage } from './core/progression.mjs';
import { getPartyUnits } from './core/gameState.mjs';
import { accountMods } from './core/balance.mjs';
import { rpgGenre } from './genres/rpg.mjs';
import { idleGenre } from './genres/idle.mjs';
import { serialize, deserialize } from './core/save.mjs';

let passed = 0;
const fails = [];
function ok(name, cond) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { fails.push(name); console.log(`  ✗ ${name}`); }
}

function freshState({ level = 14, rank = 2 } = {}) {
  const units = [
    createUnit('VANGUARD', { level, rank, element: 'WATER' }),
    createUnit('STRIKER', { level: level + 2, rank, element: 'FIRE' }),
    createUnit('SUPPORT', { level: level - 3, rank: 1, element: 'LIGHT' }),
  ];
  const s = createGameState({ units, party: units.map((u) => u.uid) });
  return s;
}

console.log('\n■ 장르 검증 (assert)\n');

// ── 1) 같은 상태 → 같은 resolve ────────────────────────────────
{
  const s = freshState();
  const party = getPartyUnits(s);
  const stage = getStage(s.stage);
  const mods = accountMods(s);
  const a = resolve(party, stage.challenge, mods);
  const b = resolve(party, stage.challenge, mods);
  ok('resolve 결정론적 (같은 입력 → 같은 win/duration)',
    a.win === b.win && a.duration === b.duration);
  ok('두 장르가 참조하는 엔진이 동일 (resolve 승리 판정 존재)',
    typeof a.win === 'boolean' && a.duration > 0);
}

// ── 2) RPG 능동 루프 ───────────────────────────────────────────
{
  const s = freshState();
  s.energy = rpgGenre.ENERGY_COST * 2 + 1; // 딱 2번 + 여분
  const startStage = s.stage;

  const r1 = rpgGenre.battle(s);
  ok('RPG 전투가 행동력을 소모', s.energy === (rpgGenre.ENERGY_COST * 2 + 1) - rpgGenre.ENERGY_COST);
  ok('RPG 승리 시 스테이지 전진', r1.win ? s.stage === startStage + 1 : s.stage === startStage);

  rpgGenre.battle(s); // 두 번째
  const r3 = rpgGenre.battle(s); // 행동력 부족해야 함
  ok('RPG 행동력 부족 시 전투 차단', r3.ok === false && r3.reason === '행동력 부족');

  const before = s.energy;
  rpgGenre.restoreEnergy(s, 30);
  ok('RPG 행동력 회복 동작', s.energy === before + 30);
  ok('RPG 행동력 회복 상한(120) 클램프',
    (() => { rpgGenre.restoreEnergy(s, 9999); return s.energy === 120; })());

  // 패배 케이스: 압도적으로 강한 스테이지에선 win=false, 전진 없음
  const s2 = freshState({ level: 1, rank: 1 });
  s2.stage = 300; s2.energy = 100;
  const stg = s2.stage;
  const lose = rpgGenre.battle(s2);
  ok('RPG 패배 시 스테이지 유지', lose.ok === true && lose.win === false && s2.stage === stg);
}

// ── 3) 방치 자동 루프 ──────────────────────────────────────────
{
  const s = freshState();
  const t = idleGenre.tick(s, 3600); // 1시간
  ok('방치 틱이 보상을 누적', t.gained.currency > 0 && t.clears > 0);
  ok('방치 틱이 lastTick 갱신', typeof s.lastTick === 'number');

  // 벽: 아주 약한 파티는 깊은 스테이지에서 clears=0로 멈춰야 함
  const weak = freshState({ level: 1, rank: 1 });
  weak.stage = 500;
  const tw = idleGenre.tick(weak, 3600);
  ok('방치 벽에서 정지 (clears=0)', tw.clears === 0);
}

// ── 4) 확장 상태(파티 편성·아레나·길드)에서도 무결 ─────────────
{
  const s = freshState();
  // 파티를 1명으로 줄였다가 다시 편성해도 두 장르가 동작
  const uids = s.units.map((u) => u.uid);
  togglePartyMember(s, uids[2]);
  togglePartyMember(s, uids[1]);
  ok('파티 축소 후에도 최소 1명 유지', s.party.length === 1);
  s.energy = 50;
  const r = rpgGenre.battle(s);
  ok('1인 파티로도 RPG 전투 수행', r.ok === true);
  const t = idleGenre.tick(s, 600);
  ok('1인 파티로도 방치 틱 수행', typeof t.gained.currency === 'number');

  // 세이브 왕복 후에도 두 장르가 같은 상태에서 동작
  const round = deserialize(serialize(s));
  ok('세이브 왕복 후 상태 복원', round && round.units.length === 3 && round.arena && round.guild);
  round.energy = 50;
  ok('복원 상태에서 RPG 전투 가능', rpgGenre.battle(round).ok === true);
  ok('복원 상태에서 방치 틱 가능', typeof idleGenre.tick(round, 300).gained.currency === 'number');
}

console.log(`\n결과: ${passed} 통과 / ${fails.length} 실패`);
if (fails.length) { console.log('실패:', fails.join(', ')); process.exit(1); }
console.log('→ 같은 core/ 를 RPG(능동)·방치형(자동) 두 장르가 그대로 구동함이 검증됨.\n');
