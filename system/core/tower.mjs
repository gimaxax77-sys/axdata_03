import { getStage } from './progression.mjs';
import { resolve } from './resolution.mjs';
import { getPartyUnits } from './gameState.mjs';
import { accountMods } from './balance.mjs';
import { earn } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 무한의 탑 — 끝없이 오르는 엔드게임 도전.
//   · 각 층은 점점 강해지는 보스(같은 resolve 엔진). 승리 시 다음 층.
//   · 패배하면 그 층에 머문다(벽) → 성장·계정 배수로 재도전.
//   · 5층마다 마일스톤 보상. 최고 층(best)이 실력 지표.
// 상태: state.tower = { floor, best }.
// ─────────────────────────────────────────────────────────────

// 층 난이도 — 일반 스테이지보다 가파르게(엔드게임). 보스 강화 포함.
export function towerChallenge(floor) {
  const c = getStage(4 + floor * 3).challenge;
  return {
    hp: Math.round(c.hp * 1.5), atk: Math.round(c.atk * 1.2),
    def: Math.round(c.def * 1.15), element: c.element,
  };
}

// 층이 깊을수록 보상↑. 5층 마일스톤은 소환권까지.
export function towerReward(floor) {
  if (floor % 5 === 0) return { gem: 10 + floor, summon: 15 + Math.floor(floor / 2) };
  return { gem: 1 + Math.floor(floor / 3) };
}

// 현재 층 도전. 승리 시 보상 + 전진.
export function climbTower(state) {
  const floor = (state.tower && state.tower.floor) || 1;
  const party = getPartyUnits(state);
  if (!party.length) return { ok: false, reason: '파티 없음' };
  const res = resolve(party, towerChallenge(floor), accountMods(state), state.formation);
  if (!res.win) return { ok: true, win: false, floor, margin: res.margin };
  const reward = towerReward(floor);
  earn(state.wallet, reward);
  state.tower.floor = floor + 1;
  state.tower.best = Math.max(state.tower.best || 1, state.tower.floor);
  return { ok: true, win: true, floor, reward, next: state.tower.floor, milestone: floor % 5 === 0 };
}
