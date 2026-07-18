import { spend } from './economy.mjs';
import { weightedPick } from './rng.mjs';

// ─────────────────────────────────────────────────────────────
// 정령/가디언 — 계정 소환수. 장착(최대 3)한 정령만 계정 배수에 합산.
//   · 다이아로 소환, 중복은 레벨업(강해짐) — 펫과 유사하나 축이 "전투 보조"에 집중.
//   · 대부분 power(전투력)이며 일부는 자원(currency/growth) 보조.
//   accountMods가 이 배수를 전 유닛/수입에 곱한다.
// ─────────────────────────────────────────────────────────────

export const GUARDIANS = {
  G_SALAMANDER: { id: 'G_SALAMANDER', kind: 'power', per: 0.05, rarity: 'R', emoji: '🦎', label: '불도마뱀' },
  G_UNDINE: { id: 'G_UNDINE', kind: 'currency', per: 0.06, rarity: 'R', emoji: '💧', label: '물의 정령' },
  G_SYLPH: { id: 'G_SYLPH', kind: 'growth', per: 0.06, rarity: 'R', emoji: '🌬️', label: '바람 정령' },
  G_GOLEM: { id: 'G_GOLEM', kind: 'power', per: 0.08, rarity: 'SR', emoji: '🗿', label: '대지 골렘' },
  G_KELPIE: { id: 'G_KELPIE', kind: 'currency', per: 0.09, rarity: 'SR', emoji: '🐴', label: '켈피' },
  G_PHOENIX: { id: 'G_PHOENIX', kind: 'power', per: 0.12, rarity: 'SSR', emoji: '🔥', label: '불사조령' },
};

export const MAX_ACTIVE_GUARDIANS = 3;
export const GUARDIAN_SUMMON_COST = { gem: 40 };

const GUARD_RARITY = [
  { id: 'R', weight: 68 }, { id: 'SR', weight: 26 }, { id: 'SSR', weight: 6 },
];

function ensure(state) {
  state.guardians = state.guardians || { owned: {}, active: [] };
  state.guardians.owned = state.guardians.owned || {};
  state.guardians.active = state.guardians.active || [];
  return state.guardians;
}

// 소환 — 다이아 소모, 등급 확률로 획득(중복은 레벨업). 빈 슬롯이면 자동 장착.
export function guardianSummon(state, rng = Math.random) {
  if (!spend(state.wallet, GUARDIAN_SUMMON_COST)) return { ok: false, reason: '다이아 부족', cost: GUARDIAN_SUMMON_COST };
  const g = ensure(state);
  const rarity = weightedPick(GUARD_RARITY, rng);
  const pool = Object.values(GUARDIANS).filter((x) => x.rarity === rarity.id);
  const from = pool.length ? pool : Object.values(GUARDIANS);
  const pick = from[Math.floor(rng() * from.length)];
  g.owned[pick.id] = (g.owned[pick.id] || 0) + 1;
  if (g.active.length < MAX_ACTIVE_GUARDIANS && !g.active.includes(pick.id)) g.active.push(pick.id);
  return { ok: true, guardian: pick.id, rarity: rarity.id, level: g.owned[pick.id] };
}

export function equipGuardian(state, id) {
  const g = ensure(state);
  if (!g.owned[id]) return { ok: false, reason: '미보유' };
  if (g.active.includes(id)) return { ok: false, reason: '이미 장착' };
  if (g.active.length >= MAX_ACTIVE_GUARDIANS) return { ok: false, reason: '슬롯 가득' };
  g.active.push(id);
  return { ok: true };
}
export function unequipGuardian(state, id) {
  const g = ensure(state);
  g.active = g.active.filter((x) => x !== id);
  return { ok: true };
}

// 장착 정령의 계정 배수 (power / currency / growth). 없으면 전부 1.
export function guardianMods(state) {
  let power = 1, currency = 1, growth = 1;
  const g = state.guardians;
  if (!g) return { power, currency, growth };
  for (const id of g.active || []) {
    const def = GUARDIANS[id];
    const lv = (g.owned && g.owned[id]) || 0;
    if (!def || !lv) continue;
    if (def.kind === 'power') power += def.per * lv;
    else if (def.kind === 'currency') currency += def.per * lv;
    else growth += def.per * lv;
  }
  return { power, currency, growth };
}

export function guardianEffectLabel(kind, concept) {
  if (kind === 'power') return '전투력';
  if (kind === 'currency') return `${concept ? concept.resources.currency.name : '골드'} 수입`;
  return `${concept ? concept.resources.growth.name : '정수'} 수입`;
}
