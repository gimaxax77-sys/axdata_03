import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUnit } from '../core/units.mjs';
import { resolvePvP } from '../core/resolution.mjs';
import { createGear, equipGear } from '../core/gear.mjs';
import { FEATURES } from '../core/features.mjs';

function party(n, { level = 40, rank = 4, rarity = 'SSR', element = null, arch = 'STRIKER' } = {}) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const u = createUnit(arch, { level, rank, element, signature: arch === 'STRIKER' ? 'SIG_FLAME_EDGE' : null });
    u.rarity = rarity;
    arr.push(u);
  }
  return arr;
}

test('PvP: 빈 파티 처리', () => {
  assert.equal(resolvePvP([], party(3)).win, false);
  assert.equal(resolvePvP(party(3), []).win, true);
});

test('PvP: 동일 파티는 선공(공격자) 승', () => {
  const a = party(3); const d = party(3);
  const r = resolvePvP(a, d);
  assert.equal(r.win, true, '동률 → 공격자 승');
  assert.ok(Math.abs(r.margin - 1) < 1e-6, '여유 ≈ 1');
});

test('PvP: 강한 공격자가 이긴다', () => {
  const weak = party(3, { level: 20, rank: 2 });
  const strong = party(3, { level: 60, rank: 6 });
  assert.equal(resolvePvP(strong, weak).win, true, '강자 공격 승');
  assert.equal(resolvePvP(weak, strong).win, false, '약자 공격 패');
});

test('PvP: 계정 파워 배수 반영', () => {
  const a = party(3); const d = party(3);
  const base = resolvePvP(a, d, { powerMult: 1 }, { powerMult: 1 });
  const buffed = resolvePvP(a, d, { powerMult: 3 }, { powerMult: 1 });
  assert.ok(buffed.margin > base.margin, '공격자 파워 배수로 여유↑');
});

test('PvP: 속성 상성 반영(대표 속성)', () => {
  FEATURES.elements = true; // 상성 검증 → 속성 명시적으로 켬
  try {
    // 공격 WATER vs 방어 FIRE → 유리(상성 1.3)
    const water = party(3, { element: 'WATER' });
    const fire = party(3, { element: 'FIRE' });
    const adv = resolvePvP(water, fire).margin;
    const neutral = resolvePvP(party(3, { element: 'LIGHT' }), fire).margin;
    assert.ok(adv > neutral, '상성 유리 시 여유↑');
  } finally {
    FEATURES.elements = false; // 기본값(off) 복구
  }
});

test('PvP: 방어 유리(강한 방어팀)면 방어 성공', () => {
  const atk = party(2, { level: 30, rank: 3 });
  const def = party(4, { level: 60, rank: 6, arch: 'VANGUARD', rarity: 'SSR' });
  const r = resolvePvP(atk, def);
  assert.equal(r.win, false, '훨씬 강한 방어팀 → 방어 성공');
});

test('PvP: 결정론 — 같은 입력 같은 결과', () => {
  const a = party(3); const d = party(3, { level: 45 });
  const r1 = resolvePvP(a, d);
  const r2 = resolvePvP(a, d);
  assert.equal(r1.win, r2.win);
  assert.equal(r1.margin, r2.margin);
});
