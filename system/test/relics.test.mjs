// 유물(relics) 모듈 옵션화(on/off) 검증 — P0 게이팅 파일럿.
import test from 'node:test';
import assert from 'node:assert';
import { createGameState } from '../core/gameState.mjs';
import { relicMods, upgradeRelic } from '../core/relics.mjs';
import { accountMods } from '../core/balance.mjs';
import { FEATURES } from '../core/features.mjs';
import { earn } from '../core/economy.mjs';

test('유물 ON: 강화 가능 + 파워 기여', () => {
  const s = createGameState({ units: [], party: [] });
  s.relics = { R_POWER: 10 }; // per 0.03 × 10 = +0.30
  assert.ok(Math.abs(relicMods(s).power - 1.3) < 1e-9, '유물 파워 배수 1.3');
  assert.ok(accountMods(s).powerMult >= 1.3 - 1e-9, '계정 powerMult에 반영');
  earn(s.wallet, { currency: 1e9 });
  assert.equal(upgradeRelic(s, 'R_POWER').ok, true, 'ON이면 강화 성공');
});

test('유물 OFF: 중립 배수 + 액션 차단 + 상태 보존', () => {
  const s = createGameState({ units: [], party: [] });
  s.relics = { R_POWER: 10 };
  earn(s.wallet, { currency: 1e9 });
  const powerOn = accountMods(s).powerMult;
  FEATURES.relics = false;
  try {
    assert.deepEqual(relicMods(s), { power: 1, currency: 1, growth: 1 }, 'OFF면 중립(1,1,1)');
    assert.ok(accountMods(s).powerMult < powerOn, 'OFF면 유물 파워 기여 제거');
    assert.equal(upgradeRelic(s, 'R_POWER').ok, false, 'OFF면 강화 차단');
    assert.equal(s.relics.R_POWER, 10, 'OFF여도 상태(레벨)는 보존 → 다시 켜면 복원');
  } finally {
    FEATURES.relics = true; // 다른 테스트 오염 방지(복원)
  }
});
