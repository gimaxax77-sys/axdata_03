import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { earn } from '../core/economy.mjs';
import { levelUp, enhanceNode } from '../core/character.mjs';
import { craftGear, equipGear } from '../core/gear.mjs';
import { invested, dismantleUnit, dismantlePreview } from '../core/dismantle.mjs';

function seed() {
  const a = createUnit('STRIKER', { level: 1, rank: 1 });
  const b = createUnit('VANGUARD', { level: 1, rank: 1 });
  const s = createGameState({ units: [a, b], party: [a.uid] });
  earn(s.wallet, { growth: 1e7, currency: 1e7, gem: 1e5, summon: 1e4 });
  return { s, a, b };
}

test('분해: 투자 성장 자원 100% 환급', () => {
  const { s, b } = seed();
  // b에 레벨 10회 + 각인 3회 투자
  for (let i = 0; i < 10; i++) levelUp(s, b.uid);
  for (let i = 0; i < 3; i++) enhanceNode(s, b.uid, 'atk');
  const before = { growth: s.wallet.growth, currency: s.wallet.currency };
  const exp = invested(b);
  const r = dismantleUnit(s, b.uid);
  assert.ok(r.ok, '분해 성공');
  assert.equal(s.wallet.growth, before.growth + exp.growth, 'growth 전액 환급');
  assert.equal(s.wallet.currency, before.currency + exp.currency, 'currency 전액 환급');
  assert.equal(s.units.length, 1, '유닛 제거됨');
});

test('분해: 장착 장비는 인벤토리로 회수(소실 없음)', () => {
  const { s, b } = seed();
  const c = craftGear(s, 'RUNE_BLADE');
  assert.ok(c.ok);
  equipGear(s, b.uid, c.item.uid);
  const invBefore = s.inventory.length;
  const r = dismantleUnit(s, b.uid);
  assert.ok(r.ok);
  assert.equal(r.gearBack, 1, '장비 1개 회수');
  assert.equal(s.inventory.length, invBefore + 1, '인벤토리로 복귀');
  assert.ok(s.inventory.some((g) => g.uid === c.item.uid), '동일 인스턴스 보존');
});

test('분해: 마지막 유닛·편성 중 유닛 보호', () => {
  const { s, a, b } = seed();
  // a는 편성 중 → 거부
  assert.equal(dismantleUnit(s, a.uid).ok, false, '편성 중 거부');
  // b 분해 후 1명 남으면 마지막 보호
  dismantleUnit(s, b.uid);
  assert.equal(dismantleUnit(s, a.uid).ok, false, '마지막 유닛 거부(편성 중이기도)');
  assert.equal(s.units.length, 1);
});

test('분해: 미리보기 = 실제 환급과 일치', () => {
  const { s, b } = seed();
  for (let i = 0; i < 5; i++) levelUp(s, b.uid);
  const pv = dismantlePreview(s, b.uid);
  assert.ok(pv.ok);
  const before = s.wallet.growth;
  dismantleUnit(s, b.uid);
  assert.equal(s.wallet.growth, before + pv.refund.growth, '미리보기 growth = 실제');
});

test('분해: 아바타/진형 참조 정리', () => {
  const { s, b } = seed();
  s.profile = { avatarUid: b.uid };
  s.formation = { [b.uid]: 'back' };
  dismantleUnit(s, b.uid);
  assert.equal(s.profile.avatarUid, null, '아바타 참조 해제');
  assert.equal(s.formation[b.uid], undefined, '진형 참조 정리');
});
