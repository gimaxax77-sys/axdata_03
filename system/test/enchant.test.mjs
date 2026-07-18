import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { computePower } from '../core/stats.mjs';
import { addMaterial, materialCount } from '../core/materials.mjs';
import { earn } from '../core/economy.mjs';
import {
  createGear, equipGear, enchantGear, rerollEnchant, enchantInfo,
  enchantCost, ENCHANT_MAX, gearContribution,
} from '../core/gear.mjs';
import { serialize, deserialize } from '../core/save.mjs';

function setup(slot = 'mount', bp = 'WAR_STEED') {
  const s = createGameState({ units: [], party: [] });
  const u = createUnit('STRIKER', { level: 20, rank: 2 }); u.rarity = 'SSR';
  s.units.push(u); s.party = [u.uid];
  const it = createGear(bp, { rarity: 'SR', rng: Math.random });
  s.inventory.push(it); equipGear(s, u.uid, it.uid);
  addMaterial(s, 'elemEssence', 1000);
  return { s, u, it };
}

test('인챈트: 최초 부여 → 효과 1레벨, 재료 소모', () => {
  const { s, it } = setup();
  const before = materialCount(s, 'elemEssence');
  const r = enchantGear(s, it.uid);
  assert.equal(r.ok, true);
  assert.equal(it.enchant.level, 1);
  assert.equal(materialCount(s, 'elemEssence'), before - enchantCost(0).elemEssence);
  assert.ok(enchantInfo(it).value > 0);
});

test('인챈트: 레벨업으로 값 상승, 상한 준수', () => {
  const { s, it } = setup();
  let last = 0;
  for (let i = 0; i < ENCHANT_MAX; i++) {
    const r = enchantGear(s, it.uid);
    assert.equal(r.ok, true);
    assert.ok(r.info.value >= last); last = r.info.value;
  }
  assert.equal(it.enchant.level, ENCHANT_MAX);
  assert.equal(enchantGear(s, it.uid).ok, false, '상한 초과 거부');
});

test('인챈트: 탈것(mount)에도 적용 — 전투력 상승', () => {
  const { s, u, it } = setup('mount', 'WAR_STEED');
  const before = computePower(u);
  enchantGear(s, it.uid);
  enchantGear(s, it.uid);
  assert.ok(computePower(u) > before, '탈것 인챈트가 전투력에 반영');
});

test('인챈트: 기여가 statPct/effect로 합산', () => {
  const { s, it } = setup();
  // 효과형이 나올 때까지 재추첨(다이아)로 강제 — 최소한 기여 키가 존재
  enchantGear(s, it.uid);
  const en = enchantInfo(it);
  const c = gearContribution(it);
  const bucket = en.kind === 'statPct' ? c.statPct : c.effect;
  assert.ok((bucket[en.key] || 0) >= en.value, '인챈트 기여 합산');
});

test('인챈트: 효과 재추첨은 레벨 유지', () => {
  const { s, it } = setup();
  earn(s.wallet, { gem: 100 });
  enchantGear(s, it.uid); enchantGear(s, it.uid);
  const lv = it.enchant.level;
  const r = rerollEnchant(s, it.uid);
  assert.equal(r.ok, true);
  assert.equal(it.enchant.level, lv, '레벨 보존');
});

test('인챈트: 세이브 왕복 보존', () => {
  const { s, it } = setup();
  enchantGear(s, it.uid); enchantGear(s, it.uid);
  const loaded = deserialize(serialize(s));
  const gu = loaded.units[0];
  assert.deepEqual(gu.gear.mount.enchant, it.enchant, '인챈트 보존');
});
