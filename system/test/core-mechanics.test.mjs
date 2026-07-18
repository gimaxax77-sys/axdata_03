import { test } from 'node:test';
import assert from 'node:assert/strict';
import { affinity, affinityLabel } from '../core/elements.mjs';
import { createUnit } from '../core/units.mjs';
import { createGameState, getPartyUnits } from '../core/gameState.mjs';
import { earn } from '../core/economy.mjs';
import { collectUnitModifiers } from '../core/modifiers.mjs';
import { equipSkill, enhanceNode } from '../core/character.mjs';
import { craftGear, equipGear } from '../core/gear.mjs';
import { intimacyLevel, intimacyBonus, giveGift, giftCost, INTIMACY_MAX } from '../core/intimacy.mjs';
import { FEATURES } from '../core/features.mjs';
import { idleGenre } from '../genres/idle.mjs';

test('elements: 상성 순환(가위바위보) + 빛↔어둠', () => {
  FEATURES.elements = true; // 상성 검증 → 속성 명시적으로 켬
  try {
    assert.equal(affinity('FIRE', 'WOOD'), 1.3, 'FIRE>WOOD 유리');
    assert.equal(affinity('WOOD', 'FIRE'), 0.8, '역은 불리');
    assert.equal(affinity('WATER', 'FIRE'), 1.3, 'WATER>FIRE');
    assert.equal(affinity('LIGHT', 'DARK'), 1.3);
    assert.equal(affinity('DARK', 'LIGHT'), 1.3, '빛·어둠 상호 유리');
    assert.equal(affinity('FIRE', 'LIGHT'), 1, '무관');
    assert.equal(affinity(null, 'FIRE'), 1, '속성 없으면 무관');
    assert.equal(affinityLabel('FIRE', 'WOOD'), '유리');
    assert.equal(affinityLabel('WOOD', 'FIRE'), '불리');
    assert.equal(affinityLabel('FIRE', 'DARK'), '무관');
  } finally {
    FEATURES.elements = false; // 기본값(off) 복구
  }
});

test('modifiers: 스킬·각인·장비가 합산된다', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { currency: 1e6, growth: 1e6 });
  const u = createUnit('STRIKER', { level: 10, rank: 2 });
  s.units.push(u);
  const base = collectUnitModifiers(u);
  assert.deepEqual(Object.keys(base.statPct).sort(), ['atk', 'def', 'hp', 'spd']);
  equipSkill(s, u.uid, 0, 'BERSERK'); // atk +30%
  const afterSkill = collectUnitModifiers(u);
  assert.ok(afterSkill.statPct.atk >= 0.3, '스킬 statPct 반영');
  enhanceNode(s, u.uid, 'atk'); // 각인 atk
  assert.ok(collectUnitModifiers(u).statPct.atk > afterSkill.statPct.atk, '각인 추가 합산');
  const c = craftGear(s, 'IRON_SWORD'); equipGear(s, u.uid, c.item.uid); // atk flat +120
  assert.ok(collectUnitModifiers(u).statFlat.atk >= 120, '장비 flat 반영');
});

test('intimacy: 선물로 상승, 보너스 스케일, 상한', () => {
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { currency: 1e9 });
  const u = createUnit('SUPPORT', { level: 5, rank: 1 });
  s.units.push(u);
  assert.equal(intimacyLevel(u), 0);
  assert.equal(intimacyBonus(u), 0);
  const r = giveGift(s, u.uid);
  assert.equal(r.ok, true);
  assert.ok(u.intimacy > 0, '친밀도 포인트 상승');
  assert.ok(giftCost(u).currency > 0);
  // 최대까지 선물
  let guard = 0;
  while (intimacyLevel(u) < INTIMACY_MAX && guard++ < 999) { if (!giveGift(s, u.uid).ok) break; }
  assert.equal(intimacyLevel(u), INTIMACY_MAX);
  assert.ok(intimacyBonus(u) > 0, 'MAX에서 보너스 존재');
  assert.equal(giveGift(s, u.uid).ok, false, 'MAX 초과 차단');
});

