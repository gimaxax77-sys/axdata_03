import { earn } from './economy.mjs';
import { addMail } from './mailbox.mjs';
import { getPartyUnits } from './gameState.mjs';
import { resolve } from './resolution.mjs';
import { toCombatProfile } from './units.mjs';

// ─────────────────────────────────────────────────────────────
// 시즌제 소프트 리셋 콘텐츠 — 고인물 독점 방지 + 신규 기회 제공.
//   · 메인 성장은 영구 보존하되, 시즌 던전에서는 "전용 버프로 평준화된 조건"에서 겨룬다.
//   · 스탯 격차를 상수 배수로 압축(정규화)해, 저스펙도 운영/편성으로 상위 도달 가능.
//   · 2~4주 주기로 리셋(로컬: 누적 점수 마일스톤 정산 → 우편). 서버 시 실 순위로 대체.
// ─────────────────────────────────────────────────────────────

const DAY_MS = 86400000;
export const SEASON_DAYS = 14; // 2주 주기
export const SEASON_FLOORS = 30; // 시즌 던전 층수

export function seasonIndex(now = Date.now()) { return Math.floor(now / (SEASON_DAYS * DAY_MS)); }

// 평준화: 파티 원시 전투 지표를 로그 압축해 "스펙 인플레"를 완화한다.
//   보정력 = 1 + ln(1 + rawPower / PIVOT) * SCALE  (스펙차가 점수차를 지배하지 못하게)
const PIVOT = 5000;
const SCALE = 0.6;
export function equalizedPower(party) {
  if (!party || !party.length) return 0;
  const profiles = party.map(toCombatProfile);
  const raw = profiles.reduce((s, p) => s + p.dps + p.hp * 0.1, 0);
  return Math.round(1000 * (1 + Math.log(1 + raw / PIVOT) * SCALE));
}

// 시즌 던전 한 층의 도전 난이도(층이 오를수록 가파르게).
export function seasonFloorChallenge(floor) {
  const t = floor - 1;
  return {
    hp: Math.round(20000 * Math.pow(1.35, t)),
    atk: Math.round(400 * Math.pow(1.28, t)),
    def: Math.round(80 * Math.pow(1.22, t)),
    element: null,
  };
}

function ensure(state, now) {
  state.season2 = state.season2 || { idx: -1, floor: 0, best: 0 };
  const idx = seasonIndex(now);
  if (state.season2.idx !== idx) {
    // 시즌 정산(로컬): 지난 시즌 도달 층 × 상수 → 우편 보상.
    if (state.season2.idx >= 0 && state.season2.best > 0) {
      const gem = Math.min(2000, state.season2.best * 20);
      addMail(state, { title: `시즌 ${state.season2.idx + 1} 정산 보상`, reward: { gem }, ts: now });
    }
    state.season2 = { idx, floor: 0, best: 0 };
  }
  return state.season2;
}

// UI 현황: 현재 시즌·도달 층·평준화 전투력·남은 시간.
export function seasonInfo(state, now = Date.now()) {
  const s = ensure(state, now);
  const endsAt = (seasonIndex(now) + 1) * SEASON_DAYS * DAY_MS;
  return {
    season: s.idx + 1, floor: s.floor, best: s.best, maxFloor: SEASON_FLOORS,
    power: equalizedPower(getPartyUnits(state)),
    endsInMs: Math.max(0, endsAt - now),
  };
}

// 다음 층 도전 — 평준화 조건에서 판정. 승리 시 층+1·점수 갱신, 보상 지급.
export function seasonChallenge(state, now = Date.now()) {
  const s = ensure(state, now);
  if (s.floor >= SEASON_FLOORS) return { ok: false, reason: '최고 층 도달' };
  const party = getPartyUnits(state);
  if (!party.length) return { ok: false, reason: '파티 없음' };
  const nextFloor = s.floor + 1;
  const ch = seasonFloorChallenge(nextFloor);
  // 평준화: 계정 배수를 쓰지 않고(공정), 파티 원시 스탯으로만 판정.
  const r = resolve(party, ch);
  if (!r.win) return { ok: false, reason: `${nextFloor}층 클리어 실패`, floor: s.floor, margin: r.margin };
  s.floor = nextFloor;
  s.best = Math.max(s.best, nextFloor);
  const reward = { gem: 3 + nextFloor, currency: 500 * nextFloor };
  earn(state.wallet, reward);
  return { ok: true, floor: s.floor, reward, cleared: nextFloor >= SEASON_FLOORS };
}
