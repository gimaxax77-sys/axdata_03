// 기능 플래그(옵션 모듈) 검증 — Phase2: 속성(element) 옵션화
import { test } from 'node:test';
import assert from 'node:assert';
import { FEATURES, isOn, simplePreset } from '../core/features.mjs';
import { affinity } from '../core/elements.mjs';
import { teamSynergy } from '../core/synergy.mjs';
import { rarityBaseMult } from '../core/seed.mjs';
import { createUnit } from '../core/units.mjs';
import { computePower } from '../core/stats.mjs';

test('기본 프리셋 값(등급·속성 모두 off)', () => {
  assert.equal(isOn('elements'), false); // 게임 기본: 속성 미적용
  assert.equal(isOn('rarity'), false); // 게임 기본: 등급 미적용
  assert.equal(simplePreset().elements, false);
});

test('속성 on: 상성이 적용된다(FIRE>WOOD 유리)', () => {
  FEATURES.elements = true;
  try {
    assert.ok(affinity('FIRE', 'WOOD') > 1);
    assert.ok(affinity('WOOD', 'FIRE') < 1);
  } finally {
    FEATURES.elements = false; // 기본값(off) 복구
  }
});

test('속성 off: 상성 무관(항상 1, 스탯 전용)', () => {
  FEATURES.elements = false; // 기본값과 동일
  assert.equal(affinity('FIRE', 'WOOD'), 1);
  assert.equal(affinity('LIGHT', 'DARK'), 1);
  // 동일 속성 3인 파티 — off면 속성 결속이 안 붙는다
  const units = [{ archetype: 'STRIKER', element: 'FIRE' }, { archetype: 'MAGE', element: 'FIRE' }, { archetype: 'SUPPORT', element: 'FIRE' }];
  const syn = teamSynergy(units);
  assert.ok(!syn.list.some((s) => s.id === 'elem_bond'), '속성 off면 속성 결속 없음');
});

test('등급 on: 전투력 등급 배수 적용', () => {
  FEATURES.rarity = true;
  try {
    assert.ok(rarityBaseMult({ rarity: 'UR' }) > rarityBaseMult({ rarity: 'N' }));
  } finally {
    FEATURES.rarity = false; // 기본값(off)으로 복구
  }
});

test('등급 off: 전투력 등급 무관(항상 1, 스탯 전용)', () => {
  FEATURES.rarity = false; // 기본값과 동일
  assert.equal(rarityBaseMult({ rarity: 'UR' }), 1.0);
  assert.equal(rarityBaseMult({ rarity: 'N' }), 1.0);
});

test('단순 모드: 등급·속성 없는 유닛도 전투력·시너지 정상(크래시 없음)', () => {
  const prev = { ...FEATURES };
  Object.assign(FEATURES, simplePreset()); // 선택 모듈 전부 off
  try {
    // 원형만 있는 유닛(등급·속성 없음) — createUnit(archetype, opts)
    const u = createUnit('VANGUARD', { level: 10, characterId: 'knight' });
    const p = computePower(u);
    assert.ok(Number.isFinite(p) && p > 0, `전투력 유한·양수 (=${p})`);
    const syn = teamSynergy([u]);
    assert.ok(syn && syn.mult && Number.isFinite(syn.mult.atk), '시너지 계산됨');
    assert.ok(!syn.list.some((s) => s.id === 'elem_bond' || s.id === 'rainbow'), '속성 시너지 없음');
  } finally {
    Object.assign(FEATURES, prev); // 복구
  }
});

test('코어 정의: 이름+원형만 있는 임의 형태 캐릭터도 로스터 유효', async () => {
  const { ARCHETYPES } = await import('../core/archetypes.mjs');
  // 등급·속성·시그니처·코스튬·대사 전혀 없는 캐릭터(로봇/몬스터/타장르 등 어떤 형태든)
  const generic = { id: 'x_robot', name: '로봇병기', archetype: 'STRIKER' };
  assert.ok(ARCHETYPES[generic.archetype], '원형만 있으면 유효');
  const u = createUnit(generic.archetype, { characterId: generic.id, level: 5 });
  assert.ok(computePower(u) > 0, '전투력 계산됨(속성·등급 없이도)');
});
