import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { earn } from '../core/economy.mjs';
import { computePower } from '../core/stats.mjs';
import {
  GEAR_SLOTS, SLOT_META, GEAR_CATALOG, emptyGearSet,
  createGear, equipGear, dropGear,
} from '../core/gear.mjs';
import { serialize, deserialize, SAVE_VERSION } from '../core/save.mjs';

test('슬롯: 확장된 전 슬롯 정의 + 메타 일치', () => {
  const want = ['weapon', 'offhand', 'helmet', 'armor', 'gloves', 'pants', 'necklace', 'earring', 'accessory', 'cloak', 'mount'];
  assert.deepEqual(GEAR_SLOTS, want);
  for (const s of GEAR_SLOTS) assert.ok(SLOT_META[s] && SLOT_META[s].label, `${s} 메타`);
  // 모든 설계도의 slot이 유효
  for (const b of Object.values(GEAR_CATALOG)) assert.ok(GEAR_SLOTS.includes(b.slot), `${b.id} slot 유효`);
  // 모든 슬롯에 최소 1개 설계도(드롭·제작 가능)
  for (const s of GEAR_SLOTS) assert.ok(Object.values(GEAR_CATALOG).some((b) => b.slot === s), `${s} 설계도 존재`);
});

test('슬롯: emptyGearSet은 전 슬롯 null', () => {
  const g = emptyGearSet();
  assert.deepEqual(Object.keys(g).sort(), [...GEAR_SLOTS].sort());
  assert.ok(GEAR_SLOTS.every((s) => g[s] === null));
});

test('슬롯: 신규 슬롯 장착이 전투력에 반영', () => {
  const s = createGameState({ units: [], party: [] });
  const u = createUnit('STRIKER', { level: 20, rank: 2 }); u.rarity = 'SSR';
  s.units.push(u); s.party = [u.uid];
  const before = computePower(u);
  // 투구 장착
  const helm = createGear('IRON_HELM', { rarity: 'SR', rng: Math.random });
  s.inventory.push(helm);
  assert.equal(equipGear(s, u.uid, helm.uid).ok, true);
  assert.equal(u.gear.helmet.uid, helm.uid, '투구 슬롯 장착');
  assert.ok(computePower(u) > before, '전투력 상승');
});

test('슬롯: 드롭이 다양한 슬롯을 생성', () => {
  const s = createGameState({ units: [], party: [] });
  const slots = new Set();
  for (let i = 0; i < 400; i++) slots.add(dropGear(s, Math.random, 0).item.slot);
  // 대부분 슬롯이 드롭 풀에 등장(최소 무기·투구·탈것 확인)
  for (const s2 of ['weapon', 'helmet', 'mount', 'cloak', 'necklace']) assert.ok(slots.has(s2), `${s2} 드롭 가능`);
});

test('슬롯: 구버전 3슬롯 세이브 backfill (하위호환)', () => {
  // 구 세이브: gear에 weapon/armor/accessory만 존재
  const u = createUnit('VANGUARD', { level: 10, rank: 2 });
  const legacyWeapon = createGear('IRON_SWORD', { rarity: 'R', rng: Math.random });
  const raw = JSON.stringify({
    v: SAVE_VERSION, ts: Date.now(),
    state: {
      units: [{ ...u, gear: { weapon: legacyWeapon, armor: null, accessory: null } }],
      party: [u.uid],
    },
  });
  const loaded = deserialize(raw);
  const gu = loaded.units[0];
  // 신규 슬롯이 backfill 되고 기존 장착품은 보존
  for (const slot of GEAR_SLOTS) assert.ok(slot in gu.gear, `${slot} backfill`);
  assert.equal(gu.gear.weapon.blueprint, 'IRON_SWORD', '기존 무기 보존');
  assert.equal(gu.gear.helmet, null, '신규 슬롯 null');
});
