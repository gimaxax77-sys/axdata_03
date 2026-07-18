import { computePower } from './stats.mjs';
import { accountMods } from './balance.mjs';
import { getStage } from './progression.mjs';
import { earn } from './economy.mjs';
import { addMail } from './mailbox.mjs';

// ─────────────────────────────────────────────────────────────
// 아레나 — 전투력(파워) 기반 리그. 비동기 경쟁(랭크전).
//   · 리그(티어)를 "전투력"으로 나눠, 초보/약자가 고전투력 강자와 붙지 않게 한다.
//   · 매칭은 같은 리그 안에서, 내 전투력 대비 "공정 밴드"로 상대를 생성한다.
//     (약자 보호: 상대 전투력은 내 전투력의 1.12배를 절대 넘지 않는다.)
//   · 승패로 랭크 포인트가 오르내리고, 상위 리그일수록 보상이 크다.
// ─────────────────────────────────────────────────────────────

export const ARENA_ENTRIES = 5;

// 전투력 리그 — min은 진입 전투력 하한. 상대는 같은 리그 안에서만 매칭된다.
export const ARENA_POWER_TIERS = [
  { min: 0, name: '브론즈', emoji: '🥉' },
  { min: 3000, name: '실버', emoji: '🥈' },
  { min: 12000, name: '골드', emoji: '🥇' },
  { min: 40000, name: '플래티넘', emoji: '💠' },
  { min: 120000, name: '다이아', emoji: '💎' },
  { min: 350000, name: '마스터', emoji: '👑' },
  { min: 1000000, name: '그랜드마스터', emoji: '🔱' },
];

// 약자 보호 상수: 상대 전투력 상한 배수(내 전투력의 몇 배까지 허용하나).
const OPP_CAP_MULT = 1.12;

// ── 3중 리그(주간/격주/월간) ──────────────────────────────────
// 한 번의 PvP 승리가 세 리그 포인트에 동시 적립되고, 각 리그는 자기 주기로
// 독립 리셋·정산(순위 보상은 우편함으로). 서버 연동 전에는 포인트 마일스톤 정산.
export const ARENA_LADDERS = [
  { id: 'weekly', label: '주간', days: 7, weight: 1 },
  { id: 'biweekly', label: '격주', days: 14, weight: 2.2 },
  { id: 'monthly', label: '월간', days: 28, weight: 5 },
];
const DAY_MS = 86400000;
export function ladderPeriod(now, days) {
  return Math.floor(now / (days * DAY_MS));
}
// 정산 보상(로컬 폴백): 누적 포인트 마일스톤 × 리그 가중치. 서버 연동 시 실 순위 보상으로 대체.
export function ladderSettleReward(ladderId, points) {
  if (points <= 0) return null;
  const l = ARENA_LADDERS.find((x) => x.id === ladderId);
  const w = l ? l.weight : 1;
  const gem = Math.max(5, Math.min(3000, Math.round((points / 25) * w)));
  return { gem };
}

