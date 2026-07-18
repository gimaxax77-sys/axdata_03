import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePurchase, purchaseStatusText } from '../../app/backend/purchaseFlow.mjs';

test('결제: 스토어 실패 → 미지급', () => {
  const r = resolvePurchase({ storeOk: false });
  assert.equal(r.grant, false);
  assert.equal(r.status, 'store-failed');
});

test('결제: 웹/개발(mock) → 지급(검증 생략)', () => {
  const r = resolvePurchase({ storeOk: true, mock: true, cloudAvailable: false });
  assert.equal(r.grant, true);
  assert.equal(r.status, 'mock');
});

test('결제: 실결제 + 서버검증 통과 → 지급', () => {
  const r = resolvePurchase({ storeOk: true, mock: false, cloudAvailable: true, verifyOk: true });
  assert.equal(r.grant, true);
  assert.equal(r.status, 'verified');
});

test('결제: 실결제 + 검증 실패 → 미지급(안티프로드)', () => {
  const r = resolvePurchase({ storeOk: true, mock: false, cloudAvailable: true, verifyOk: false, verifyReason: 'bad-token' });
  assert.equal(r.grant, false);
  assert.equal(r.status, 'verify-failed');
});

test('결제: 중복 결제(already-granted) → 미지급', () => {
  const r = resolvePurchase({ storeOk: true, mock: false, cloudAvailable: true, verifyOk: false, verifyReason: 'already-granted' });
  assert.equal(r.grant, false);
  assert.equal(r.status, 'already-granted');
});

test('결제: 실결제 + 서버 미설정 → 클라 신뢰 폴백(미검증 지급)', () => {
  const r = resolvePurchase({ storeOk: true, mock: false, cloudAvailable: false });
  assert.equal(r.grant, true);
  assert.equal(r.status, 'unverified');
});

test('결제: 상태 문구 매핑', () => {
  assert.match(purchaseStatusText('verified'), /검증/);
  assert.match(purchaseStatusText('verify-failed'), /검증 실패/);
  assert.match(purchaseStatusText('already-granted'), /이미/);
});
