import { test } from 'node:test';
import assert from 'node:assert/strict';
import { villageTier, VILLAGE_TIERS } from '../core/village.mjs';

test('본진 발전: 진행도에 따라 단계 상승', () => {
  assert.equal(villageTier(1).id, 'camp');
  assert.equal(villageTier(25).id, 'outpost');
  assert.equal(villageTier(200).id, 'town');
  assert.equal(villageTier(99999).id, 'capital');
});

test('본진 발전: 다음 단계까지 진행률(0~1)', () => {
  const t = villageTier(40); // outpost(20)~hamlet(60) 중간
  assert.equal(t.id, 'outpost');
  assert.ok(t.progress > 0 && t.progress < 1, '중간 진행률');
  assert.equal(villageTier(99999).progress, 1, '최종 단계 100%');
  assert.equal(villageTier(99999).next, null);
});
