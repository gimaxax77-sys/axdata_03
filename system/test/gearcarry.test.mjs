import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { earn } from '../core/economy.mjs';
import { craftGear, equipGear } from '../core/gear.mjs';
import { setFormation, unitRole } from '../core/formation.mjs';
import { inheritGear, swapPartyMember } from '../core/gearcarry.mjs';

function seed() {
  const a = createUnit('STRIKER', { level: 30, rank: 4 });
  const b = createUnit('VANGUARD', { level: 30, rank: 4 });
  const c = createUnit('SUPPORT', { level: 30, rank: 4 });
  const s = createGameState({ units: [a, b, c], party: [a.uid, b.uid] });
  earn(s.wallet, { currency: 1e7 });
  return { s, a, b, c };
}

test('전승: 장비가 새 유닛으로 이전(원 유닛은 비워짐)', () => {
  const { s, a, c } = seed();
  const g = craftGear(s, 'RUNE_BLADE');
  equipGear(s, a.uid, g.item.uid);
  const r = inheritGear(s, a.uid, c.uid);
  assert.ok(r.ok);
  assert.equal(r.moved, 1);
  assert.equal(s.units.find((u) => u.uid === a.uid).gear.weapon, null, '원 유닛 슬롯 비움');
  assert.equal(s.units.find((u) => u.uid === c.uid).gear.weapon.uid, g.item.uid, '새 유닛 장착');
});

test('전승: 들어오는 유닛의 기존 장비는 인벤토리 회수', () => {
  const { s, a, c } = seed();
  const g1 = craftGear(s, 'RUNE_BLADE'); equipGear(s, a.uid, g1.item.uid);
  const g2 = craftGear(s, 'RUNE_BLADE'); equipGear(s, c.uid, g2.item.uid);
  const invBefore = s.inventory.length;
  inheritGear(s, a.uid, c.uid);
  assert.equal(s.units.find((u) => u.uid === c.uid).gear.weapon.uid, g1.item.uid, 'a의 무기로 교체');
  assert.ok(s.inventory.some((x) => x.uid === g2.item.uid), 'c의 기존 무기 회수');
  assert.equal(s.inventory.length, invBefore + 1);
});

test('전승: 파티 자리 교체가 진형+장비 승계', () => {
  const { s, b, c } = seed();
  setFormation(s, b.uid, 'back'); // b는 후열
  const g = craftGear(s, 'PLATE_ARMOR'); equipGear(s, b.uid, g.item.uid);
  const r = swapPartyMember(s, b.uid, c.uid);
  assert.ok(r.ok);
  assert.ok(s.party.includes(c.uid) && !s.party.includes(b.uid), '자리 교체됨');
  assert.equal(unitRole(s, c.uid), 'back', '후열 역할 승계');
  assert.equal(s.units.find((u) => u.uid === c.uid).gear.armor.uid, g.item.uid, '장비 승계');
  assert.equal(s.formation[b.uid], undefined, '이전 유닛 진형 참조 정리');
});

test('전승: 잘못된 교체 방어', () => {
  const { s, a, b } = seed();
  assert.equal(swapPartyMember(s, a.uid, b.uid).ok, false, 'in이 이미 편성됨');
  assert.equal(swapPartyMember(s, 'ghost', a.uid).ok, false, 'out 미편성');
});
