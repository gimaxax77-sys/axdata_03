import { spend } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 기간제 대여(렌트) — 유료 BM. 일정 기간 상위 성능 아이템을 빌린다.
//   · 결제 → 해당 슬롯에 tier + 만료시각(expiresAt) 설정.
//   · 추가 결제(상위 tier) → 등급 교체 + 기간 리셋.
//   · 미결제 → 기간 종료 시 효과 소멸(active 판정이 자동 처리).
// 활성 렌트만 accountMods(power/currency)에 곱해진다.
// 상태: state.rentals = { [slotId]: { tier, expiresAt } }.
// ─────────────────────────────────────────────────────────────

const DAY = 86400000;

export const RENTAL_CATALOG = {
  RENT_WEAPON: {
    id: 'RENT_WEAPON', label: '대여 전투장비', emoji: '🗡️', kind: 'power',
    tiers: [
      { tier: 1, per: 0.15, days: 7, gem: 120, krw: '₩3,300' },
      { tier: 2, per: 0.30, days: 7, gem: 240, krw: '₩6,600' },
      { tier: 3, per: 0.50, days: 7, gem: 420, krw: '₩12,000' },
    ],
  },
  RENT_ACCESSORY: {
    id: 'RENT_ACCESSORY', label: '대여 악세서리', emoji: '💍', kind: 'currency',
    tiers: [
      { tier: 1, per: 0.20, days: 7, gem: 100, krw: '₩2,900' },
      { tier: 2, per: 0.40, days: 7, gem: 200, krw: '₩5,500' },
      { tier: 3, per: 0.70, days: 7, gem: 360, krw: '₩9,900' },
    ],
  },
  RENT_RELIC: {
    id: 'RENT_RELIC', label: '대여 유물', emoji: '🔱', kind: 'power',
    tiers: [
      { tier: 1, per: 0.25, days: 30, gem: 300, krw: '₩9,900' },
      { tier: 2, per: 0.50, days: 30, gem: 560, krw: '₩19,000' },
      { tier: 3, per: 0.90, days: 30, gem: 900, krw: '₩29,000' },
    ],
  },
};

export function rentalDef(id) { return RENTAL_CATALOG[id] || null; }
export function rentalTierDef(id, tier) {
  const d = RENTAL_CATALOG[id];
  return d ? d.tiers.find((t) => t.tier === tier) || null : null;
}

// 현재 활성 렌트 상태 (없거나 만료면 null).
export function rentalState(state, id, now = Date.now()) {
  const r = state.rentals && state.rentals[id];
  if (!r || !r.expiresAt || now >= r.expiresAt) return null;
  return r;
}
export function rentalActive(state, id, now = Date.now()) {
  return !!rentalState(state, id, now);
}
export function rentalTier(state, id, now = Date.now()) {
  const r = rentalState(state, id, now);
  return r ? r.tier : 0;
}
export function rentalMsLeft(state, id, now = Date.now()) {
  const r = rentalState(state, id, now);
  return r ? r.expiresAt - now : 0;
}

// 활성 렌트들의 계정 배수 (power/currency). growth는 렌트 없음.
export function rentalMods(state, now = Date.now()) {
  let power = 1, currency = 1;
  if (!state.rentals) return { power, currency };
  for (const id of Object.keys(state.rentals)) {
    const r = rentalState(state, id, now);
    if (!r) continue;
    const def = RENTAL_CATALOG[id];
    const td = rentalTierDef(id, r.tier);
    if (!def || !td) continue;
    if (def.kind === 'power') power += td.per;
    else if (def.kind === 'currency') currency += td.per;
  }
  return { power, currency };
}

// 렌트 결제 — 지정 tier 구매. 상위 tier면 교체+기간 리셋, 동일 tier면 연장.
export function rent(state, id, tier, now = Date.now()) {
  const td = rentalTierDef(id, tier);
  if (!td) return { ok: false, reason: '알 수 없는 상품' };
  const cost = { gem: td.gem };
  if (!spend(state.wallet, cost)) return { ok: false, reason: '다이아 부족', cost };
  state.rentals = state.rentals || {};
  const cur = rentalState(state, id, now);
  // 동일 tier 재결제면 남은 기간에 이어붙임(연장), 아니면 기간 리셋.
  const base = cur && cur.tier === tier ? cur.expiresAt : now;
  state.rentals[id] = { tier, expiresAt: base + td.days * DAY };
  return { ok: true, id, tier, expiresAt: state.rentals[id].expiresAt, cost };
}

// 만료된 렌트 정리(선택적 — active 판정이 이미 처리하지만 세이브를 깔끔히).
export function pruneRentals(state, now = Date.now()) {
  if (!state.rentals) return;
  for (const id of Object.keys(state.rentals)) {
    const r = state.rentals[id];
    if (!r || !r.expiresAt || now >= r.expiresAt) delete state.rentals[id];
  }
}
