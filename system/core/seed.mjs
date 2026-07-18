import { intimacyLevel } from './intimacy.mjs';
import { isOn } from './features.mjs';

// ─────────────────────────────────────────────────────────────
// 씨앗(Seed) — 모든 캐릭터의 "서사 발현" 시스템.
//   · 6가지 조건을 달성할수록 서사가 열리고, 조건마다 일부 능력치가 붙는다.
//   · 저등급일수록 씨앗 보정이 크다(구제 축) — 대신 완전 발현해도
//     동일 강화 상태의 최고등급(UR/SSR)을 "살짝" 못 넘도록 튜닝.
//   · 조건 난이도는 등급별 차등: 낮은 등급일수록 문턱이 낮다.
//
// 설계 수치 검증(동일 강화 상태 실효 배수 = 등급기본배수 × (1+완전씨앗)):
//   N   1.00 × 1.30 = 1.300   ← 완전 발현해도
//   R   1.10 × 1.22 = 1.342
//   SR  1.22 × 1.14 = 1.391
//   SSR 1.36 × 1.08 = 1.469   ← 완전 SSR도 무발현 UR(1.500) 아래에 머문다
//   UR  1.50 × 1.05 = 1.575   ← 최고 티어(새 천장). 하한(1.500)조차 완전SSR 위.
//
// 씨앗은 별도 세이브 필드가 없다. 오직 유닛의 투자 상태(레벨/랭크/친밀도/
// 전용무기/각성/룬)의 "투영"이라, 성장하면 저절로 발현한다.
// ─────────────────────────────────────────────────────────────

// 등급 → 티어 인덱스 (조건 문턱/보정 계산용). 등급 없으면 -1(씨앗 없음).
const TIER = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };

// 등급 기본 스탯 배수 (등급이 곧 잠재력의 하한). 등급 없으면 1.0(하위호환).
export const RARITY_BASE_MULT = { N: 1.0, R: 1.10, SR: 1.22, SSR: 1.36, UR: 1.50 };

// 완전 발현(6/6) 시 총 씨앗 보정. 낮은 등급일수록 크다(구제 축).
export const SEED_FULL = { N: 0.30, R: 0.22, SR: 0.14, SSR: 0.08, UR: 0.05 };

export function rarityBaseMult(unit) {
  if (!isOn('rarity')) return 1.0; // 등급 옵션 off → 전투력 등급 무관(스탯 전용)
  return RARITY_BASE_MULT[unit.rarity] ?? 1.0;
}
function tierOf(unit) {
  return TIER[unit.rarity] ?? -1;
}

// 6가지 조건. thr=[N,R,SR,SSR] 등급별 문턱(낮은 등급일수록 낮음).
// 각 조건은 달성 시 stat에 (완전씨앗/6) 만큼의 statPct를 부여한다.
// thr=[N,R,SR,SSR,UR] 등급별 문턱(낮은 등급일수록 낮음, UR이 가장 높음).
const CONDITIONS = [
  { id: 'talent', label: '재능 각성', narr: '잠든 재능이 깨어난다', stat: 'hp', metric: (u) => u.level, thr: [20, 40, 60, 80, 90], unitLabel: '레벨' },
  { id: 'breakthrough', label: '한계 돌파', narr: '벽을 넘어선 자', stat: 'atk', metric: (u) => u.rank, thr: [2, 3, 4, 5, 6], unitLabel: '랭크' },
  { id: 'bond', label: '유대', narr: '곁을 지키는 마음', stat: 'def', metric: (u) => intimacyLevel(u), thr: [2, 4, 6, 8, 10], unitLabel: '친밀도' },
  { id: 'oath', label: '무기의 서약', narr: '무기와 하나가 되다', stat: 'atk', metric: (u) => (u.sigWeapon?.level || 0), thr: [3, 6, 9, 12, 15], unitLabel: '전용무기' },
  { id: 'resonance', label: '심연의 공명', narr: '내면이 공명한다', stat: 'spd', metric: (u) => (u.sigAwaken || 0), thr: [1, 2, 3, 3, 3], unitLabel: '각성' },
  { id: 'runeway', label: '룬의 인도', narr: '룬이 길을 연다', stat: 'hp', metric: (u) => (u.runes || []).filter(Boolean).length, thr: [1, 2, 3, 3, 3], unitLabel: '룬 장착' },
];

export const SEED_CONDITION_COUNT = CONDITIONS.length;

// 유닛의 씨앗 조건 현황 (UI/판정 공용).
export function seedConditions(unit) {
  const t = tierOf(unit);
  if (t < 0) return [];
  const full = SEED_FULL[unit.rarity] || 0;
  const per = full / CONDITIONS.length;
  return CONDITIONS.map((c) => {
    const need = c.thr[t];
    const cur = c.metric(unit);
    return {
      id: c.id, label: c.label, narrative: c.narr, stat: c.stat, unitLabel: c.unitLabel,
      need, cur, met: cur >= need, value: per,
    };
  });
}

export function seedProgress(unit) {
  const cs = seedConditions(unit);
  const met = cs.filter((c) => c.met).length;
  return {
    hasSeed: cs.length > 0,
    met,
    total: cs.length || SEED_CONDITION_COUNT,
    fullyUnlocked: cs.length > 0 && met === cs.length,
    full: SEED_FULL[unit.rarity] || 0,
  };
}

// 씨앗이 주는 statPct 합 (달성 조건분). modifiers 파이프라인이 합산.
export function seedStatPct(unit) {
  const out = { atk: 0, hp: 0, def: 0, spd: 0 };
  for (const c of seedConditions(unit)) if (c.met) out[c.stat] += c.value;
  return out;
}
