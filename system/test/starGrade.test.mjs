import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { earn } from '../core/economy.mjs';
import { computePower } from '../core/stats.mjs';
import { starOf, starMult, starUpReq, availableDupes, starUpInfo, starUp, STAR_MAX } from '../core/starGrade.mjs';

// 같은 캐릭터 유닛을 n개 만들어 상태 구성.
function withCopies(n, opts = {}) {
  const units = [];
  for (let i = 0; i < n; i++) {
    const u = createUnit('VANGUARD', { characterId: 'hero_a', ...opts });
    u.rarity = 'SR';
    units.push(u);
  }
  const s = createGameState({ units, party: [units[0].uid] });
  earn(s.wallet, { currency: 1e12 });
  return { s, target: units[0], units };
}

test('starGrade: 신규 유닛은 1성, 배수 1.0', () => {
  const u = createUnit('VANGUARD', { characterId: 'x' });
  assert.equal(starOf(u), 1);
  assert.equal(starMult(u), 1);
});

test('starGrade: 성급이 오르면 스탯(전투력)이 상승한다', () => {
  const u = createUnit('VANGUARD', { characterId: 'x' });
  u.rarity = 'SR';
  const p1 = computePower(u);
  u.star = 2;
  const p2 = computePower(u);
  assert.ok(p2 > p1, '2성 전투력 > 1성');
  // +12%/성급 곱연산 확인(대략)
  assert.ok(Math.abs(starMult(u) - 1.12) < 1e-9);
});

test('starGrade: 중복 부족이면 강화 실패, 파티/대상은 소모 후보에서 제외', () => {
  // 대상 1 + 파티에 든 사본은 제외되므로, 사본 1개(비파티)만 준비 → 1성→2성 필요 1개 충족
  const { s, target, units } = withCopies(2); // units[0]=대상(파티), units[1]=비파티 사본
  const info = starUpInfo(s, target);
  assert.equal(info.req.dupes, 1);
  assert.equal(info.haveDupes, 1, '비파티 사본만 후보');
  assert.ok(info.canUp);
});

test('starGrade: 강화 시 중복이 소모되고 별이 오른다', () => {
  const { s, target } = withCopies(2);
  const before = s.units.length;
  const r = starUp(s, target.uid);
  assert.equal(r.ok, true);
  assert.equal(r.star, 2);
  assert.equal(r.consumed, 1);
  assert.equal(s.units.length, before - 1, '사본 1명 소모');
  assert.equal(starOf(s.units.find((u) => u.uid === target.uid)), 2);
});

test('starGrade: 소모되는 중복의 장비·룬은 인벤토리로 회수(손실 없음)', () => {
  const { s, target, units } = withCopies(2);
  const dupe = units[1];
  dupe.gear.weapon = { uid: 'g999', slot: 'weapon', rarity: 'SR' };
  dupe.runes[0] = { uid: 'r999', rarity: 'SR' };
  const invBefore = s.inventory.length, bagBefore = s.runeBag.length;
  const r = starUp(s, target.uid);
  assert.equal(r.ok, true);
  assert.equal(s.inventory.length, invBefore + 1, '장비 회수');
  assert.equal(s.runeBag.length, bagBefore + 1, '룬 회수');
});

test('starGrade: 비용 증가 — 2성→3성은 중복 2개 필요', () => {
  assert.equal(starUpReq(1).dupes, 1);
  assert.equal(starUpReq(2).dupes, 2);
  assert.equal(starUpReq(3).dupes, 3);
  assert.equal(starUpReq(4).dupes, 4);
});

test('starGrade: 최고 성급에서는 더 못 올린다', () => {
  const u = createUnit('VANGUARD', { characterId: 'x' });
  u.rarity = 'SR';
  u.star = STAR_MAX;
  const s = createGameState({ units: [u], party: [u.uid] });
  const info = starUpInfo(s, u);
  assert.equal(info.maxed, true);
  assert.equal(info.canUp, false);
  assert.equal(starUp(s, u.uid).ok, false);
});

test('starGrade: 정체성(characterId) 없는 유닛은 성급 강화 불가', () => {
  const u = createUnit('VANGUARD', {});
  const s = createGameState({ units: [u], party: [u.uid] });
  assert.equal(availableDupes(s, u).length, 0);
  assert.equal(starUp(s, u.uid).ok, false);
});
