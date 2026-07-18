import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NOTICE_MAX, validateNotice, buildNoticeConfig, buildEventConfig,
  canOpenConsole, consoleCapabilities, buildMailPayload, MAIL_REWARD_KEYS,
} from '../core/console.mjs';

test('validateNotice: 빈 값 거부', () => {
  assert.ok(!validateNotice('').ok);
  assert.ok(!validateNotice('   ').ok);
  assert.ok(!validateNotice(null).ok);
});

test('validateNotice: 공백 정리 후 통과', () => {
  const r = validateNotice('  점검 안내  ');
  assert.ok(r.ok);
  assert.equal(r.text, '점검 안내');
});

test('validateNotice: 최대 길이 초과 거부', () => {
  assert.ok(!validateNotice('가'.repeat(NOTICE_MAX + 1)).ok);
  assert.ok(validateNotice('가'.repeat(NOTICE_MAX)).ok);
});

test('buildNoticeConfig: key=notice, value는 JSON', () => {
  const r = buildNoticeConfig('서버 점검 20:00');
  assert.ok(r.ok);
  assert.equal(r.key, 'notice');
  assert.deepEqual(JSON.parse(r.value), { text: '서버 점검 20:00' });
});

test('buildNoticeConfig: url 포함', () => {
  const r = buildNoticeConfig('공지', { url: 'https://x.y' });
  assert.deepEqual(JSON.parse(r.value), { text: '공지', url: 'https://x.y' });
});

test('buildNoticeConfig: 잘못된 입력은 실패 전달', () => {
  const r = buildNoticeConfig('');
  assert.ok(!r.ok);
  assert.ok(r.reason);
});

test('buildEventConfig: key=event', () => {
  const r = buildEventConfig('주말 2배 이벤트');
  assert.ok(r.ok);
  assert.equal(r.key, 'event');
  assert.deepEqual(JSON.parse(r.value), { text: '주말 2배 이벤트' });
});

test('canOpenConsole: 매니저 이상만', () => {
  assert.ok(!canOpenConsole('user'));
  assert.ok(canOpenConsole('manager'));
  assert.ok(canOpenConsole('admin'));
});

test('buildMailPayload: 제목 없으면 실패', () => {
  assert.ok(!buildMailPayload({ title: '', rewards: { gem: 10 } }).ok);
  assert.ok(!buildMailPayload({ title: '   ', rewards: { gem: 10 } }).ok);
});

test('buildMailPayload: 제목만 있으면 발송 가능(보상 선택)', () => {
  const r = buildMailPayload({ title: '안내 우편', rewards: {} });
  assert.ok(r.ok);
  assert.deepEqual(r.rewards, {});
  const r2 = buildMailPayload({ title: '보상', rewards: { gem: 0 } });
  assert.ok(r2.ok);
  assert.deepEqual(r2.rewards, {}); // 0은 제거
});

test('buildMailPayload: 문자열 숫자 정리 + 0/음수 제거', () => {
  const r = buildMailPayload({ title: ' 점검 보상 ', rewards: { gem: '100', currency: 5000, summon: 0, growth: -3, junk: 9 } });
  assert.ok(r.ok);
  assert.equal(r.title, '점검 보상');
  assert.deepEqual(r.rewards, { gem: 100, currency: 5000 });
});

test('buildMailPayload: 허용 키만 통과', () => {
  const r = buildMailPayload({ title: 'x', rewards: { gem: 1, hacked: 999 } });
  assert.ok(r.ok);
  assert.ok(!('hacked' in r.rewards));
  for (const k of Object.keys(r.rewards)) assert.ok(MAIL_REWARD_KEYS.includes(k));
});

test('consoleCapabilities: 역할별 권한 매트릭스', () => {
  const u = consoleCapabilities('user');
  assert.deepEqual(u, { notice: false, event: false, balance: false });
  const m = consoleCapabilities('manager');
  assert.deepEqual(m, { notice: true, event: true, balance: false });
  const a = consoleCapabilities('admin');
  assert.deepEqual(a, { notice: true, event: true, balance: true });
});
