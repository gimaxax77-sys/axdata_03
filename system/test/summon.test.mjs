import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { earn } from '../core/economy.mjs';
import {
  summonGear, summonRune, summonCosmetic,
  GEAR_PULL_COST, RUNE_PULL_COST, COSTUME_PULL_COST, COSTUME_DUP_REFUND,
} from '../core/summon.mjs';
import { ownsCostume, grantCostume, summonCostumePool, COSTUMES } from '../core/costumes.mjs';

function fresh(gem = 10000) {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { gem });
  return s;
}

test('장비 소환: 다이아 소모 → 인벤토리에 장비', () => {
  const s = fresh();
  const before = s.wallet.gem;
  const r = summonGear(s);
  assert.equal(r.ok, true);
  assert.equal(s.wallet.gem, before - GEAR_PULL_COST.gem);
  assert.equal(s.inventory.length, 1);
  assert.ok(r.item && r.rarity && r.label);
});

test('룬 소환: 다이아 소모 → 룬 가방', () => {
  const s = fresh();
  const before = s.wallet.gem;
  const r = summonRune(s);
  assert.equal(r.ok, true);
  assert.equal(s.wallet.gem, before - RUNE_PULL_COST.gem);
  assert.equal(s.runeBag.length, 1);
  assert.ok(r.rune && r.rarity);
});

test('소환: 다이아 부족 시 실패 (지급 없음)', () => {
  const s = fresh(0);
  assert.equal(summonGear(s).ok, false);
  assert.equal(summonRune(s).ok, false);
  assert.equal(summonCosmetic(s).ok, false);
  assert.equal(s.inventory.length, 0);
  assert.equal(s.runeBag.length, 0);
});

test('코스튬 소환: 미보유 코스튬(캐릭터 스킨) 지급', () => {
  const s = fresh();
  const before = s.wallet.gem;
  const r = summonCosmetic(s);
  assert.equal(r.ok, true);
  assert.equal(s.wallet.gem, before - COSTUME_PULL_COST.gem);
  assert.equal(r.duplicate, undefined);
  assert.equal(r.kind, 'costume');
  assert.ok(ownsCostume(s, r.item.id), '지급된 코스튬 보유');
});

test('코스튬 소환: 전부 보유 시 환급', () => {
  const s = fresh();
  // 소환 코스튬 전부 미리 보유시킴
  for (const c of Object.values(COSTUMES)) if (c.source === 'summon') grantCostume(s, c.id);
  const before = s.wallet.gem;
  const r = summonCosmetic(s);
  assert.equal(r.ok, true);
  assert.equal(r.duplicate, true);
  assert.equal(s.wallet.gem, before - COSTUME_PULL_COST.gem + COSTUME_DUP_REFUND.gem);
});

test('코스튬 소환: pool 소진 (모든 소환 코스튬 획득 가능)', () => {
  const s = fresh(100000);
  const total = Object.values(COSTUMES).filter((c) => c.source === 'summon').length;
  const got = new Set();
  for (let i = 0; i < 100 && got.size < total; i++) {
    const r = summonCosmetic(s);
    if (r.ok && !r.duplicate) got.add(r.item.id);
  }
  assert.equal(got.size, total, '모든 소환 코스튬 획득 가능');
});
