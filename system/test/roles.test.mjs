import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLES, ROLE_IDS, DEFAULT_ROLE, PERMISSIONS,
  roleRank, isRole, atLeast, can, allowedActions, normalizeRole,
} from '../core/roles.mjs';

test('역할 서열: user < manager < admin', () => {
  assert.ok(roleRank('user') < roleRank('manager'));
  assert.ok(roleRank('manager') < roleRank('admin'));
});

test('roleRank: 모르는 값은 -1(어떤 권한도 불충족)', () => {
  assert.equal(roleRank('god'), -1);
  assert.equal(roleRank(undefined), -1);
  assert.equal(roleRank(null), -1);
});

test('isRole: 유효성 판정', () => {
  assert.ok(isRole('admin'));
  assert.ok(!isRole('superadmin'));
  assert.ok(!isRole(''));
});

test('atLeast: 상위 역할은 하위 요구를 충족', () => {
  assert.ok(atLeast('admin', 'manager'));
  assert.ok(atLeast('admin', 'user'));
  assert.ok(atLeast('manager', 'user'));
  assert.ok(!atLeast('user', 'manager'));
  assert.ok(!atLeast('manager', 'admin'));
});

test('can: 일반 유저는 플레이·세이브만', () => {
  assert.ok(can('user', 'play'));
  assert.ok(can('user', 'cloudSave'));
  assert.ok(!can('user', 'sendNotice'));
  assert.ok(!can('user', 'tuneBalance'));
});

test('can: 매니저는 운영 액션 가능, 밸런스는 불가', () => {
  assert.ok(can('manager', 'sendNotice'));
  assert.ok(can('manager', 'manageEvent'));
  assert.ok(!can('manager', 'tuneBalance'));
  assert.ok(!can('manager', 'banAccount'));
  assert.ok(!can('manager', 'setRole'));
});

test('can: 운영자는 전권', () => {
  for (const action of Object.keys(PERMISSIONS)) {
    assert.ok(can('admin', action), `admin은 ${action} 가능해야 함`);
  }
});

test('can: 미정의 액션은 안전하게 거부', () => {
  assert.ok(!can('admin', 'nukeEverything'));
  assert.ok(!can('admin', undefined));
});

test('can: 잘못된 역할은 어떤 권한도 없음', () => {
  assert.ok(!can('hacker', 'play'));
  assert.ok(!can(null, 'play'));
});

test('allowedActions: 역할별 개수 단조 증가', () => {
  const u = allowedActions('user').length;
  const m = allowedActions('manager').length;
  const a = allowedActions('admin').length;
  assert.ok(u < m && m < a);
  assert.equal(a, Object.keys(PERMISSIONS).length); // admin = 전부
});

test('normalizeRole: 이상값은 기본 역할로', () => {
  assert.equal(normalizeRole('manager'), 'manager');
  assert.equal(normalizeRole('nope'), DEFAULT_ROLE);
  assert.equal(normalizeRole(undefined), DEFAULT_ROLE);
  assert.equal(normalizeRole(null), DEFAULT_ROLE);
});

test('ROLE_IDS와 ROLES 키가 일치', () => {
  assert.deepEqual([...ROLE_IDS].sort(), Object.keys(ROLES).sort());
});
