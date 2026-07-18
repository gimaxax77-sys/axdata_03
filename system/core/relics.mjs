import { spend } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 유물(Relic) — 계정 단위 영구 성장. 환생 배수와 함께 accountMods로 합산된다.
// 유닛과 무관하게 계정 전체에 곱해지는 배수라, 장기 성장 축을 만든다.
// 3종 유물이 처음부터 존재(레벨 0)하고 currency로 강화한다(성장 재화 싱크).
// ─────────────────────────────────────────────────────────────

// 유물 — kind(power/currency/growth)별 계정 배수. rarity가 효율·상한을 정한다.
export const RELICS = {
  // 기본(R) 3종
  R_POWER: { id: 'R_POWER', kind: 'power', per: 0.03, rarity: 'R', emoji: '⚔️', label: '전투의 성물' },
  R_GOLD: { id: 'R_GOLD', kind: 'currency', per: 0.05, rarity: 'R', emoji: '🪙', label: '황금 우상' },
  R_GROWTH: { id: 'R_GROWTH', kind: 'growth', per: 0.05, rarity: 'R', emoji: '💠', label: '정수의 결정' },
  // 상위(SR) — 효율↑·상한↑
  R_WARLORD: { id: 'R_WARLORD', kind: 'power', per: 0.05, rarity: 'SR', emoji: '🗡️', label: '군신의 인장' },
  R_TREASURY: { id: 'R_TREASURY', kind: 'currency', per: 0.08, rarity: 'SR', emoji: '💰', label: '보물고 열쇠' },
  R_SAGE: { id: 'R_SAGE', kind: 'growth', per: 0.08, rarity: 'SR', emoji: '📜', label: '현자의 서' },
  // 전설(SSR) — 최고 효율
  R_TITAN: { id: 'R_TITAN', kind: 'power', per: 0.08, rarity: 'SSR', emoji: '🔱', label: '거신의 심장' },
  R_MIDAS: { id: 'R_MIDAS', kind: 'currency', per: 0.11, rarity: 'SSR', emoji: '👑', label: '마이더스의 손' },
};

// 등급별 강화 상한 — 상위 유물일수록 더 오래 성장.
export const RELIC_RARITY_CAP = { R: 20, SR: 30, SSR: 40 };
export const RELIC_CAP = 20; // 하위호환 기본값

export function relicCap(id) {
  const r = RELICS[id];
  return (r && RELIC_RARITY_CAP[r.rarity]) || RELIC_CAP;
}

export function relicUpgradeCost(level) {
  return { currency: Math.round(500 * Math.pow(1.5, level)) };
}

export function upgradeRelic(state, id) {
  if (!RELICS[id]) return { ok: false, reason: '알 수 없는 유물' };
  const cap = relicCap(id);
  const lv = (state.relics && state.relics[id]) || 0;
  if (lv >= cap) return { ok: false, reason: `강화 상한 ${cap}` };
  const cost = relicUpgradeCost(lv);
  if (!spend(state.wallet, cost)) return { ok: false, reason: '재화 부족', cost };
  state.relics = state.relics || {};
  state.relics[id] = lv + 1;
  return { ok: true, id, level: lv + 1, cost };
}

// 계정 배수 (power / currency / growth). 유물 없으면 전부 1.
export function relicMods(state) {
  let power = 1, currency = 1, growth = 1;
  const owned = state.relics || {};
  for (const [id, lv] of Object.entries(owned)) {
    const r = RELICS[id];
    if (!r || !lv) continue;
    if (r.kind === 'power') power += r.per * lv;
    else if (r.kind === 'currency') currency += r.per * lv;
    else if (r.kind === 'growth') growth += r.per * lv;
  }
  return { power, currency, growth };
}
