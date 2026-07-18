import { spend } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 엠블럼(문장) — 계정 단위 수집형 성장. 유물과 형제지만 축이 다르다.
//   · 유물: currency(성장 재화)로 강화
//   · 엠블럼: 다이아(gem)로 강화 → 프리미엄 재화 싱크
//   전 유닛 공유 배수(power/currency/growth)를 accountMods에 합산한다.
//   전 문장을 1레벨 이상 수집하면 "도감 완성" 파워 보너스가 붙는다.
// ─────────────────────────────────────────────────────────────

export const EMBLEMS = {
  E_VALOR: { id: 'E_VALOR', kind: 'power', per: 0.04, rarity: 'R', emoji: '🎖️', label: '용맹의 문장' },
  E_FORTUNE: { id: 'E_FORTUNE', kind: 'currency', per: 0.06, rarity: 'R', emoji: '🏅', label: '행운의 문장' },
  E_WISDOM: { id: 'E_WISDOM', kind: 'growth', per: 0.06, rarity: 'R', emoji: '🎗️', label: '지혜의 문장' },
  E_CONQUEST: { id: 'E_CONQUEST', kind: 'power', per: 0.06, rarity: 'SR', emoji: '🥇', label: '정복의 문장' },
  E_ETERNITY: { id: 'E_ETERNITY', kind: 'power', per: 0.09, rarity: 'SSR', emoji: '👑', label: '영원의 문장' },
};

export const EMBLEM_RARITY_CAP = { R: 15, SR: 25, SSR: 35 };
export function emblemCap(id) {
  const e = EMBLEMS[id];
  return (e && EMBLEM_RARITY_CAP[e.rarity]) || 15;
}

// 도감 완성(전 문장 1레벨↑) 시 파워 보너스.
export const EMBLEM_COMPLETE_BONUS = 0.10;

export function emblemUpgradeCost(level) {
  return { gem: Math.round(20 * Math.pow(1.35, level)) };
}

export function upgradeEmblem(state, id) {
  if (!EMBLEMS[id]) return { ok: false, reason: '알 수 없는 문장' };
  const cap = emblemCap(id);
  const lv = (state.emblems && state.emblems[id]) || 0;
  if (lv >= cap) return { ok: false, reason: `강화 상한 ${cap}` };
  const cost = emblemUpgradeCost(lv);
  if (!spend(state.wallet, cost)) return { ok: false, reason: '다이아 부족', cost };
  state.emblems = state.emblems || {};
  state.emblems[id] = lv + 1;
  return { ok: true, id, level: lv + 1, cost };
}

// 도감 완성 여부(전 문장 1레벨 이상).
export function emblemComplete(state) {
  const owned = state.emblems || {};
  return Object.keys(EMBLEMS).every((id) => (owned[id] || 0) >= 1);
}

// 계정 배수 (power / currency / growth). 문장 없으면 전부 1. 완성 시 파워 보너스.
export function emblemMods(state) {
  let power = 1, currency = 1, growth = 1;
  const owned = state.emblems || {};
  for (const [id, lv] of Object.entries(owned)) {
    const e = EMBLEMS[id];
    if (!e || !lv) continue;
    if (e.kind === 'power') power += e.per * lv;
    else if (e.kind === 'currency') currency += e.per * lv;
    else growth += e.per * lv;
  }
  if (emblemComplete(state)) power += EMBLEM_COMPLETE_BONUS;
  return { power, currency, growth };
}
