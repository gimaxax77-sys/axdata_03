import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salvageTargets, autoSalvage, SALVAGE_VALUE } from '../core/gearsalvage.mjs';

function baseState() {
  return {
    wallet: { currency: 0 },
    inventory: [
      { uid: 'g1', rarity: 'N', level: 1 },
      { uid: 'g2', rarity: 'R', level: 1 },
      { uid: 'g3', rarity: 'SR', level: 1 },
      { uid: 'g4', rarity: 'N', level: 3 },        // 강화품 — 보호
      { uid: 'g5', rarity: 'R', level: 1, enchant: { key: 'atk', level: 1 } }, // 인챈트 — 보호
      { uid: 'g6', level: 1 },                      // 등급 없는 레거시 — 제외
    ],
  };
}

test('salvageTargets: 임계 이하 & 미투자 순수 드롭만', () => {
  const t = salvageTargets(baseState(), 'R');
  assert.deepEqual(t.map((x) => x.uid), ['g1', 'g2']);
});

test('salvageTargets: N 임계면 N만', () => {
  const t = salvageTargets(baseState(), 'N');
  assert.deepEqual(t.map((x) => x.uid), ['g1']);
});

test('autoSalvage: 대상 제거 + 재화 환급', () => {
  const s = baseState();
  const r = autoSalvage(s, 'R');
  assert.equal(r.ok, true);
  assert.equal(r.removed, 2);
  assert.equal(r.refund.currency, SALVAGE_VALUE.N + SALVAGE_VALUE.R);
  assert.equal(s.wallet.currency, SALVAGE_VALUE.N + SALVAGE_VALUE.R);
  assert.deepEqual(s.inventory.map((x) => x.uid), ['g3', 'g4', 'g5', 'g6']);
});

test('autoSalvage: 대상 없으면 ok=false', () => {
  const r = autoSalvage({ wallet: {}, inventory: [] }, 'R');
  assert.equal(r.ok, false);
  assert.equal(r.removed, 0);
});

test('autoSalvage: 임계 null(끄기)이면 아무것도 안 함', () => {
  const s = baseState();
  const r = autoSalvage(s, null);
  assert.equal(r.ok, false);
  assert.equal(s.inventory.length, 6);
});
