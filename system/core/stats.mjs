import { getArchetype } from './archetypes.mjs';
import { collectUnitModifiers } from './modifiers.mjs';
import { BALANCE } from './balance.mjs';
import { rarityBaseMult } from './seed.mjs';
import { starMult } from './starGrade.mjs';

// ─────────────────────────────────────────────────────────────
// 스탯 성장 공식 — 장르/컨셉 무관.
// 계산 순서:
//   1) 기본스탯 × 레벨배수 × 랭크배수   (원형 성장)
//   2) × (1 + 강화·스킬의 statPct)       (방향성 성장)
//   3) + 장비의 statFlat                 (착용 성장)
//
//   레벨: 스탯 +8%/레벨 (곱연산)
//   랭크: 스탯 +25%/랭크 (곱연산)
//   속도(spd): 성장 완만 +1%/레벨
// ─────────────────────────────────────────────────────────────

// 성장 요소를 반영하지 않은 "원형 성장"만 계산.
function baseGrownStats(unit) {
  const { base } = getArchetype(unit.archetype);
  const levelMult = 1 + (unit.level - 1) * BALANCE.statPerLevel;
  const rankMult = 1 + (unit.rank - 1) * BALANCE.statPerRank;
  const growth = levelMult * rankMult;
  const spdMult = 1 + (unit.level - 1) * BALANCE.spdPerLevel;
  // 등급 기본 배수 — 등급이 곧 잠재력의 하한(씨앗이 좁히되 다 못 메움).
  // 등급 없는 유닛(데모/시뮬)은 1.0 → 하위호환.
  const rm = rarityBaseMult(unit);
  // 성급 배수 — 동일 영웅 중복 합성으로 오르는 독립 성장 축(+12%/성급).
  const sm = starMult(unit);
  return {
    hp: base.hp * growth * rm * sm,
    atk: base.atk * growth * rm * sm,
    def: base.def * growth * rm * sm,
    spd: base.spd * spdMult * rm * sm,
  };
}

// 원형 스탯 + 모디파이어 → 최종 스탯 (내부 공용).
function statsFrom(g, mods) {
  return {
    hp: Math.round(g.hp * (1 + mods.statPct.hp) + mods.statFlat.hp),
    atk: Math.round(g.atk * (1 + mods.statPct.atk) + mods.statFlat.atk),
    def: Math.round(g.def * (1 + mods.statPct.def) + mods.statFlat.def),
    spd: Math.round(g.spd * (1 + mods.statPct.spd) + mods.statFlat.spd),
  };
}

// 스킬·강화까지 반영한 최종 스탯.
export function computeStats(unit) {
  return statsFrom(baseGrownStats(unit), collectUnitModifiers(unit));
}

// 스탯·효과별 전투력 기여를 분해해 반환(브리핑·표시·정렬 공용).
//   { stats:{hp,atk,def,spd}, effects:{...}, total }
// 각 항목은 이미 가중치를 곱한 "전투력 점수"다 → 합이 곧 전투력.
export function powerBreakdown(unit) {
  const mods = collectUnitModifiers(unit);
  const s = statsFrom(baseGrownStats(unit), mods);
  const w = BALANCE.powerWeights;
  const stats = { hp: s.hp * w.hp, atk: s.atk * w.atk, def: s.def * w.def, spd: s.spd * w.spd };
  const effects = {};
  const ew = BALANCE.powerEffectWeights || {};
  for (const k of Object.keys(ew)) effects[k] = (mods.effect[k] || 0) * ew[k];
  const total = Object.values(stats).reduce((a, b) => a + b, 0) + Object.values(effects).reduce((a, b) => a + b, 0);
  return { stats, effects, total: Math.round(total), rawStats: s, rawEffects: mods.effect };
}

// 표시용 단일 전투력 지표(밸런싱/정렬용). 판정 자체는 stats로 한다.
export function computePower(unit) {
  return powerBreakdown(unit).total;
}
