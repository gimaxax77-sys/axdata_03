// ─────────────────────────────────────────────────────────────
// 데모: "같은 원형·같은 시작"의 두 유닛을
//   레벨업 · 돌파 · 스킬장착 · 강화(각인) 로 서로 다르게 키워서
//   전투 성능이 완전히 갈리는 것을 증명한다.
//   실행:  node system/demo-build.mjs
// ─────────────────────────────────────────────────────────────

import { createUnit } from './core/units.mjs';
import { computeStats, computePower } from './core/stats.mjs';
import { resolve } from './core/resolution.mjs';
import { getStage } from './core/progression.mjs';
import { createWallet } from './core/economy.mjs';
import { SKILL_CATALOG } from './core/skills.mjs';
import {
  levelUp, ascend, equipSkill, upgradeSkill, enhanceNode,
} from './core/character.mjs';

const line = (c = '─') => console.log(c.repeat(60));

// 유닛 하나를 담은 임시 state (자원 넉넉히)
function rig(unit) {
  return {
    units: [unit],
    wallet: createWallet({ currency: 999999, growth: 999999, summon: 999999 }),
  };
}

// 레벨을 목표치까지 (상한이면 돌파) 끌어올린다
function grindTo(state, uid, targetLevel) {
  const u = state.units[0];
  while (u.level < targetLevel) {
    const r = levelUp(state, uid);
    if (!r.ok) ascend(state, uid); // 상한이면 돌파해서 상한을 연다
  }
}

function skillNames(unit) {
  return unit.skills
    .filter(Boolean)
    .map((s) => `${SKILL_CATALOG[s.id].label}+${s.level}`)
    .join(', ') || '없음';
}
function enhanceStr(unit) {
  return Object.entries(unit.enhance)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}+${v}`)
    .join(', ') || '없음';
}

function report(tag, unit) {
  const s = computeStats(unit);
  line();
  console.log(`[${tag}]  STRIKER Lv.${unit.level}/R${unit.rank}`);
  console.log(`  스탯   : HP ${s.hp}  ATK ${s.atk}  DEF ${s.def}  SPD ${s.spd}`);
  console.log(`  스킬   : ${skillNames(unit)}`);
  console.log(`  각인   : ${enhanceStr(unit)}`);
  console.log(`  전투력 : ${computePower(unit)}`);
}

// ── 동일한 출발점: 같은 원형, 같은 레벨/랭크로 시작 ──────────────
console.log('\n■ 출발점: 두 유닛 모두 STRIKER Lv.1/R1 (완전히 동일)\n');

// Build A — 글래스 캐논 (공격/치명 특화)
const a = createUnit('STRIKER');
const sa = rig(a);
grindTo(sa, a.uid, 40);          // 레벨 40 (돌파 2회 필요)
equipSkill(sa, a.uid, 0, 'BERSERK');    // 광폭: ATK +30%
equipSkill(sa, a.uid, 1, 'PRECISION');  // 정밀: 치명타
upgradeSkill(sa, a.uid, 0);             // 광폭 +1 강화
for (let i = 0; i < 6; i++) enhanceNode(sa, a.uid, 'atk');  // 공격 각인 6
for (let i = 0; i < 4; i++) enhanceNode(sa, a.uid, 'crit'); // 치명 각인 4

// Build B — 브루저 (생존/지속 특화)
const b = createUnit('STRIKER');
const sb = rig(b);
grindTo(sb, b.uid, 40);          // 동일 레벨/랭크
equipSkill(sb, b.uid, 0, 'FORTRESS');   // 요새: HP+25% DEF+20%
equipSkill(sb, b.uid, 1, 'VAMPIRIC');   // 흡혈: 생존력
upgradeSkill(sb, b.uid, 0);
for (let i = 0; i < 6; i++) enhanceNode(sb, b.uid, 'hp');   // 체력 각인 6
for (let i = 0; i < 4; i++) enhanceNode(sb, b.uid, 'def');  // 방어 각인 4

report('Build A · 글래스캐논', a);
report('Build B · 브루저', b);

// ── 같은 스테이지에 각각 도전 → 성능이 어떻게 갈리나 ─────────────
console.log('\n\n■ 같은 도전(스테이지 12)에 각각 단독 도전\n');
const challenge = getStage(12).challenge;
console.log(`  적: HP ${challenge.hp}  ATK ${challenge.atk}  DEF ${challenge.def}`);

for (const [tag, unit] of [['A 글래스캐논', a], ['B 브루저', b]]) {
  const r = resolve([unit], challenge);
  line();
  console.log(`  ${tag}`);
  console.log(`    → ${r.log}`);
  console.log(`    파티 실효HP ${r.partyHP} · 파티DPS ${r.partyPower}`);
}

line('═');
console.log('같은 원형·같은 레벨(40)·같은 랭크(R2)인데:');
console.log('  A는 순간 화력(빠른 클리어), B는 생존/지속에 특화됐다.');
console.log('  = 레벨업/돌파/스킬/각인이 "같은 캐릭터를 다르게" 만든다.');
console.log('');
