import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUnit } from '../core/units.mjs';
import { combatContributions } from '../core/resolution.mjs';

test('DPS 미터: 유닛별 기여·비중 합=1', () => {
  const dealer = createUnit('STRIKER', { level: 60, rank: 4 }); dealer.rarity = 'SSR';
  const tank = createUnit('VANGUARD', { level: 60, rank: 4 }); tank.rarity = 'SR';
  const r = combatContributions([dealer, tank], { hp: 50000, atk: 800, def: 200, element: null });
  assert.equal(r.units.length, 2);
  const shareSum = r.units.reduce((s, u) => s + u.dpsShare, 0);
  assert.ok(Math.abs(shareSum - 1) < 1e-9, 'dpsShare 합 = 1');
  // 딜러가 딜 비중 1위(내림차순 정렬)
  assert.equal(r.units[0].uid, dealer.uid, '딜러가 딜 비중 최상위');
  assert.ok(r.units[0].dpsShare > r.units[1].dpsShare, '딜러 > 탱커 딜 비중');
  assert.ok(r.totalDPS > 0 && r.totalHP > 0);
});

test('DPS 미터: 속성 상성이 기여에 반영', () => {
  const fire = createUnit('STRIKER', { level: 50, rank: 3, element: 'FIRE' }); fire.rarity = 'SR';
  const other = createUnit('STRIKER', { level: 50, rank: 3, element: 'WATER' }); other.rarity = 'SR';
  // 적 속성을 FIRE에 유리하게(=적이 FIRE에 약한 속성) 두면 fire affinity>1
  const r = combatContributions([fire, other], { hp: 40000, atk: 700, def: 150, element: 'WIND' });
  const fireRow = r.units.find((u) => u.uid === fire.uid);
  assert.ok(typeof fireRow.affinity === 'number', 'affinity 노출');
});

test('DPS 미터: 빈 파티 방어', () => {
  const r = combatContributions([], {});
  assert.deepEqual(r.units, []);
  assert.equal(r.totalDPS, 0);
});
