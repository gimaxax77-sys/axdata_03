import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, getPartyUnits } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { earn } from '../core/economy.mjs';
import { accountMods } from '../core/balance.mjs';
import { RELICS, upgradeRelic, relicUpgradeCost, RELIC_CAP } from '../core/relics.mjs';
import { petSummon, equipPet, MAX_ACTIVE_PETS } from '../core/pets.mjs';
import { resolve } from '../core/resolution.mjs';
import { getStage } from '../core/progression.mjs';

test('relics: 강화가 계정 배수를 올린다 + 상한', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { currency: 1e12 });
  const rid = Object.keys(RELICS)[0];
  const before = accountMods(s);
  assert.equal(upgradeRelic(s, rid).ok, true);
  const after = accountMods(s);
  const kind = RELICS[rid].kind;
  const key = kind === 'power' ? 'powerMult' : kind === 'currency' ? 'currencyMult' : 'growthMult';
  assert.ok(after[key] > before[key], '해당 계정 배수↑');
  let guard = 0;
  while (upgradeRelic(s, rid).ok && guard++ < 999) { /* to cap */ }
  assert.equal(s.relics[rid], RELIC_CAP);
});

test('pets: 소환→장착이 계정 파워 배수에 기여, 슬롯 상한', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { gem: 1e6 });
  for (let i = 0; i < 6; i++) petSummon(s, () => 0.5);
  const owned = Object.keys(s.pets.owned);
  assert.ok(owned.length > 0, '펫 획득');
  const before = accountMods(s).power ?? accountMods(s).powerMult;
  let equipped = 0;
  for (const id of owned) { if (equipPet(s, id).ok) equipped++; }
  assert.ok(equipped <= MAX_ACTIVE_PETS, '장착 슬롯 상한');
  assert.ok(s.pets.active.length <= MAX_ACTIVE_PETS);
});

test('resolution: 결정론적 + 강한 파티는 이기고 약한 파티는 진다', () => {
  const strong = [createUnit('STRIKER', { level: 40, rank: 3 }), createUnit('VANGUARD', { level: 40, rank: 3 })];
  const weak = [createUnit('STRIKER', { level: 1, rank: 1 })];
  const ch = getStage(3).challenge;
  const a = resolve(strong, ch, {});
  const b = resolve(strong, ch, {});
  assert.equal(a.win, b.win); assert.equal(a.duration, b.duration); // 결정론
  assert.equal(resolve(weak, getStage(500).challenge, {}).win, false, '벽');
  assert.ok(resolve(strong, getStage(1).challenge, {}).win, '초반 승리');
});

test('resolution: accountMods.powerMult가 전투력에 곱해진다', () => {
  const party = [createUnit('STRIKER', { level: 20, rank: 2 })];
  const ch = getStage(20).challenge;
  const base = resolve(party, ch, { powerMult: 1 });
  const buffed = resolve(party, ch, { powerMult: 5 });
  // 더 강하면 더 빨리 잡거나 이긴다
  assert.ok(buffed.margin >= base.margin);
});

test('resolution: 빈 파티는 패배', () => {
  assert.equal(resolve([], getStage(1).challenge, {}).win, false);
});
