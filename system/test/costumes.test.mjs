import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { computePower } from '../core/stats.mjs';
import { identity } from '../concepts/index.mjs';
import { fantasyConcept } from '../concepts/fantasy.mjs';
import {
  COSTUMES, ownsCostume, grantCostume, equipCostume, unequipCostume,
  costumesFor, costumeFits, refreshCostumeUnlocks, vipTier, summonCostumePool,
} from '../core/costumes.mjs';
import { summonCosmetic } from '../core/summon.mjs';
import { purchase } from '../core/shop.mjs';
import { serialize, deserialize } from '../core/save.mjs';
import { earn } from '../core/economy.mjs';

function fresh() {
  const s = createGameState({ units: [], party: [] });
  const u = createUnit('STRIKER', { level: 20, rank: 2, characterId: 'kael', element: 'FIRE' }); u.rarity = 'SSR';
  s.units.push(u); s.party = [u.uid];
  return { s, u };
}

test('코스튬: 보유→장착으로 외형(이모지) 변경', () => {
  const { s, u } = fresh();
  const before = identity(fantasyConcept, u).emoji;
  grantCostume(s, 'CS_WANDERER');
  assert.equal(ownsCostume(s, 'CS_WANDERER'), true);
  assert.equal(equipCostume(s, u, 'CS_WANDERER').ok, true);
  assert.equal(u.skin, 'CS_WANDERER');
  assert.equal(identity(fantasyConcept, u).emoji, COSTUMES.CS_WANDERER.emoji);
  assert.notEqual(identity(fantasyConcept, u).emoji, before);
});

test('코스튬: 순수 외형 — 전투력 불변', () => {
  const { s, u } = fresh();
  const p0 = computePower(u);
  grantCostume(s, 'CS_MIDNIGHT'); equipCostume(s, u, 'CS_MIDNIGHT');
  assert.equal(computePower(u), p0, '코스튬은 능력치에 영향 없음');
});

test('코스튬: 미보유 장착 거부 · 전용 적합성', () => {
  const { s, u } = fresh();
  assert.equal(equipCostume(s, u, 'CS_WANDERER').ok, false, '미보유 거부');
  // 전용(kael) 코스튬은 kael에만
  assert.equal(costumeFits(COSTUMES.CS_KAEL_CRIMSON, u), true, 'kael 적합');
  const other = createUnit('STRIKER', { level: 5, characterId: 'luna' });
  assert.equal(costumeFits(COSTUMES.CS_KAEL_CRIMSON, other), false, '타 캐릭 부적합');
});

test('코스튬: 퀘스트(스토리) 조건 자동 지급', () => {
  const { s } = fresh();
  assert.equal(ownsCostume(s, 'CS_KNIGHT'), false);
  s.campaign.cleared = 5;
  refreshCostumeUnlocks(s);
  assert.equal(ownsCostume(s, 'CS_KNIGHT'), true, '5챕터 → 영웅의 갑주');
  assert.equal(ownsCostume(s, 'CS_KAEL_CRIMSON'), false, '8챕터 미도달');
});

test('코스튬: 영웅/속성 전투력 조건 자동 지급', () => {
  const { s, u } = fresh();
  // 강하게 성장 → 전투력 마일스톤 도달
  u.level = 200; u.rank = 10; u.rarity = 'SSR';
  refreshCostumeUnlocks(s);
  assert.equal(ownsCostume(s, 'CS_TITAN'), computePower(u) >= 50000, '영웅 전투력 조건');
  assert.equal(ownsCostume(s, 'CS_INFERNO'), computePower(u) >= 30000, 'FIRE 속성 전투력 조건');
  // 다른 속성 코스튬은 미지급
  assert.equal(ownsCostume(s, 'CS_GLACIER'), false, 'WATER 미보유');
});

test('코스튬: 과금 등급(VIP) 조건 — 결제 누적 후 지급', () => {
  const { s } = fresh();
  earn(s.wallet, { gem: 0 });
  assert.equal(vipTier(s), 0);
  // 패키지 구매로 누적 결제액 적립 → VIP 상승
  purchase(s, 'PKG_LEGEND'); // ₩99,000
  assert.ok(vipTier(s) >= 3, `VIP ${vipTier(s)}`);
  refreshCostumeUnlocks(s);
  assert.equal(ownsCostume(s, 'CS_ROYAL'), true, 'VIP3 → 왕실 정장');
});

test('코스튬: 소환으로 획득 → 캐릭터에 장착 가능', () => {
  const { s, u } = fresh();
  earn(s.wallet, { gem: 10000 });
  const poolBefore = summonCostumePool(s).length;
  const r = summonCosmetic(s);
  assert.equal(r.ok, true);
  assert.equal(r.kind, 'costume');
  assert.ok(ownsCostume(s, r.item.id), '소환 코스튬 보유');
  assert.equal(summonCostumePool(s).length, poolBefore - 1);
  assert.equal(equipCostume(s, u, r.item.id).ok, true, '장착 가능');
});

test('코스튬: 세이브 왕복 — 보유·장착 보존', () => {
  const { s, u } = fresh();
  grantCostume(s, 'CS_FESTIVAL'); equipCostume(s, u, 'CS_FESTIVAL');
  const loaded = deserialize(serialize(s));
  assert.equal(ownsCostume(loaded, 'CS_FESTIVAL'), true);
  assert.equal(loaded.units[0].skin, 'CS_FESTIVAL');
});
