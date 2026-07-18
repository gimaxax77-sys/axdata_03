import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRemoteConfig, applyRemoteConfig, loadRemoteConfig } from '../../app/backend/remoteConfig.mjs';
import { getBalanceValue, setBalanceValue } from '../core/admin.mjs';

test('원격설정: 문자열 JSON 파싱', () => {
  const raw = { balance: '{"powerWeights.hp":0.12}', notice: '{"text":"점검 안내"}', empty: '' };
  const cfg = parseRemoteConfig(raw);
  assert.deepEqual(cfg.balance, { 'powerWeights.hp': 0.12 });
  assert.deepEqual(cfg.notice, { text: '점검 안내' });
  assert.equal('empty' in cfg, false, '빈 문자열은 무시');
});

test('원격설정: 잘못된 JSON은 원문 유지', () => {
  const cfg = parseRemoteConfig({ note: 'not-json' });
  assert.equal(cfg.note, 'not-json');
});

test('원격설정: balance 오버라이드가 BALANCE에 반영(admin 경로 재사용)', () => {
  const orig = getBalanceValue('powerWeights.hp');
  try {
    const r = applyRemoteConfig({ balance: { 'powerWeights.hp': 0.13 } });
    assert.equal(r.applied, 1);
    assert.equal(getBalanceValue('powerWeights.hp'), 0.13, '라이브 반영');
  } finally {
    setBalanceValue('powerWeights.hp', orig); // 복원(다른 테스트 오염 방지)
  }
});

test('원격설정: 미등록 경로는 무시(안전)', () => {
  const before = getBalanceValue('powerWeights.hp');
  applyRemoteConfig({ balance: { 'nonexistent.path': 999, 'evil.hack': 1 } });
  assert.equal(getBalanceValue('powerWeights.hp'), before, '허용 경로만 반영');
});

test('원격설정: notice/event 표시용 반환', () => {
  const r = applyRemoteConfig({ notice: { text: '서버 점검' }, event: { text: '2배 이벤트' } });
  assert.equal(r.notice.text, '서버 점검');
  assert.equal(r.event.text, '2배 이벤트');
  // text 없는 항목은 null
  assert.equal(applyRemoteConfig({ notice: {} }).notice, null);
});

test('원격설정: loadRemoteConfig 원스텝(파싱+적용)', () => {
  const orig = getBalanceValue('rewardGrowth');
  try {
    const r = loadRemoteConfig({ balance: '{"rewardGrowth":1.16}', event: '{"text":"주말 이벤트"}' });
    assert.equal(getBalanceValue('rewardGrowth'), 1.16);
    assert.equal(r.event.text, '주말 이벤트');
  } finally {
    setBalanceValue('rewardGrowth', orig);
  }
});
