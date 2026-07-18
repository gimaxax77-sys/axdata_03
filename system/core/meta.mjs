import { earn } from './economy.mjs';
import { getStage } from './progression.mjs';

// ─────────────────────────────────────────────────────────────
// 리텐션 메타 — 도감·업적·시즌패스. 대부분 "진행 상태의 투영"이라
// 새 상태는 청구(claim) 기록만 둔다: state.meta = { achv, coll, season }.
//   · 도감    : 보유 영웅(characterId) 수 마일스톤
//   · 업적    : 스테이지·환생·수집·유물 등 목표 달성 보상
//   · 시즌패스 : 진행도 기반 XP → 티어, 무료/프리미엄 보상
// 보상의 *Stage 키는 진행도(peakStage) 비례 스케일(상점 규약과 동일).
// ─────────────────────────────────────────────────────────────

export function ownedCharacterIds(state) {
  const set = new Set();
  for (const u of state.units || []) if (u.characterId) set.add(u.characterId);
  return set;
}
function relicSum(state) {
  return Object.values(state.relics || {}).reduce((a, b) => a + b, 0);
}
function scaleReward(state, reward) {
  const st = getStage(state.peakStage).rewards;
  const out = {};
  for (const [k, v] of Object.entries(reward)) {
    if (k === 'currencyStage') out.currency = (out.currency || 0) + Math.round(st.currency * v);
    else if (k === 'growthStage') out.growth = (out.growth || 0) + Math.round(st.growth * v);
    else out[k] = (out[k] || 0) + v;
  }
  return out;
}

// ── 업적 ───────────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: 'stage25', label: '첫 발자국', desc: '스테이지 25 도달', metric: (s) => s.peakStage || 1, goal: 25, reward: { gem: 50 } },
  { id: 'stage60', label: '모험가', desc: '스테이지 60 도달', metric: (s) => s.peakStage || 1, goal: 60, reward: { gem: 100 } },
  { id: 'prestige5', label: '환생자', desc: '환생 5회 달성', metric: (s) => s.prestige || 0, goal: 5, reward: { summon: 50 } },
  { id: 'collect3', label: '수집의 시작', desc: '영웅 3종 수집', metric: (s) => ownedCharacterIds(s).size, goal: 3, reward: { gem: 40 } },
  { id: 'collect6', label: '수집가', desc: '영웅 6종 수집', metric: (s) => ownedCharacterIds(s).size, goal: 6, reward: { gem: 120 } },
  { id: 'relic20', label: '유물학자', desc: '유물 합계 Lv.20', metric: (s) => relicSum(s), goal: 20, reward: { gem: 80 } },
];

export function achievementList(state) {
  return ACHIEVEMENTS.map((a) => {
    const cur = a.metric(state);
    return { ...a, cur, done: cur >= a.goal, claimed: !!(state.meta.achv[a.id]) };
  });
}
export function claimAchievement(state, id) {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) return { ok: false, reason: '없는 업적' };
  if (a.metric(state) < a.goal) return { ok: false, reason: '미달성' };
  if (state.meta.achv[id]) return { ok: false, reason: '수령 완료' };
  earn(state.wallet, a.reward);
  state.meta.achv[id] = true;
  return { ok: true, reward: a.reward };
}

// ── 도감 (수집 마일스톤) ───────────────────────────────────────
export const COLLECTION = [
  { id: 'c1', need: 1, reward: { gem: 20 } },
  { id: 'c3', need: 3, reward: { summon: 20 } },
  { id: 'c5', need: 5, reward: { gem: 60 } },
  { id: 'c8', need: 8, reward: { gem: 150 } },
  { id: 'c12', need: 12, reward: { gem: 250, summon: 30 } },
  { id: 'c14', need: 14, reward: { gem: 400, summon: 50 } },
];
export function collectionList(state) {
  const owned = ownedCharacterIds(state).size;
  return COLLECTION.map((c) => ({ ...c, owned, done: owned >= c.need, claimed: !!(state.meta.coll[c.id]) }));
}
export function claimCollection(state, id) {
  const c = COLLECTION.find((x) => x.id === id);
  if (!c) return { ok: false, reason: '없는 항목' };
  if (ownedCharacterIds(state).size < c.need) return { ok: false, reason: '미달성' };
  if (state.meta.coll[id]) return { ok: false, reason: '수령 완료' };
  earn(state.wallet, c.reward);
  state.meta.coll[id] = true;
  return { ok: true, reward: c.reward };
}

// ── 시즌패스 (진행도 XP → 티어) ────────────────────────────────
export const SEASON_XP_PER_TIER = 120;
export const SEASON_MAX_TIER = 15;
export function seasonXp(state) {
  return (state.peakStage || 1) * 10 + (state.prestige || 0) * 20 + ownedCharacterIds(state).size * 15 + relicSum(state) * 3;
}
export function seasonTier(state) {
  return Math.min(SEASON_MAX_TIER, Math.floor(seasonXp(state) / SEASON_XP_PER_TIER));
}
export function seasonProgress(state) {
  const xp = seasonXp(state);
  const tier = seasonTier(state);
  const into = xp - tier * SEASON_XP_PER_TIER;
  return { xp, tier, into: Math.min(into, SEASON_XP_PER_TIER), per: SEASON_XP_PER_TIER, premium: !!state.meta.season.premium };
}
// 티어별 보상: 무료(누구나) / 프리미엄(패스 구매 시).
export function seasonReward(tier, track) {
  if (track === 'free') return tier % 5 === 0 ? { summon: 20 } : { currencyStage: 40 };
  return tier % 5 === 0 ? { gem: 40 } : { gem: 15 };
}
export function seasonTierList(state) {
  const cur = seasonTier(state);
  const out = [];
  for (let t = 1; t <= SEASON_MAX_TIER; t++) {
    out.push({
      tier: t, reached: cur >= t,
      free: { reward: seasonReward(t, 'free'), claimed: !!state.meta.season.claimed[`f${t}`] },
      premium: { reward: seasonReward(t, 'premium'), claimed: !!state.meta.season.claimed[`p${t}`] },
    });
  }
  return out;
}
export function buySeasonPremium(state) {
  if (state.meta.season.premium) return { ok: false, reason: '이미 보유' };
  state.meta.season.premium = true; // 모의 결제(골격)
  return { ok: true };
}
export function claimSeason(state, tier, track) {
  if (seasonTier(state) < tier) return { ok: false, reason: '티어 미달' };
  if (track === 'premium' && !state.meta.season.premium) return { ok: false, reason: '프리미엄 패스 필요' };
  const key = (track === 'free' ? 'f' : 'p') + tier;
  if (state.meta.season.claimed[key]) return { ok: false, reason: '수령 완료' };
  const reward = scaleReward(state, seasonReward(tier, track));
  earn(state.wallet, reward);
  state.meta.season.claimed[key] = true;
  return { ok: true, reward };
}

// 도감/업적 보상 표시용 스케일 프리뷰
export function metaGrantPreview(state, reward) {
  return scaleReward(state, reward);
}
