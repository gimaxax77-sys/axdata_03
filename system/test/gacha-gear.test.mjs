import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { createWallet, earn } from '../core/economy.mjs';
import { summonOne, summonMulti, RARITY, PULL_COST } from '../core/gacha.mjs';
import { makeRng } from '../core/rng.mjs';
import { craftGear, equipGear, unequipGear, enhanceGear, GEAR_CATALOG } from '../core/gear.mjs';
import { enhanceNode, levelUp } from '../core/character.mjs';
import { ENHANCE_CAP } from '../core/enhance.mjs';

function stateWith(wallet) {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, wallet);
  return s;
}

test('gacha: 단차 비용 소모 + 유닛 획득', () => {
  const s = stateWith({ summon: 100 });
  const r = summonOne(s, makeRng(1));
  assert.equal(r.ok, true);
  assert.equal(s.units.length, 1);
  assert.equal(s.wallet.summon, 100 - PULL_COST.summon);
  assert.ok(RARITY[r.rarity], '유효 등급');
});

test('gacha: 소환 재화 부족 시 실패', () => {
  const s = stateWith({ summon: 5 });
  assert.equal(summonOne(s, makeRng(1)).ok, false);
  assert.equal(s.units.length, 0);
});

test('gacha: 10연차 최소 1개 SR 이상 보장(floor)', () => {
  const rank = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };
  for (let seed = 1; seed <= 5; seed++) {
    const s = stateWith({ summon: 100 });
    const r = summonMulti(s, 10, makeRng(seed));
    assert.equal(r.results.length, 10);
    assert.ok(r.results.some((x) => rank[x.rarity] >= rank.SR), `seed${seed}: SR+ 보장`);
  }
});

test('gacha: 90회 천장 안에 SSR 보장', () => {
  const s = stateWith({ summon: 2000 });
  let sawSSR = false;
  for (let i = 0; i < 90; i++) { if (summonOne(s, makeRng(999)).rarity === 'SSR') { sawSSR = true; break; } }
  assert.ok(sawSSR, '천장 내 SSR');
});

test('UR: 새 최고 티어 — 배수·천장(완전SSR<무발현UR)·소환 획득', async () => {
  const { RARITY_BASE_MULT, SEED_FULL } = await import('../core/seed.mjs');
  const { RARITY } = await import('../core/gacha.mjs');
  // 배수 서열
  assert.ok(RARITY_BASE_MULT.UR > RARITY_BASE_MULT.SSR, 'UR 기본배수 최고');
  // 천장: 완전 발현 SSR도 무발현 UR을 넘지 못함
  const effSSR = RARITY_BASE_MULT.SSR * (1 + SEED_FULL.SSR);
  const effUR = RARITY_BASE_MULT.UR * (1 + 0);
  assert.ok(effSSR < effUR, `완전SSR(${effSSR.toFixed(3)}) < 무발현UR(${effUR.toFixed(3)})`);
  // 가챠 등급표에 UR 존재 + 최저 확률
  assert.ok(RARITY.UR && RARITY.UR.weight < RARITY.SSR.weight, 'UR이 가장 희귀');
  assert.equal(RARITY.UR.startRank, 4);
});

test('gear: 제작→장착→강화→해제 왕복', () => {
  const s = stateWith({ currency: 100000 });
  const u = createUnit('STRIKER', { level: 5, rank: 1 });
  s.units.push(u); s.party.push(u.uid);
  const c = craftGear(s, 'IRON_SWORD');
  assert.equal(c.ok, true);
  assert.equal(equipGear(s, u.uid, c.item.uid).ok, true);
  assert.equal(u.gear.weapon.uid, c.item.uid);
  const lv0 = u.gear.weapon.level;
  assert.equal(enhanceGear(s, u.gear.weapon.uid).ok, true);
  assert.equal(u.gear.weapon.level, lv0 + 1, '강화 레벨↑');
  assert.equal(unequipGear(s, u.uid, 'weapon').ok, true);
  assert.equal(u.gear.weapon, null);
  assert.ok(s.inventory.some((g) => g.uid === c.item.uid), '해제 시 인벤 복귀');
});

test('enhance(각인): 상한 준수', () => {
  const s = stateWith({ currency: 1e9 });
  const u = createUnit('STRIKER', { level: 5, rank: 1 });
  s.units.push(u);
  let ok = 0;
  while (enhanceNode(s, u.uid, 'atk').ok) ok++;
  assert.equal(u.enhance.atk, ENHANCE_CAP);
  assert.equal(enhanceNode(s, u.uid, 'atk').ok, false, '상한 초과 차단');
});

test('character: 레벨업이 상한에서 막힘', () => {
  const s = stateWith({ growth: 1e9 });
  const u = createUnit('STRIKER', { level: 1, rank: 1 }); // cap 20
  s.units.push(u);
  while (levelUp(s, u.uid).ok) { /* noop */ }
  assert.equal(u.level, 20, 'R1 상한 20');
  assert.equal(levelUp(s, u.uid).ok, false);
});
