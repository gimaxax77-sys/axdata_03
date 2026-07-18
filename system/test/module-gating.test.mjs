// 모듈 옵션화(on/off) 검증 — emblems·guardians·pets (P0 게이팅, relics와 동형).
import test from 'node:test';
import assert from 'node:assert';
import { createGameState } from '../core/gameState.mjs';
import { FEATURES } from '../core/features.mjs';
import { earn } from '../core/economy.mjs';
import { emblemMods, upgradeEmblem } from '../core/emblems.mjs';
import { guardianMods, guardianSummon } from '../core/guardians.mjs';
import { petMods, petSummon } from '../core/pets.mjs';

const NEUTRAL = { power: 1, currency: 1, growth: 1 };

test('emblems: ON 기여 / OFF 중립·차단·보존', () => {
  const s = createGameState({ units: [], party: [] });
  s.emblems = { E_VALOR: 5 }; // power per 0.04 × 5 = +0.20
  assert.ok(emblemMods(s).power > 1.19, 'ON이면 파워 기여');
  earn(s.wallet, { gem: 1e9 });
  FEATURES.emblems = false;
  try {
    assert.deepEqual(emblemMods(s), NEUTRAL, 'OFF면 중립');
    assert.equal(upgradeEmblem(s, 'E_VALOR').ok, false, 'OFF면 강화 차단');
    assert.equal(s.emblems.E_VALOR, 5, 'OFF여도 상태 보존');
  } finally { FEATURES.emblems = true; }
});

test('guardians: OFF 중립·차단', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { gem: 1e9 });
  FEATURES.guardians = false;
  try {
    assert.deepEqual(guardianMods(s), NEUTRAL, 'OFF면 중립');
    assert.equal(guardianSummon(s, () => 0).ok, false, 'OFF면 소환 차단');
  } finally { FEATURES.guardians = true; }
  assert.deepEqual(guardianMods(createGameState({ units: [], party: [] })), NEUTRAL, 'ON 기본상태도 중립(보유 없음)');
});

test('pets: OFF 중립·차단', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { gem: 1e9 });
  FEATURES.pets = false;
  try {
    assert.deepEqual(petMods(s), NEUTRAL, 'OFF면 중립');
    assert.equal(petSummon(s, () => 0).ok, false, 'OFF면 소환 차단');
  } finally { FEATURES.pets = true; }
});
