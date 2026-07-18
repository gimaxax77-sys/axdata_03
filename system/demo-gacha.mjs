// ─────────────────────────────────────────────────────────────
// 데모: 소환(가차) + 장비 시스템
//   ① 시드 RNG로 10연차 → 확률/천장 확인 (재현 가능)
//   ② 뽑은 유닛에 장비 제작·장착·강화 → 스탯 상승 확인
//   실행:  node system/demo-gacha.mjs
// ─────────────────────────────────────────────────────────────

import { createGameState } from './core/gameState.mjs';
import { earn } from './core/economy.mjs';
import { computeStats, computePower } from './core/stats.mjs';
import { makeRng } from './core/rng.mjs';
import { summonMulti, RARITY } from './core/gacha.mjs';
import { craftGear, equipGear, enhanceGear, GEAR_CATALOG } from './core/gear.mjs';

const line = (c = '─') => console.log(c.repeat(60));

// 넉넉한 자원으로 시작
const state = createGameState({ units: [], party: [] });
earn(state.wallet, { summon: 200, currency: 5000, growth: 5000 });

// ── ① 소환 ────────────────────────────────────────────────────
console.log('\n■ ① 10연차 소환 (시드 고정 → 재현 가능)\n');
const rng = makeRng(20260705);
const pull = summonMulti(state, 10, rng);

const tally = { N: 0, R: 0, SR: 0, SSR: 0 };
for (const r of pull.results) {
  tally[r.rarity]++;
  console.log(`  ${RARITY[r.rarity].label.padEnd(3)} · ${r.archetype}`);
}
line();
console.log(
  `  결과 집계: ` +
    Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(' / ') +
    `   (천장 카운터 ${state.gacha.pity})`
);
console.log(`  남은 소환재화: ${state.wallet.summon}`);

// ── ② 장비 ────────────────────────────────────────────────────
console.log('\n\n■ ② 뽑은 유닛에 장비 장착·강화\n');
// SR 이상을 하나 골라서 육성 대상으로
const hero =
  state.units.find((u) => u.rank >= 2) || state.units[0];
const before = computeStats(hero);
console.log(`  대상: ${hero.archetype} (${hero.rarity}) Lv.${hero.level}/R${hero.rank}`);
console.log(`  장착 전: HP ${before.hp}  ATK ${before.atk}  DEF ${before.def}  SPD ${before.spd}  · 전투력 ${computePower(hero)}`);

// 무기/방어구/장신구 제작 → 장착
for (const bp of ['RUNE_BLADE', 'PLATE_ARMOR', 'CRIT_RING']) {
  const c = craftGear(state, bp);
  equipGear(state, hero.uid, c.item.uid);
  console.log(`    + ${GEAR_CATALOG[bp].label} 제작·장착`);
}
// 무기를 3번 강화
const weaponUid = hero.gear.weapon.uid;
for (let i = 0; i < 3; i++) enhanceGear(state, weaponUid);
console.log(`    ↑ 무기 강화 +${hero.gear.weapon.level - 1}`);

const after = computeStats(hero);
line();
console.log(`  장착 후: HP ${after.hp}  ATK ${after.atk}  DEF ${after.def}  SPD ${after.spd}  · 전투력 ${computePower(hero)}`);
console.log(
  `  변화: ATK +${after.atk - before.atk}  HP +${after.hp - before.hp}  DEF +${after.def - before.def}` +
    `  (전투력 +${computePower(hero) - Math.round(before.hp * 0.15 + before.atk * 1.2 + before.def * 0.6 + before.spd)})`
);

line('═');
console.log('소환으로 유닛을 얻고(확률·천장), 장비로 다시 성장시킨다.');
console.log('장비 스탯도 같은 modifiers 파이프라인으로 합산 → core 일관성 유지.');
console.log('');
