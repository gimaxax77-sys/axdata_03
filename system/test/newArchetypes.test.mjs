import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isOn } from '../core/features.mjs';
import { createUnit } from '../core/units.mjs';
import { getArchetype, ARCHETYPES } from '../core/archetypes.mjs';
import { createGameState } from '../core/gameState.mjs';
import { computePower } from '../core/stats.mjs';
import { teamSynergy } from '../core/synergy.mjs';
import { autoFormation, unitRole, formationSummary } from '../core/formation.mjs';
import { canOwnSigWeapon, unlockSigWeapon, sigWeaponContribution } from '../core/sigweapon.mjs';
import { earn } from '../core/economy.mjs';
import { optimizeLoadout } from '../core/loadout.mjs';
import { CONCEPTS } from '../concepts/index.mjs';

test('신규 원형: ROGUE/ARCHER/MAGE가 정의되어 있고 유닛 생성 가능', () => {
  for (const id of ['ROGUE', 'ARCHER', 'MAGE']) {
    const a = getArchetype(id);
    assert.equal(a.id, id);
    assert.ok(a.base.hp > 0 && a.base.atk > 0);
    const u = createUnit(id, { level: 10, rank: 1 });
    assert.equal(u.archetype, id);
    assert.ok(computePower(u) > 0);
  }
});

test('신규 원형: MAGE는 공격 최고·생존 최저(글래스캐논)', () => {
  const mage = ARCHETYPES.MAGE.base;
  const vanguard = ARCHETYPES.VANGUARD.base;
  const allBase = Object.values(ARCHETYPES).map((a) => a.base);
  assert.ok(mage.atk >= Math.max(...allBase.map((b) => b.atk)), 'MAGE 공격 최고');
  assert.ok(mage.hp <= Math.min(...allBase.map((b) => b.hp)), 'MAGE 체력 최저');
  assert.ok(vanguard.def > mage.def, 'VANGUARD가 MAGE보다 방어 높음');
});

test('시너지: 딜러 계열 중 하나만 있어도 삼위일체 성립(STRIKER 없이 ROGUE로 대체)', () => {
  const tank = createUnit('VANGUARD', { level: 20, rank: 2 });
  const rogue = createUnit('ROGUE', { level: 20, rank: 2 }); // STRIKER 대신
  const support = createUnit('SUPPORT', { level: 20, rank: 2 });
  const syn = teamSynergy([tank, rogue, support]);
  assert.ok(syn.list.some((s) => s.id === 'trinity'), 'ROGUE도 공격 카테고리로 인정');
});

test('시너지: 도적/궁수/법사 3+ 집중 시 각각 고유 진형 발동', () => {
  const rogues = Array.from({ length: 3 }, () => createUnit('ROGUE', { level: 20, rank: 2 }));
  const archers = Array.from({ length: 3 }, () => createUnit('ARCHER', { level: 20, rank: 2 }));
  const mages = Array.from({ length: 3 }, () => createUnit('MAGE', { level: 20, rank: 2 }));
  assert.ok(teamSynergy(rogues).list.some((s) => s.id === 'rogue_focus'));
  assert.ok(teamSynergy(archers).list.some((s) => s.id === 'archer_focus'));
  assert.ok(teamSynergy(mages).list.some((s) => s.id === 'mage_focus'));
});

test('자동배치: 근접 딜러(STRIKER/ROGUE)는 중열, 원거리·지원(MAGE/ARCHER/SUPPORT)은 후열 우선', () => {
  const s = createGameState({ units: [], party: [] });
  // 정원(전열2·중열3·후열2)에 정확히 맞춰 원형별 인원을 구성 —
  // 각 역할이 자기 우선 원형만으로 채워지는지(폴백 개입 없이) 명확히 검증.
  const vanguards = Array.from({ length: 2 }, () => createUnit('VANGUARD', { level: 30, rank: 3 }));
  const rogues = Array.from({ length: 3 }, () => createUnit('ROGUE', { level: 30, rank: 3 }));
  const mages = Array.from({ length: 2 }, () => createUnit('MAGE', { level: 30, rank: 3 }));
  s.units.push(...vanguards, ...rogues, ...mages);
  s.party = s.units.map((u) => u.uid);
  autoFormation(s);
  const sum = formationSummary(s);
  assert.deepEqual(new Set(sum.front), new Set(vanguards.map((u) => u.uid)), '전열 = VANGUARD');
  assert.deepEqual(new Set(sum.mid), new Set(rogues.map((u) => u.uid)), '중열 = ROGUE(근접 딜러)');
  assert.deepEqual(new Set(sum.back), new Set(mages.map((u) => u.uid)), '후열 = MAGE(원거리)');
});

test('전용무기: 신규 원형도 시그니처 보유 시 전용무기 획득/기여 가능', () => {
  const s = createGameState({ units: [], party: [] });
  const u = createUnit('MAGE', { level: 20, rank: 2, signature: 'SIG_CHAOS_NOVA' });
  s.units.push(u); s.party = [u.uid];
  earn(s.wallet, { gem: 1000 });
  assert.equal(canOwnSigWeapon(u), true);
  const r = unlockSigWeapon(s, u.uid);
  assert.equal(r.ok, true);
  const contrib = sigWeaponContribution(u);
  assert.ok(contrib.flat.atk > 0, 'MAGE 전용무기 프로필 적용');
});

test('추천 장착: 신규 원형도 loadout 가중치를 가진다(스킬 추천 정상 동작)', () => {
  const s = createGameState({ units: [], party: [] });
  const u = createUnit('ARCHER', { level: 10, rank: 2 });
  s.units.push(u); s.party = [u.uid];
  earn(s.wallet, { currency: 1e9, growth: 1e9, gem: 1e6 });
  const r = optimizeLoadout(s, u.uid, 'skill');
  assert.equal(r.ok, true);
});

test('컨셉: fantasy·scifi 모두 신규 원형(도적/궁수/법사) 라벨과 캐릭터가 존재한다', () => {
  for (const cid of ['fantasy', 'scifi']) {
    const c = CONCEPTS[cid];
    for (const arch of ['ROGUE', 'ARCHER', 'MAGE']) {
      assert.ok(c.archetypes[arch], `${cid}: ${arch} 라벨 존재`);
      const count = c.roster.filter((ch) => ch.archetype === arch).length;
      assert.ok(count >= 2, `${cid}: ${arch} 캐릭터 2명 이상`);
    }
  }
});

test('컨셉: 6원형 모두 N~UR 전 등급이 최소 1명씩 존재한다(등급 공백 없음)', { skip: !isOn('rarity') && '등급 옵션 off — 커버리지 검증 생략' }, () => {
  const RARITIES = ['N', 'R', 'SR', 'SSR', 'UR'];
  const ARCHS = ['VANGUARD', 'STRIKER', 'SUPPORT', 'ROGUE', 'ARCHER', 'MAGE'];
  for (const cid of ['fantasy', 'scifi']) {
    const c = CONCEPTS[cid];
    if (!c.roster.some((ch) => ch.rarity)) continue; // 등급 안 쓰는 일반 로스터는 커버리지 무관
    for (const arch of ARCHS) {
      for (const r of RARITIES) {
        const has = c.roster.some((ch) => ch.archetype === arch && ch.rarity === r);
        assert.ok(has, `${cid}: ${arch} ${r}등급 캐릭터 존재`);
      }
    }
  }
});
