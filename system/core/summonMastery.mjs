import { earn } from './economy.mjs';
import { getStage } from './progression.mjs';

// ─────────────────────────────────────────────────────────────
// 소환 숙련도(소환 레벨) — 배너별로 소환할수록 레벨이 오르고, 달성 보상을 청구.
//   · 배너: hero · pet · gear · rune · cosmetic (소환 탭 항목들)
//   · 최대 15레벨. 누적 소환 횟수가 문턱을 넘으면 그 레벨이 열린다.
//   · 홀수 레벨 : 뽑기권 + 능력치 보상(계정 파워 %) — 전투력에 영구 반영
//   · 짝수 레벨 : 뽑기권 + 재화(진행도 비례 골드·정수·다이아)
//   보상은 순차 청구(낮은 레벨부터). 파워 보너스는 청구한 홀수 레벨에서 파생.
// ─────────────────────────────────────────────────────────────

export const SUMMON_LEVEL_MAX = 15;
export const SUMMON_BANNERS = ['hero', 'pet', 'gear', 'rune', 'cosmetic', 'guardian'];

// 레벨 L 도달에 필요한 누적 소환 횟수 (index 0 = 레벨1).
export const SUMMON_LEVEL_THRESHOLDS = [3, 8, 15, 25, 40, 60, 85, 115, 150, 190, 235, 285, 340, 400, 465];

// 홀수 레벨의 능력치 보상 = 계정 파워 배수 증가분. (1→+1% … 15→+8%)
export function levelPowerBonus(level) {
  return level % 2 === 1 ? 0.01 * Math.ceil(level / 2) : 0;
}

// 누적 횟수 → 도달 레벨(0~15).
export function levelForCount(count) {
  let lv = 0;
  for (let i = 0; i < SUMMON_LEVEL_THRESHOLDS.length; i++) {
    if (count >= SUMMON_LEVEL_THRESHOLDS[i]) lv = i + 1; else break;
  }
  return lv;
}

function ensure(state, banner) {
  state.summonMastery = state.summonMastery || {};
  state.summonMastery[banner] = state.summonMastery[banner] || { count: 0, claimed: 0 };
  return state.summonMastery[banner];
}

// 소환 실행 시 호출 — 해당 배너 누적 횟수 증가.
export function recordSummon(state, banner, n = 1) {
  if (!SUMMON_BANNERS.includes(banner)) return;
  const m = ensure(state, banner);
  m.count += n;
}

// 레벨 보상 정의 (표시·지급 공용). 모든 배너 공통 기본보상 = 소환권 + 다이아.
//   · 홀수 : 기본(소환권+다이아) + 능력치(계정 파워 %)
//   · 짝수 : 기본(소환권+다이아) + 재화(골드·정수, 진행도 비례)
export function levelReward(state, banner, level) {
  const base = { summon: 10 + level * 2, gem: 6 + level * 2 };
  if (level % 2 === 1) {
    return { type: 'stat', ...base, power: levelPowerBonus(level) };
  }
  const st = getStage(state.peakStage || 1).rewards;
  const scale = 30 + level * 10;
  return {
    type: 'currency', ...base,
    currency: Math.round(st.currency * scale),
    growth: Math.round(st.growth * scale),
  };
}

// 배너 현황 (UI 공용): 누적·레벨·청구가능 여부·다음 문턱.
export function summonMasteryInfo(state, banner) {
  const m = ensure(state, banner);
  const level = levelForCount(m.count);
  const claimable = level > m.claimed; // 도달했으나 미청구 레벨 존재
  const nextLevel = Math.min(SUMMON_LEVEL_MAX, m.claimed + 1);
  const nextThreshold = m.claimed < SUMMON_LEVEL_MAX ? SUMMON_LEVEL_THRESHOLDS[m.claimed] : null;
  return {
    banner, count: m.count, level, claimed: m.claimed, claimable,
    maxed: m.claimed >= SUMMON_LEVEL_MAX,
    nextLevel, nextThreshold,
    nextReward: m.claimed < SUMMON_LEVEL_MAX ? levelReward(state, banner, m.claimed + 1) : null,
  };
}

// 다음 미청구 레벨 하나를 청구(순차). 도달하지 못했으면 실패.
export function claimSummonLevel(state, banner) {
  const m = ensure(state, banner);
  const level = levelForCount(m.count);
  if (m.claimed >= SUMMON_LEVEL_MAX) return { ok: false, reason: '최대 레벨' };
  if (level <= m.claimed) return { ok: false, reason: '레벨 미달' };
  const next = m.claimed + 1;
  const reward = levelReward(state, banner, next);
  const grant = {};
  for (const k of ['summon', 'gem', 'currency', 'growth']) if (reward[k]) grant[k] = reward[k];
  earn(state.wallet, grant);
  m.claimed = next;
  return { ok: true, level: next, reward };
}

// 모든 배너의 청구 가능 레벨을 한 번에 청구(편의).
export function claimAllSummonLevels(state) {
  const claimed = [];
  for (const banner of SUMMON_BANNERS) {
    let r;
    while ((r = claimSummonLevel(state, banner)).ok) claimed.push({ banner, ...r });
  }
  return { ok: claimed.length > 0, claimed };
}

// 청구한 홀수 레벨들의 능력치 보상 합 → 계정 파워 배수(1 + Σ).
export function summonMasteryPower(state) {
  if (!state.summonMastery) return 1;
  let bonus = 0;
  for (const banner of SUMMON_BANNERS) {
    const m = state.summonMastery[banner];
    if (!m) continue;
    for (let lv = 1; lv <= m.claimed; lv++) bonus += levelPowerBonus(lv);
  }
  return 1 + bonus;
}
