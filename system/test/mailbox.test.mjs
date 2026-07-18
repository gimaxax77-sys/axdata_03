import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearClaimedMail, unreadMailCount } from '../core/mailbox.mjs';

test('clearClaimedMail: 수령 완료 우편만 제거, 미수령은 유지', () => {
  const state = { mail: [
    { id: 'm1', claimed: true },
    { id: 'm2', claimed: false },
    { id: 'm3', claimed: true },
  ] };
  const r = clearClaimedMail(state);
  assert.equal(r.ok, true);
  assert.equal(r.removed, 2);
  assert.deepEqual(state.mail.map((m) => m.id), ['m2']);
  assert.equal(unreadMailCount(state), 1);
});

test('clearClaimedMail: 지울 게 없으면 ok=false', () => {
  const state = { mail: [{ id: 'm1', claimed: false }] };
  const r = clearClaimedMail(state);
  assert.equal(r.ok, false);
  assert.equal(r.removed, 0);
  assert.equal(state.mail.length, 1);
});

test('clearClaimedMail: 빈 우편함 안전', () => {
  const state = {};
  const r = clearClaimedMail(state);
  assert.equal(r.ok, false);
  assert.deepEqual(state.mail, []);
});
