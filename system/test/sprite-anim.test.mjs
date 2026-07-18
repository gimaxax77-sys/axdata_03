import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  frameCount, frameAt, frameOffsetX, isPlaybackDone, stateSpec, SPRITE_STATES,
} from '../core/spriteAnim.mjs';

test('frameCount: 가로 스트립 폭 → 프레임 수', () => {
  assert.equal(frameCount(1200, 120), 10);
  assert.equal(frameCount(512, 128), 4);
  assert.equal(frameCount(100, 0), 1, '0 폭 방어');
  assert.equal(frameCount(50, 128), 1, '최소 1프레임');
});

test('frameAt: 순환/1회 재생', () => {
  // 10fps → 프레임당 100ms
  assert.equal(frameAt(0, 10, 8, true), 0);
  assert.equal(frameAt(250, 10, 8, true), 2);
  assert.equal(frameAt(850, 10, 8, true), 0, '8프레임 순환(=frame 8 → 0)');
  // 1회 재생: 마지막에서 정지
  assert.equal(frameAt(850, 10, 8, false), 7, '1회 재생 마지막 프레임 정지');
  assert.equal(frameAt(99999, 10, 8, false), 7);
  // 방어
  assert.equal(frameAt(500, 10, 1, true), 0, '단일 프레임');
  assert.equal(frameAt(500, 0, 8, true), 0, 'fps 0 방어');
});

test('frameOffsetX: 프레임 → 배경 오프셋', () => {
  assert.equal(frameOffsetX(0, 128), 0);
  assert.equal(frameOffsetX(3, 128), -384);
});

test('isPlaybackDone: 1회 재생 완료 판정', () => {
  // 8프레임 @10fps = 800ms
  assert.equal(isPlaybackDone(700, 10, 8), false);
  assert.equal(isPlaybackDone(800, 10, 8), true);
  assert.equal(isPlaybackDone(0, 10, 1), true, '단일 프레임 즉시 완료');
});

test('stateSpec: 상태별 규약 + 폴백', () => {
  assert.equal(stateSpec('idle').loop, true);
  assert.equal(stateSpec('attack').loop, false);
  assert.equal(stateSpec('death').loop, false);
  assert.deepEqual(stateSpec('unknown'), SPRITE_STATES.idle, '미정의 → idle 폴백');
});