test('idle: 틱 누적 + 강하면 자동 전진', () => {
  const units = [createUnit('STRIKER', { level: 30, rank: 3 }), createUnit('VANGUARD', { level: 30, rank: 3 })];
  const s = createGameState({ units, party: units.map((u) => u.uid) });
  const t = idleGenre.tick(s, 3600);
  assert.ok(t.gained.currency > 0 && t.clears > 0, '보상 누적');
  assert.ok(s.stage >= 1);
  assert.equal(typeof s.lastTick, 'number');
});

test('idle: 환생은 sqrt(maxStage) 획득·회차 리셋·peakStage 유지', () => {
  const u = createUnit('STRIKER', { level: 20, rank: 2 });
  const s = createGameState({ units: [u], party: [u.uid] });
  s.maxStage = 25; s.stage = 25; s.peakStage = 25;
  const r = idleGenre.prestige(s);
  assert.equal(r.prestigeGained, 5, 'floor(sqrt(25))=5');
  assert.equal(s.stage, 1, '회차 리셋');
  assert.equal(s.maxStage, 1);
  assert.equal(s.peakStage, 25, '역대 최고는 유지');
  assert.equal(s.prestige, 5);
});

test('강화가 실제 수치에 반영: 스킬 레벨·장비 강화 스케일', async () => {
  const { skillPower } = await import('../core/skills.mjs');
  const { createGear, gearContribution } = await import('../core/gear.mjs');
  // 스킬 레벨 배수는 레벨마다 증가
  assert.equal(skillPower(1), 1);
  assert.ok(skillPower(2) > skillPower(1));
  assert.ok(skillPower(10) > skillPower(5));
  // 장비 강화는 flat 기여를 키운다
  const gr = createGear('IRON_SWORD'); // level 1
  const base = gearContribution(gr).flat.atk;
  gr.level = 5;
  assert.ok(gearContribution(gr).flat.atk > base, '강화 레벨↑ → flat↑');
  // 장착 스킬 레벨업이 모디파이어를 키운다
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { currency: 1e9, growth: 1e9 });
  const u = createUnit('STRIKER', { level: 10, rank: 2 });
  s.units.push(u);
  equipSkill(s, u.uid, 0, 'BERSERK');
  const atk1 = collectUnitModifiers(u).statPct.atk;
  u.skills[0].level = 3;
  assert.ok(collectUnitModifiers(u).statPct.atk > atk1, '스킬 레벨↑ → statPct↑');
});

// 회귀 가드: "카엘 버그" — HP 과대 가중으로 SR 탱커가 SSR 딜러보다
// 표시 전투력이 높아지던 문제. powerWeights.hp를 만지면 조용히 재발할 수 있어
// 정렬 불변식(등급이 지배 + 딜러가 동급 투자 탱커에 안 밀림)을 명시적으로 잠근다.
test('전투력 정렬 불변식: SSR 딜러 > 동급 투자 SR 탱커', async () => {
  const { computePower } = await import('../core/stats.mjs');
  FEATURES.rarity = true; // 등급 지배 불변식 검증 → 등급 켬
  try {
    const opt = { level: 200, rank: 5 };
    const dealer = createUnit('STRIKER', opt); dealer.rarity = 'SSR'; // 카엘류 SSR 딜러
    const tank = createUnit('VANGUARD', opt); tank.rarity = 'SR';     // SR 탱커
    assert.ok(
      computePower(dealer) > computePower(tank),
      `SSR 딜러(${computePower(dealer)}) 표시 전투력이 SR 탱커(${computePower(tank)})보다 높아야 함`,
    );
    // 같은 원형이라도 등급이 지배: SSR > SR (동일 레벨·랭크)
    const srDealer = createUnit('STRIKER', opt); srDealer.rarity = 'SR';
    assert.ok(computePower(dealer) > computePower(srDealer), '동일 원형 SSR > SR');
    // HP가 큰 탱커라도 등급이 낮으면 SSR 딜러를 못 넘는다(HP 과대가중 재발 감지).
    const srTankMax = createUnit('VANGUARD', { level: 200, rank: 5 }); srTankMax.rarity = 'SR';
    assert.ok(computePower(dealer) > computePower(srTankMax), 'SSR 딜러 > 만렙 SR 탱커');
  } finally {
    FEATURES.rarity = false; // 기본값(off) 복구
  }
});

