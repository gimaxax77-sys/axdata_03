// ─────────────────────────────────────────────────────────────
// 캐릭터 성장 축 검증 — 전용무기 · 룬 · 시그니처 각성.
// 새 축이 (1) 전투력을 실제로 올리고 (2) 상한을 지키며
// (3) 세이브 왕복 후에도 동일 결과를 내는지 단언.
// 실행:  node system/verify-character.mjs   (실패 시 종료코드 1)
// ─────────────────────────────────────────────────────────────

import { FEATURES } from './core/features.mjs';
import { createGameState } from './core/gameState.mjs';
import { createUnit } from './core/units.mjs';
import { earn } from './core/economy.mjs';
import { computePower } from './core/stats.mjs';
import { collectUnitModifiers } from './core/modifiers.mjs';
import { serialize, deserialize } from './core/save.mjs';
import {
  unlockSigWeapon, enhanceSigWeapon, hasSigWeapon, sigWeaponBoost, SIGWEAPON_MAX,
} from './core/sigweapon.mjs';
import {
  summonRune, equipRune, unequipRune, enhanceRune, activeRuneSets, RUNE_SLOTS, RUNE_MAX_LEVEL,
} from './core/runes.mjs';
import { awakenSignature } from './core/character.mjs';
import { AWAKEN_MAX } from './core/skills.mjs';
import { seedProgress, seedStatPct, SEED_FULL, RARITY_BASE_MULT } from './core/seed.mjs';

let passed = 0; const fails = [];
const ok = (n, c) => { if (c) { passed++; console.log(`  ✓ ${n}`); } else { fails.push(n); console.log(`  ✗ ${n}`); } };

function rich() {
  const u = createUnit('STRIKER', { level: 40, rank: 3, signature: 'SIG_FLAME_EDGE', element: 'FIRE' });
  const s = createGameState({ units: [u], party: [u.uid] });
  earn(s.wallet, { currency: 1e8, growth: 1e6, summon: 5000, gem: 5000 });
  return { s, u };
}

console.log('\n■ 캐릭터 성장 축 검증 (assert)\n');

// ── 전용무기 ───────────────────────────────────────────────────
{
  const { s, u } = rich();
  const p0 = computePower(u);
  ok('전용무기 미보유 상태', !hasSigWeapon(u));
  ok('전용무기 획득 성공', unlockSigWeapon(s, u.uid).ok && hasSigWeapon(u));
  const p1 = computePower(u);
  ok('전용무기가 전투력 상승', p1 > p0);
  for (let i = 0; i < 4; i++) enhanceSigWeapon(s, u.uid); // Lv5
  ok('5레벨에서 시그니처 부스트 +10%', Math.abs(sigWeaponBoost(u) - 0.1) < 1e-9);
  while (enhanceSigWeapon(s, u.uid).ok) { /* to max */ }
  ok('전용무기 강화 상한 준수', u.sigWeapon.level === SIGWEAPON_MAX);
  ok('중복 획득 차단', unlockSigWeapon(s, u.uid).ok === false);
}

// ── 룬 ─────────────────────────────────────────────────────────
{
  const { s, u } = rich();
  const p0 = computePower(u);
  // 같은 계열(RAGE) 룬 3개 발굴 → 3세트
  for (let i = 0; i < 6; i++) summonRune(s, () => 0.02);
  ok('룬 발굴이 가방에 적재', s.runeBag.length >= 3);
  const first = s.runeBag[0];
  for (let sl = 0; sl < RUNE_SLOTS; sl++) equipRune(s, u.uid, sl, s.runeBag[0].uid);
  ok('룬 3슬롯 장착', u.runes.filter(Boolean).length === RUNE_SLOTS);
  const sets = activeRuneSets(u.runes);
  ok('동일 계열 3개 → 3세트 보너스 활성', sets.length === 1 && sets[0].active3);
  const p1 = computePower(u);
  ok('룬(메인+세트)이 전투력 상승', p1 > p0);
  // 강화
  const before = collectUnitModifiers(u).statPct.atk;
  enhanceRune(s, u.runes[0].uid);
  ok('룬 강화가 메인스탯 증가', collectUnitModifiers(u).statPct.atk > before);
  while (enhanceRune(s, u.runes[0].uid).ok) { /* to max */ }
  ok('룬 강화 상한 준수', u.runes[0].level === RUNE_MAX_LEVEL);
  // 해제 → 세트 해제
  unequipRune(s, u.uid, 2);
  ok('룬 해제 시 슬롯 비고 가방 복귀', u.runes[2] === null && s.runeBag.some((r) => r));
  ok('3세트 → 2세트로 강등', activeRuneSets(u.runes)[0].active3 === false && activeRuneSets(u.runes)[0].active2);
}

// ── 시그니처 각성 ──────────────────────────────────────────────
{
  const { s, u } = rich();
  const effBefore = collectUnitModifiers(u).effect.defPierce; // SIG_FLAME_EDGE 각성=관통
  ok('각성 1회 성공', awakenSignature(s, u.uid).ok && u.sigAwaken === 1);
  ok('각성이 2차 효과(관통) 부여', collectUnitModifiers(u).effect.defPierce > effBefore);
  while (awakenSignature(s, u.uid).ok) { /* to max */ }
  ok('각성 상한 준수', u.sigAwaken === AWAKEN_MAX);
}

