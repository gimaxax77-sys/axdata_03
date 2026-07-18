import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, getPartyUnits } from '../core/gameState.mjs';
import { createUnit, toCombatProfile } from '../core/units.mjs';
import { resolve } from '../core/resolution.mjs';
import { createGear, equipGear } from '../core/gear.mjs';
import { playStage } from '../core/difficulty.mjs';

// 유닛 하나를 만들어 특정 장비를 장착.
function unitWith(bp) {
  const s = createGameState({ units: [], party: [] });
  const u = createUnit('STRIKER', { level: 40, rank: 3 }); u.rarity = 'SSR';
  s.units.push(u); s.party = [u.uid];
  if (bp) { const it = createGear(bp, { rarity: 'SR', rng: () => 0.5 }); s.inventory.push(it); equipGear(s, u.uid, it.uid); }
  return { s, u };
}
// 특정 효과만 격리 주입: 중립 장비(IRON_HELM, 부옵션 없음)에 subs로 효과를 심는다.
// base/effect 모두 같은 flat을 쓰므로 효과 차이만 순수 비교된다.
function partyWithEffect(effect) {
  const s = createGameState({ units: [], party: [] });
  const u = createUnit('STRIKER', { level: 40, rank: 3 }); u.rarity = 'SSR';
  s.units.push(u); s.party = [u.uid];
  const it = createGear('IRON_HELM', { rarity: 'N', rng: () => 0 }); // 효과 없는 중립 장비
  it.subs = Object.entries(effect).map(([key, value]) => ({ key, kind: 'effect', value }));
  s.inventory.push(it); equipGear(s, u.uid, it.uid);
  return getPartyUnits(s);
}

const CH = { hp: 50000, atk: 3000, def: 200, element: null };

test('절대공격(trueDamage): 고방어 적 상대 딜 상승', () => {
  const hardCh = { ...CH, def: 2000 }; // 고방어
  const base = resolve(partyWithEffect({}), hardCh, {});
  const tru = resolve(partyWithEffect({ trueDamage: 0.5 }), hardCh, {});
  assert.ok(tru.margin > base.margin, '절대공격이 유효딜↑ → 여유↑');
});

test('절대방어(absDef): 받는 피해 감소 → 생존↑ (상한 우회)', () => {
  const base = resolve(partyWithEffect({ dmgReduce: 0.6 }), CH, {}); // 피해감소 상한
  const abs = resolve(partyWithEffect({ dmgReduce: 0.6, absDef: 0.5 }), CH, {});
  assert.ok(abs.margin > base.margin, '절대방어가 상한을 넘어 추가 경감');
});

test('회피(evasion): 적 명중 없으면 그대로, 있으면 상쇄', () => {
  const noAcc = { ...CH };
  const withAcc = { ...CH, acc: 0.3 };
  const ev0 = resolve(partyWithEffect({}), withAcc, {});
  const ev1 = resolve(partyWithEffect({ evasion: 0.5 }), withAcc, {});
  assert.ok(ev1.margin > ev0.margin, '회피가 적 피해를 줄여 생존↑');
  // 회피는 적 명중(acc)에 상쇄됨: evasion 0.2 vs acc 0.3 → 유효회피 0
  const capped = resolve(partyWithEffect({ evasion: 0.2 }), withAcc, {});
  assert.equal(capped.margin, ev0.margin, '적 명중이 회피를 완전 상쇄');
});

test('명중(accuracy): 적 회피를 상쇄해 딜 회복', () => {
  const evasiveCh = { ...CH, eva: 0.4 }; // 적 회피
  const noAcc = resolve(partyWithEffect({}), evasiveCh, {});
  const acc = resolve(partyWithEffect({ accuracy: 0.4 }), evasiveCh, {});
  assert.ok(acc.margin > noAcc.margin, '명중이 적 회피를 상쇄 → 딜 회복');
});

test('난이도: 상위 난이도에 적 회피/명중 부여', () => {
  const s = createGameState({ units: [], party: [] }); s.peakStage = 150;
  s.difficulty = 'normal';
  assert.equal(playStage(s, 10).challenge.eva, 0);
  s.difficulty = 'abyss';
  const ab = playStage(s, 10).challenge;
  assert.ok(ab.eva > 0 && ab.acc > 0, '나락은 회피·명중 보유');
});

test('신규 능력치: 장비로 획득 → 프로필 반영', () => {
  const { u } = unitWith('SHADE_CLOAK'); // evasion 0.10
  const p = toCombatProfile(u);
  assert.ok(p.effect.evasion >= 0.10, '그림자망토 회피 반영');
  const { u: u2 } = unitWith('VOID_EDGE'); // trueDamage 0.12
  assert.ok(toCombatProfile(u2).effect.trueDamage >= 0.12, '공허검 절대공격 반영');
});
