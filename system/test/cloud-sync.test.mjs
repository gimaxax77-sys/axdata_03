import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseSave, makeEnvelope, saveProgress, cloudDocPath } from '../../app/backend/sync.mjs';
import { createGameState } from '../core/gameState.mjs';

const env = ({ blob = 'x', version = 2, progress = 0, updatedAt = 0 } = {}) =>
  makeEnvelope({ blob, version, progress, now: updatedAt });

test('sync: 원격/로컬 없음 처리', () => {
  assert.equal(chooseSave(env(), null).pick, 'local');
  assert.equal(chooseSave(null, env()).pick, 'remote');
  assert.equal(chooseSave(env(), { blob: '' }).pick, 'local'); // 빈 원격
});

test('sync: 스키마 버전 높은 쪽 우선', () => {
  assert.equal(chooseSave(env({ version: 2 }), env({ version: 3 })).pick, 'remote');
  assert.equal(chooseSave(env({ version: 3 }), env({ version: 2 })).pick, 'local');
});

test('sync: 진행도(progress) 큰 쪽 우선 — 오래된 기기가 덮지 않게', () => {
  // 원격이 진행 많음 → 로컬(진행 적음)이 최신 시각이어도 원격 채택
  const local = env({ progress: 100, updatedAt: 9999 });
  const remote = env({ progress: 500, updatedAt: 10 });
  assert.equal(chooseSave(local, remote).pick, 'remote');
  assert.equal(chooseSave(local, remote).reason, 'progress');
});

test('sync: 진행 동률이면 최신 시각 우선', () => {
  const local = env({ progress: 100, updatedAt: 100 });
  const remote = env({ progress: 100, updatedAt: 200 });
  assert.equal(chooseSave(local, remote).pick, 'remote');
  const local2 = env({ progress: 100, updatedAt: 300 });
  assert.equal(chooseSave(local2, remote).pick, 'local');
});

test('sync: saveProgress는 peakStage 기반 단조 지표', () => {
  const s = createGameState({ units: [], party: [] });
  s.peakStage = 50; s.maxStage = 40;
  const p1 = saveProgress(s);
  s.peakStage = 80;
  assert.ok(saveProgress(s) > p1, 'peakStage 오르면 진행도↑');
});

test('sync: 문서 경로', () => {
  assert.equal(cloudDocPath('abc'), 'users/abc');
});