test('받는 피해 감소(dmgReduce): 생존 여유↑', async () => {
  const { resolve } = await import('../core/resolution.mjs');
  const { equipSkill } = await import('../core/character.mjs');
  const base = createUnit('VANGUARD', { level: 50, rank: 3 }); base.rarity = 'SR';
  const s = createGameState({ units: [base], party: [base.uid] });
  earn(s.wallet, { growth: 1e6 });
  const challenge = { hp: 40000, atk: 1200, def: 150, element: null };
  const before = resolve([base], challenge).margin;
  equipSkill(s, base.uid, 0, 'GUARDING'); // dmgReduce +18%
  const after = resolve([base], challenge).margin;
  assert.ok(after > before, '피해감소가 생존 여유(margin)↑');
});

test('팀버프 def/crit: 파티 판정에 실제 반영', async () => {
  const { resolve } = await import('../core/resolution.mjs');
  const { getPartyUnits: gpu } = await import('../core/gameState.mjs');
  const mk = (sig) => {
    const u = createUnit('SUPPORT', { level: 40, rank: 3, signature: sig });
    u.rarity = 'SR'; return u;
  };
  const dealer = () => { const u = createUnit('STRIKER', { level: 40, rank: 3 }); u.rarity = 'SR'; return u; };
  const challenge = { hp: 60000, atk: 900, def: 200, element: null };
  // 팀 치명 버프(빛의 신탁) → dps↑ → 적 처치 빨라짐(margin↑)
  const critParty = [dealer(), mk('SIG_LIGHT_ORACLE')];
  const noneParty = [dealer(), createUnit('SUPPORT', { level: 40, rank: 3 })];
  noneParty[1].rarity = 'SR';
  const rc = resolve(critParty, challenge);
  const rn = resolve(noneParty, challenge);
  assert.ok(rc.partyPower > rn.partyPower, '팀 치명 버프가 파티 파워↑');
  // 팀 방어 버프(조수 성가) → 파티 생존↑(margin↑)
  const defParty = [dealer(), mk('SIG_TIDE_HYMN')];
  const rd = resolve(defParty, challenge);
  assert.ok(rd.margin > rn.margin, '팀 방어 버프가 생존 여유↑');
});

test('장비 등급+부옵션: 배수·부옵션이 기여에 반영, 재련', async () => {
  const { createGear, gearContribution, dropGear, GEAR_RARITY, rerollGearSubs } = await import('../core/gear.mjs');
  const { makeRng } = await import('../core/rng.mjs');
  const rng = makeRng(42);
  // 레거시(등급 없음) = 배수 1.0
  const legacy = createGear('IRON_SWORD');
  const base = gearContribution(legacy).flat.atk;
  // SSR = 더 큰 flat + 부옵션 3개
  const ssr = createGear('IRON_SWORD', { rarity: 'SSR', rng });
  const cSSR = gearContribution(ssr);
  assert.ok(cSSR.flat.atk > base, 'SSR 배수 > 레거시');
  assert.equal(ssr.subs.length, GEAR_RARITY.SSR.subs, 'SSR 부옵션 개수');
  // 부옵션이 statPct 또는 effect로 흘러감
  const hasSub = Object.keys(cSSR.statPct).length + Object.keys(cSSR.effect).length > 0;
  assert.ok(hasSub, '부옵션 기여 존재');
  // 드롭 → 인벤토리
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { gem: 100 });
  const before = s.inventory.length;
  const d = dropGear(s, rng, 0.5);
  assert.equal(s.inventory.length, before + 1);
  assert.ok(GEAR_RARITY[d.rarity], '유효 등급 드롭');
  // 재련 (다이아 소모)
  const rr = rerollGearSubs(s, d.item.uid, rng);
  if (d.item.rarity !== 'N') assert.equal(rr.ok, true, '부옵션 재련');
});