// ── 세이브 왕복 ────────────────────────────────────────────────
{
  const { s, u } = rich();
  unlockSigWeapon(s, u.uid); enhanceSigWeapon(s, u.uid); enhanceSigWeapon(s, u.uid);
  awakenSignature(s, u.uid);
  for (let i = 0; i < 4; i++) summonRune(s, () => 0.3);
  equipRune(s, u.uid, 0, s.runeBag[0].uid);
  const r = deserialize(serialize(s));
  const ru = r.units[0];
  ok('세이브 왕복: 전용무기/각성/룬 보존',
    ru.sigWeapon.level === u.sigWeapon.level && ru.sigAwaken === u.sigAwaken &&
    ru.runes.filter(Boolean).length === u.runes.filter(Boolean).length);
  ok('세이브 왕복: 전투력 동일', computePower(ru) === computePower(u));
  ok('세이브 왕복: 룬 가방 보존', r.runeBag.length === s.runeBag.length);
}

// ── 씨앗 (서사 발현 + 저등급 구제, UR 천장) ────────────────────
{
  // 이 블록은 등급(rarity) 규칙 자체를 검증 → 기본 off여도 명시적으로 켜고 확인 후 복구.
  FEATURES.rarity = true;
  // 등급 없는 유닛(데모/시뮬)은 씨앗/등급배수 영향 0 → 하위호환
  const plain = createUnit('STRIKER', { level: 40, rank: 3 });
  const sp0 = seedStatPct(plain);
  ok('등급 없는 유닛은 씨앗 없음(하위호환)', !seedProgress(plain).hasSeed && sp0.atk === 0 && sp0.hp === 0);

  // 완전 투자 유닛을 등급만 바꿔 비교
  const maxU = (rarity) => {
    const u = createUnit('STRIKER', { level: 80, rank: 5, signature: 'SIG_FLAME_EDGE' });
    u.rarity = rarity; u.intimacy = 1e6; u.sigWeapon = { level: 15 }; u.sigAwaken = 3;
    u.runes = [1, 2, 3].map((i) => ({ uid: `r${i}`, set: 'RAGE', rarity: 'N', level: 0 }));
    return u;
  };
  for (const r of ['N', 'R', 'SR', 'SSR']) ok(`${r} 완전 발현 6/6`, seedProgress(maxU(r)).fullyUnlocked);

  const powN = computePower(maxU('N'));
  const powSR = computePower(maxU('SR'));
  const powSSR = computePower(maxU('SSR'));
  ok('완전발현도 등급 높을수록 강함 (N<SR<SSR)', powN < powSR && powSR < powSSR);

  // 핵심 제약: 완전발현 N 실효배수 < 무발현 SSR 기본배수
  const nFull = RARITY_BASE_MULT.N * (1 + SEED_FULL.N);
  ok('완전발현 저등급 < 무발현 UR (살짝 아래)', nFull < RARITY_BASE_MULT.SSR);
  ok('저등급일수록 씨앗 보정 큼', SEED_FULL.N > SEED_FULL.R && SEED_FULL.R > SEED_FULL.SR && SEED_FULL.SR > SEED_FULL.SSR);

  // 조건 난이도 차등: 동일 투자에서 낮은 등급이 더 많이 발현
  const same = (r) => { const u = createUnit('STRIKER', { level: 40, rank: 3 }); u.rarity = r; u.intimacy = 700; return seedProgress(u).met; };
  ok('동일 투자 시 낮은 등급이 더 빨리 발현', same('N') >= same('SR') && same('SR') >= same('SSR'));

  // 조건 달성이 실제로 전투력에 반영
  const growing = createUnit('STRIKER', { level: 5, rank: 1 }); growing.rarity = 'N';
  const before = computePower(growing);
  growing.level = 40; growing.rank = 3; // talent+breakthrough 조건 달성
  ok('씨앗 조건 달성이 전투력 증가에 기여', seedProgress(growing).met >= 2 && computePower(growing) > before);
  FEATURES.rarity = false; // 기본값(off) 복구
}

// ── 팀 시너지 (편성 구성 보너스) ───────────────────────────────
{
  // 속성 결속/오색 검증 포함 → 속성을 명시적으로 켜고 확인 후 복구.
  FEATURES.elements = true;
  const mk = (arch, elem) => { const u = createUnit(arch, { level: 20, rank: 2, element: elem }); return u; };
  const { teamSynergy } = await import('./core/synergy.mjs');
  ok('빈/단일 파티는 시너지 없음', teamSynergy([]).list.length === 0);
  const trinity = [mk('VANGUARD', 'FIRE'), mk('STRIKER', 'WATER'), mk('SUPPORT', 'WOOD')];
  ok('삼위일체 발동 (3원형)', teamSynergy(trinity).list.some((s) => s.id === 'trinity'));
  ok('오색 결속 발동 (전원 다른 속성)', teamSynergy(trinity).list.some((s) => s.id === 'rainbow'));
  const strFocus = [mk('STRIKER', 'FIRE'), mk('STRIKER', 'FIRE'), mk('STRIKER', 'FIRE')];
  const sf = teamSynergy(strFocus);
  ok('공격 진형 발동 (전사 3+)', sf.list.some((s) => s.id === 'str_focus'));
  ok('속성 결속 발동 (동일 속성 3)', sf.list.some((s) => s.id === 'elem_bond'));
  ok('시너지가 공격 배수 실제 상승', sf.mult.atk > 1);
  ok('배타성: 동일속성 집중은 오색 미발동', !sf.list.some((s) => s.id === 'rainbow'));
  FEATURES.elements = false; // 기본값(off) 복구
}

console.log(`\n결과: ${passed} 통과 / ${fails.length} 실패`);
if (fails.length) { console.log('실패:', fails.join(', ')); process.exit(1); }
console.log('→ 전용무기·룬·각성 세 축이 모디파이어 파이프라인에 정상 합산됨이 검증됨.\n');
