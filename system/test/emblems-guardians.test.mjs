import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { earn } from '../core/economy.mjs';
import { accountMods } from '../core/balance.mjs';
import {
  EMBLEMS, upgradeEmblem, emblemMods, emblemComplete, emblemCap, EMBLEM_COMPLETE_BONUS,
} from '../core/emblems.mjs';
import {
  GUARDIANS, guardianSummon, equipGuardian, unequipGuardian, guardianMods,
  MAX_ACTIVE_GUARDIANS, GUARDIAN_SUMMON_COST,
} from '../core/guardians.mjs';
import { serialize, deserialize } from '../core/save.mjs';

// ── 엠블럼 ──
test('엠블럼: 다이아 강화 → 계정 배수 상승', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { gem: 100000 });
  const base = accountMods(s).powerMult;
  const r = upgradeEmblem(s, 'E_VALOR'); // power
  assert.equal(r.ok, true);
  assert.ok(emblemMods(s).power > 1, '파워 배수 상승');
  assert.ok(accountMods(s).powerMult > base, '계정 파워 반영');
});

test('엠블럼: 다이아 부족 시 실패', () => {
  const s = createGameState({ units: [], party: [] });
  assert.equal(upgradeEmblem(s, 'E_VALOR').ok, false);
});

test('엠블럼: 강화 상한 준수', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { gem: 1e9 });
  const cap = emblemCap('E_VALOR');
  let n = 0; while (upgradeEmblem(s, 'E_VALOR').ok) n++;
  assert.equal(n, cap);
});

test('엠블럼: 도감 완성 파워 보너스', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { gem: 1e9 });
  assert.equal(emblemComplete(s), false);
  for (const id of Object.keys(EMBLEMS)) upgradeEmblem(s, id);
  assert.equal(emblemComplete(s), true);
  // 완성 보너스가 파워에 포함
  const withBonus = emblemMods(s).power;
  const perSum = Object.values(EMBLEMS).filter((e) => e.kind === 'power').reduce((a, e) => a + e.per * 1, 0);
  assert.ok(Math.abs(withBonus - (1 + perSum + EMBLEM_COMPLETE_BONUS)) < 1e-9, '완성 보너스 합산');
});

test('엠블럼: 세이브 왕복 보존', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { gem: 100000 });
  upgradeEmblem(s, 'E_FORTUNE'); upgradeEmblem(s, 'E_FORTUNE');
  const loaded = deserialize(serialize(s));
  assert.equal(loaded.emblems.E_FORTUNE, 2);
  assert.equal(emblemMods(loaded).currency, emblemMods(s).currency);
});

// ── 정령/가디언 ──
test('정령: 소환 → 보유+자동장착, 다이아 소모', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { gem: 100000 });
  const before = s.wallet.gem;
  const r = guardianSummon(s, () => 0); // 결정론적: 첫 R 정령
  assert.equal(r.ok, true);
  assert.equal(s.wallet.gem, before - GUARDIAN_SUMMON_COST.gem);
  assert.ok(s.guardians.owned[r.guardian] >= 1);
  assert.ok(s.guardians.active.includes(r.guardian), '빈 슬롯 자동 장착');
});

test('정령: 장착 정령만 계정 배수, 최대 3', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { gem: 1e9 });
  const base = accountMods(s).powerMult;
  // 여러 종 확보
  for (let i = 0; i < 30; i++) guardianSummon(s, Math.random);
  assert.ok(s.guardians.active.length <= MAX_ACTIVE_GUARDIANS, '장착 상한 3');
  // 파워형 정령이 장착되어 있으면 파워 상승 가능(적어도 배수≥1)
  assert.ok(guardianMods(s).power >= 1);
  assert.ok(accountMods(s).powerMult >= base);
});

test('정령: 장착/해제 토글', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { gem: 1e9 });
  const r = guardianSummon(s, () => 0);
  const id = r.guardian;
  assert.equal(unequipGuardian(s, id).ok, true);
  assert.equal(s.guardians.active.includes(id), false);
  assert.equal(equipGuardian(s, id).ok, true);
  assert.equal(s.guardians.active.includes(id), true);
});

test('정령: 세이브 왕복 보존', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { gem: 100000 });
  guardianSummon(s, () => 0);
  const loaded = deserialize(serialize(s));
  assert.deepEqual(loaded.guardians.owned, s.guardians.owned);
  assert.deepEqual(loaded.guardians.active, s.guardians.active);
});