test('룬 부옵션+신등급: SSR/UR·부옵션 기여·드롭', async () => {
  const { dropRune, runeMainContribution, RUNE_RARITY, rollRuneSubs } = await import('../core/runes.mjs');
  const { makeRng } = await import('../core/rng.mjs');
  const rng = makeRng(7);
  assert.ok(RUNE_RARITY.SSR && RUNE_RARITY.UR, 'SSR/UR 룬 등급');
  const subs = rollRuneSubs('UR', rng);
  assert.equal(subs.length, RUNE_RARITY.UR.subs);
  const s = createGameState({ units: [], party: [] });
  const d = dropRune(s, rng, 1);
  assert.equal(s.runeBag.length, 1);
  // 부옵션이 기여에 포함
  const contrib = runeMainContribution([d.rune]);
  const keys = Object.keys(contrib.statPct).length + Object.keys(contrib.effect).length;
  assert.ok(keys >= 1, '메인+부옵션 기여');
});

test('장비 세트: 2/3피스 보너스가 모디파이어에 합산', async () => {
  const { gearSetBonus, createGear, GEAR_CATALOG } = await import('../core/gear.mjs');
  const u = createUnit('STRIKER', { level: 10, rank: 2 });
  u.gear = { weapon: createGear('DRAGON_FANG'), armor: null, accessory: null };
  assert.equal(gearSetBonus(u).statPct.atk || 0, 0, '1피스는 미발동');
  u.gear.armor = createGear('BULWARK_PLATE');
  assert.ok(gearSetBonus(u).statPct.atk >= 0.08, '2피스 보너스');
  u.gear.accessory = createGear('OMNI_CHARM');
  const full = gearSetBonus(u);
  assert.ok(full.statPct.atk >= 0.15 && full.effect.critChance >= 0.1, '3피스 풀세트');
});

test('추천 빌드: 빈 스킬 슬롯 채움·더 나은 장비 교체(비파괴)', async () => {
  const { optimizeLoadout } = await import('../core/loadout.mjs');
  const { skillSlots } = await import('../core/skills.mjs');
  const { computePower } = await import('../core/stats.mjs');
  const s = createGameState({ units: [], party: [] });
  earn(s.wallet, { currency: 1e6 });
  const u = createUnit('STRIKER', { level: 20, rank: 2 }); // 슬롯 3개
  s.units.push(u);
  // 슬롯 0에 기존 스킬을 두고 레벨업 → 추천이 이를 보존해야 함
  equipSkill(s, u.uid, 0, 'FORTRESS');
  u.skills[0].level = 4;
  // 인벤토리에 두 무기 → 전투력(효과 포함)이 더 높은 쪽을 장착해야 함
  const a = craftGear(s, 'RUNE_BLADE').item; // atk 90 + 치명 8%
  const b = craftGear(s, 'IRON_SWORD').item; // atk 120
  // 각 무기 장착 시 실제 전투력으로 기대 승자를 계산(부옵션 롤·효과 반영).
  const powerWith = (item) => { const prev = u.gear.weapon; u.gear.weapon = item; const p = computePower(u); u.gear.weapon = prev; return p; };
  const best = powerWith(b) >= powerWith(a) ? b : a;
  const r = optimizeLoadout(s, u.uid);
  assert.equal(r.ok, true);
  // 슬롯0 보존(레벨 유지)
  assert.equal(u.skills[0].id, 'FORTRESS');
  assert.equal(u.skills[0].level, 4, '기존 스킬 레벨 보존');
  // 나머지 슬롯이 채워짐
  assert.equal(u.skills.filter(Boolean).length, skillSlots(u));
  // 전투력 최대 무기 장착(치명 효과가 원시 공격력을 앞설 수 있음)
  assert.equal(u.gear.weapon.uid, best.uid, '전투력 최대 무기 선택');
  assert.ok(r.changed.skills >= 1 && r.changed.gear >= 1);
});

test('gameState: getPartyUnits는 유효 uid만 반환', () => {
  const u = createUnit('STRIKER', { level: 1, rank: 1 });
  const s = createGameState({ units: [u], party: [u.uid, 'ghost'] });
  assert.equal(getPartyUnits(s).length, 1);
});
