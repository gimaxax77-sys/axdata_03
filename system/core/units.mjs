import { getArchetype } from './archetypes.mjs';
import { computeStats } from './stats.mjs';
import { collectUnitModifiers } from './modifiers.mjs';
import { createEnhance } from './enhance.mjs';
import { emptyGearSet } from './gear.mjs';
import { BALANCE } from './balance.mjs';

// ─────────────────────────────────────────────────────────────
// 유닛 인스턴스 — 시스템이 다루는 최소 단위.
// archetype(역할) + 성장 상태(level/rank/skills/enhance).
// "이름/외형"은 저장하지 않는다 → 그건 컨셉 레이어의 몫.
// ─────────────────────────────────────────────────────────────

let _seq = 0;
// 세이브 로드 후, 기존 uid와 충돌하지 않게 시퀀스를 끌어올린다.
export function ensureUnitSeq(n) { if (n > _seq) _seq = n; }

export function createUnit(archetype, { level = 1, rank = 1, characterId = null, signature = null, element = null } = {}) {
  getArchetype(archetype); // 검증
  return {
    uid: `u${++_seq}`,
    archetype,
    characterId, // 정체성(Concept 도감이 이름/성격을 매핑). Core는 ID만 앎.
    signature, // 전용 스킬 id (항상 발동). null 가능.
    element, // 속성 ID (FIRE/WATER/…). null 가능.
    intimacy: 0, // 친밀도 포인트 (선물로 상승)
    costume: null, // (레거시) 컨셉 코스튬 id. null = 기본
    costumeBonus: {}, // (레거시) 컨셉 코스튬 statPct
    skin: null, // 장착 코스튬(스킨) id — 순수 외형(core costumes.mjs). null = 기본
    sigWeapon: { level: 0 }, // 전용무기 (0 = 미획득)
    sigAwaken: 0, // 시그니처 각성 레벨
    runes: [null, null, null], // 룬 슬롯 (각 원소는 null 또는 룬 인스턴스)
    level,
    rank,
    star: 1, // 성급(동일 영웅 중복 합성으로 상승) — 스탯 곱연산 축
    // 스킬 슬롯: 각 원소는 null 또는 { id, level }
    skills: [null, null, null],
    // 강화(각인) 노드 레벨
    enhance: createEnhance(),
    // 장비 슬롯: 각 원소는 null 또는 장비 인스턴스 (전 슬롯 — gear.mjs 단일 소스)
    gear: emptyGearSet(),
  };
}

// 레벨업 비용(성장 재화). 레벨이 오를수록 비용 증가.
export function levelUpCost(unit) {
  return {
    growth: Math.round(
      BALANCE.levelCostBase * Math.pow(BALANCE.levelCostGrowth, unit.level - 1)
    ),
  };
}

// 레벨 상한 = 랭크 × 20. 돌파(랭크업) 없이는 못 넘는다.
export function levelCap(unit) {
  return unit.rank * 20;
}

// 한 유닛을 팀 판정에 쓸 "전투 프로필"로 변환.
// 스킬 효과(치명타/흡혈/관통)와 팀 버프를 함께 실어 보낸다.
export function toCombatProfile(unit) {
  const s = computeStats(unit);
  const mods = collectUnitModifiers(unit);
  // dps = 공격력 * (1 + 속도/200)  → 속도가 공격 빈도에 기여
  let dps = s.atk * (1 + s.spd / 200);
  // 치명타: 기대 피해 배수 = 1 + 확률 × 치명피해
  dps *= 1 + mods.effect.critChance * mods.effect.critDamage;
  return {
    uid: unit.uid,
    hp: s.hp,
    dps,
    def: s.def,
    element: unit.element, // 속성 상성 계산용
    effect: mods.effect, // lifesteal / defPierce 등
    teamBuffAtk: mods.teamBuff.atk,
    teamBuffDef: mods.teamBuff.def, // 팀 피해경감
    teamBuffCrit: mods.teamBuff.critChance, // 팀 치명(=dps 배수)
  };
}
