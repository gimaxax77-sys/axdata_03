import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { storyLog, campaignChapters } from '../core/campaign.mjs';
import { fantasyConcept } from '../concepts/fantasy.mjs';

test('스토리 도감: 클리어한 챕터만 정주행 노출', () => {
  const s = createGameState({ units: [], party: [] });
  s.campaign = { cleared: 3 };
  const camp = fantasyConcept.campaign;
  const log = storyLog(s, camp);
  assert.equal(log.readable.length, 3, '클리어 3챕터 노출');
  assert.equal(log.readable[0].title, camp[0].title, '서사 텍스트 연결');
  assert.ok(log.lockedCount > 0, '잠긴 챕터 존재');
  assert.equal(log.total, 12);
});

test('스토리 도감: 미클리어 시 빈 로그', () => {
  const s = createGameState({ units: [], party: [] });
  s.campaign = { cleared: 0 };
  const log = storyLog(s, fantasyConcept.campaign);
  assert.equal(log.readable.length, 0);
});
