import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWallet, earn, spend } from '../core/economy.mjs';
import { getStage } from '../core/progression.mjs';
import { createUnit } from '../core/units.mjs';
import { computeStats, computePower } from '../core/stats.mjs';
import { RARITY_BASE_MULT } from '../core/seed.mjs';
import { FEATURES } from '../core/features.mjs';
import { isUnlocked, unlockStage, UNLOCKS } from '../core/unlocks.mjs';

test('economy: earn 누적, spend 성공/실패 원자성', () => {
  const w = createWallet();
  earn(w, { currency: 100, gem: 5 });
  assert.equal(w.currency, 100);
  assert.equal(w.gem, 5);
  // 부족하면 아무것도 차감 안 함
  assert.equal(spend(w, { currency: 50, gem: 10 }), false);
  assert.equal(w.currency, 100, '실패 시 원복');
  assert.equal(spend(w, { currency: 40, gem: 5 }), true);
  assert.equal(w.currency, 60);
  assert.equal(w.gem, 0);
});

test('progression: 스테이지가 오를수록 적/보상 단조 증가', () => {
  const s1 = getStage(1), s10 = getStage(10), s50 = getStage(50);
  assert.ok(s10.challenge.hp > s1.challenge.hp);
  assert.ok(s50.challenge.hp > s10.challenge.hp);
  assert.ok(s50.rewards.currency > s1.rewards.currency);
  assert.ok(s1.challenge.element, '속성 지정됨');
});

test('stats: 레벨/랭크가 스탯을 올린다', () => {
  const a = createUnit('STRIKER', { level: 1, rank: 1 });
  const b = createUnit('STRIKER', { level: 20, rank: 1 });
  const c = createUnit('STRIKER', { level: 1, rank: 3 });
  assert.ok(computeStats(b).atk > computeStats(a).atk, '레벨↑ → ATK↑');
  assert.ok(computeStats(c).atk > computeStats(a).atk, '랭크↑ → ATK↑');
  assert.ok(computePower(b) > computePower(a));
});

test('stats: 등급 기본 배수 — 등급 없으면 1.0(하위호환)', () => {
  FEATURES.rarity = true; // 등급 배수 검증이므로 명시적으로 켬
  try {
    const plain = createUnit('STRIKER', { level: 10, rank: 2 });
    const ssr = createUnit('STRIKER', { level: 10, rank: 2 }); ssr.rarity = 'SSR';
    const pp = computePower(plain), sp = computePower(ssr);
    // SSR은 RARITY_BASE_MULT.SSR 배 강함
    assert.ok(Math.abs(sp / pp - RARITY_BASE_MULT.SSR) < 0.02, `SSR/plain ≈ ${RARITY_BASE_MULT.SSR}`);
  } finally {
    FEATURES.rarity = false; // 기본값(off) 복구
  }
});

test('unlocks: peakStage 게이팅', () => {
  const st = { peakStage: 1 };
  assert.equal(isUnlocked(st, 'gacha'), false);
  st.peakStage = unlockStage('gacha');
  assert.equal(isUnlocked(st, 'gacha'), true);
  // 게이트 사다리 단조 증가
  assert.ok(UNLOCKS.gacha < UNLOCKS.dungeonGold);
  assert.ok(UNLOCKS.arena < UNLOCKS.guild);
});
