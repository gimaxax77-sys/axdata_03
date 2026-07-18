import { spend } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 친밀도 — 유닛별 호감도. 선물로 올리며, 레벨업 시 소량 스탯 보너스 +
// (Concept의) 대사/감정을 해금한다. "매일 확인하고 싶은 애착" 루프.
// Core는 수치만, 대사는 Concept가 소유.
// ─────────────────────────────────────────────────────────────

export const INTIMACY_MAX = 10;
const POINTS_PER_LEVEL = 100;
export const GIFT_POINTS = 40;

export function intimacyLevel(unit) {
  return Math.min(INTIMACY_MAX, Math.floor((unit.intimacy || 0) / POINTS_PER_LEVEL));
}
export function intimacyProgress(unit) {
  const p = (unit.intimacy || 0) % POINTS_PER_LEVEL;
  return { have: p, need: POINTS_PER_LEVEL, ratio: p / POINTS_PER_LEVEL };
}
// 친밀도 레벨당 전 스탯 +2% (해당 유닛)
export function intimacyBonus(unit) {
  return intimacyLevel(unit) * 0.02;
}
export function giftCost(unit) {
  return { currency: Math.round(200 * Math.pow(1.3, intimacyLevel(unit))) };
}

// 선물하기: currency 소모 → 친밀도 상승.
export function giveGift(state, uid) {
  const u = state.units.find((x) => x.uid === uid);
  if (!u) return { ok: false, reason: '유닛 없음' };
  if (intimacyLevel(u) >= INTIMACY_MAX) return { ok: false, reason: '최대 친밀도' };
  const cost = giftCost(u);
  if (!spend(state.wallet, cost)) return { ok: false, reason: '재화 부족', cost };
  const before = intimacyLevel(u);
  u.intimacy = (u.intimacy || 0) + GIFT_POINTS;
  const after = intimacyLevel(u);
  return { ok: true, level: after, leveledUp: after > before, cost };
}