// 순수 매칭: 후보 목록에서 "같은 리그 + 약자보호 밴드(내 파워 0.7~1.12배)" 상대 선택.
// candidates: [{ power, ... }]. 클라(봇 풀)·서버(실 유저 풀) 공용.
export function pickOpponent(myPower, candidates, rng = Math.random) {
  const tier = arenaPowerTier(myPower);
  const lo = Math.max(myPower * 0.7, tier.min);
  const hi = Math.min(myPower * OPP_CAP_MULT, tier.max - 1);
  const pool = (candidates || []).filter((c) => c && c.power >= lo && c.power <= hi);
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

function ensureLadders(state) {
  state.ladders = state.ladders || {};
  for (const l of ARENA_LADDERS) {
    state.ladders[l.id] = state.ladders[l.id] || { points: 0, period: null };
  }
  return state.ladders;
}
// 주기 경과 시 정산(우편) + 리셋. 최초 진입은 period만 세팅.
export function refreshLadders(state, now = Date.now()) {
  const L = ensureLadders(state);
  for (const l of ARENA_LADDERS) {
    const cur = ladderPeriod(now, l.days);
    const st = L[l.id];
    if (st.period === null) { st.period = cur; continue; }
    if (st.period !== cur) {
      const reward = ladderSettleReward(l.id, st.points);
      if (reward) addMail(state, { title: `${l.label} 리그 정산 보상`, reward, ts: now });
      st.points = 0;
      st.period = cur;
    }
  }
}
// 승리 포인트를 세 리그에 동시 적립.
export function recordLadderWin(state, points, now = Date.now()) {
  refreshLadders(state, now);
  const L = ensureLadders(state);
  for (const l of ARENA_LADDERS) L[l.id].points += points;
}
// UI용 현황: 리그별 포인트 + 남은 시간.
export function ladderInfo(state, now = Date.now()) {
  refreshLadders(state, now);
  const L = ensureLadders(state);
  return ARENA_LADDERS.map((l) => {
    const cur = ladderPeriod(now, l.days);
    const endsAt = (cur + 1) * l.days * DAY_MS;
    return { id: l.id, label: l.label, points: L[l.id].points, endsInMs: Math.max(0, endsAt - now) };
  });
}

// 전투력 → 리그(인덱스·이름·이모지·구간 [min,max)).
export function arenaPowerTier(power) {
  let idx = 0;
  for (let i = 0; i < ARENA_POWER_TIERS.length; i++) {
    if (power >= ARENA_POWER_TIERS[i].min) idx = i; else break;
  }
  const t = ARENA_POWER_TIERS[idx];
  const max = idx + 1 < ARENA_POWER_TIERS.length ? ARENA_POWER_TIERS[idx + 1].min : Infinity;
  return { ...t, index: idx, max };
}

// 내 파티 실효 전투력(계정 배수 포함).
export function partyPowerEff(state) {
  const byId = new Map(state.units.map((u) => [u.uid, u]));
  const party = state.party.map((id) => byId.get(id)).filter(Boolean);
  const mult = accountMods(state).powerMult;
  return party.reduce((s, u) => s + computePower(u), 0) * mult;
}

// UI용 현황(대전 없이 조회): 내 전투력·리그·랭크 포인트.
export function arenaInfo(state) {
  const power = partyPowerEff(state);
  return { power: Math.round(power), tier: arenaPowerTier(power), points: state.arena.points };
}

function refresh(state, now) {
  const d = Math.floor(now / 86400000);
  if (state.arena.day !== d) { state.arena.day = d; state.arena.entries = 0; }
}
export function arenaEntriesLeft(state, now = Date.now()) {
  refresh(state, now);
  return ARENA_ENTRIES - state.arena.entries;
}

// 한 판 대전. 상대는 "같은 리그 + 공정 밴드"로 생성하며, 내 전투력의 1.12배를 넘지 않는다.
export function arenaFight(state, rng = Math.random, now = Date.now()) {
  if (arenaEntriesLeft(state, now) <= 0) return { ok: false, reason: '오늘 입장 소진' };
  state.arena.entries += 1;

  const my = partyPowerEff(state);
  const tier = arenaPowerTier(my);
  // 공정 밴드 0.80~1.12 → 약자 보호 상한(my×1.12)과 리그 상한 이내로 클램프.
  const band = 0.80 + rng() * 0.32;
  let opp = my * band;
  opp = Math.min(opp, my * OPP_CAP_MULT, tier.max - 1);
  opp = Math.max(opp, my * 0.70, tier.min);

  const win = my >= opp;
  const gain = win ? 25 : -12;
  state.arena.points = Math.max(0, state.arena.points + gain);
  // 3중 리그: 승리 시 세 리그에 포인트 동시 적립(단방향 — 패배는 리그 무손실).
  if (win) recordLadderWin(state, gain, now);
  else refreshLadders(state, now);

  // 상위 리그일수록 보상↑.
  const reward = win
    ? { gem: 5 + tier.index * 2, currency: Math.round(getStage(state.peakStage).rewards.currency * 20 * (1 + tier.index * 0.5)) }
    : {};
  if (win) earn(state.wallet, reward);

  return {
    ok: true, win, points: state.arena.points,
    tier: tier.name, tierEmoji: tier.emoji, tierIndex: tier.index,
    reward, myPower: Math.round(my), oppPower: Math.round(opp), gain,
  };
}
