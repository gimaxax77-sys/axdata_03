import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spendNudges } from '../core/nudges.mjs';

test('spendNudges: 소환 재화 넉넉하면 알림', () => {
  const out = spendNudges({ wallet: { summon: 250 } });
  assert.equal(out.length, 1);
  assert.equal(out[0].key, 'summon');
  assert.equal(out[0].pulls, 2);
});

test('spendNudges: 10연 1회분 미만이면 알림 없음', () => {
  assert.deepEqual(spendNudges({ wallet: { summon: 99 } }), []);
});

test('spendNudges: 빈 지갑 안전', () => {
  assert.deepEqual(spendNudges({}), []);
});
