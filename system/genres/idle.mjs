import { resolve } from '../core/resolution.mjs';
import { getPartyUnits } from '../core/gameState.mjs';
import { earn } from '../core/economy.mjs';
import { accountMods } from '../core/balance.mjs';
import { openPrestigeBox } from '../core/lootbox.mjs';
import { playStage } from '../core/difficulty.mjs';

// ─────────────────────────────────────────────────────────────
// 장르 어댑터: 방치형 (자동/누적형)
// 시간이 스스로 굴러간다. 현재 스테이지를 자동 반복 클리어하며
// 초당 보상을 누적하고, 충분히 강하면 자동으로 다음 스테이지로 전진.
// 오프라인(큰 dt) 누적과 환생(prestige)을 지원한다.
//
// 핵심: RPG와 "완전히 같은" resolve()를 쓰되, win 대신 duration을 쓴다.
// ─────────────────────────────────────────────────────────────

const OFFLINE_CAP_SEC = 8 * 3600; // 오프라인 보상 상한 8시간
// 현재 스테이지를 이 시간 안에 클리어할 만큼 강하면 "여유 있음"으로 보고
// 다음 스테이지로 전진한다. 벽(=이 값보다 오래 걸림)에 닿으면 거기서 파밍.
const AUTO_ADVANCE_MARGIN = 2.5; // 초

export const idleGenre = {
  id: 'idle',
  name: '방치형 (자동)',

  // dtSeconds 만큼 시간을 진행시키고 누적 보상을 반환.
  tick(state, dtSeconds) {
    let remaining = Math.min(dtSeconds, OFFLINE_CAP_SEC);
    const party = getPartyUnits(state);
    const mods = accountMods(state);
    const gained = { currency: 0, growth: 0 };
    let clears = 0;

    // 난이도 벽 대응: 상위 난이도(험난↑)에서 현재 스테이지가 이길 수 없으면
    // 이길 수 있는 층까지 하강한다(난이도 전환 시 자동 재정착).
    // 일반 난이도는 기존 "벽에서 정지" 동작을 유지(하강 안 함).
    if (state.difficulty && state.difficulty !== 'normal') {
      let guard = 0;
      while (state.stage > 1 && guard++ < 500) {
        const r = resolve(party, playStage(state).challenge, mods, state.formation);
        if (r.win && r.duration !== Infinity) break;
        state.stage -= 1;
      }
    }

    // 시간 예산이 남는 동안 현재 스테이지를 반복
    while (remaining > 0) {
      const stageDef = playStage(state);
      const result = resolve(party, stageDef.challenge, mods, state.formation);

      if (!result.win || result.duration === Infinity) break; // 벽에 막힘

      // 다음 스테이지가 너무 쉬우면 전진 (성장에 따른 자동 진행)
      if (result.duration <= AUTO_ADVANCE_MARGIN) {
        state.stage += 1;
        state.maxStage = Math.max(state.maxStage, state.stage);
        state.peakStage = Math.max(state.peakStage || 1, state.maxStage);
        continue;
      }

      if (result.duration > remaining) break; // 한 판 돌릴 시간도 없음

      remaining -= result.duration;
      clears += 1;
      gained.currency += stageDef.rewards.currency;
      gained.growth += stageDef.rewards.growth;
    }

    // 방치 수입 배수: 환생 + 유물 (accountMods) 반영
    gained.currency = Math.round(gained.currency * mods.currencyMult);
    gained.growth = Math.round(gained.growth * mods.growthMult);

    earn(state.wallet, gained);
    state.lastTick = Date.now();
    return { clears, gained, stage: state.stage };
  },

  // 실제 경과 시간으로 오프라인 보상 정산
  collectOffline(state, nowMs = Date.now()) {
    if (!state.lastTick) {
      state.lastTick = nowMs;
      return { clears: 0, gained: { currency: 0, growth: 0 }, stage: state.stage, seconds: 0 };
    }
    const dt = Math.max(0, (nowMs - state.lastTick) / 1000);
    return { ...this.tick(state, dt), seconds: Math.min(dt, OFFLINE_CAP_SEC) };
  },

  // QoL: 오프라인 보상 2배 — 광고 시청 등으로 정산된 보상만큼 한 번 더 지급.
  //   rew.gained(정산 결과)를 그대로 넘기면 순증 = 2배가 된다.
  applyOfflineBonus(state, gained, factor = 1) {
    if (!gained) return { ok: false };
    const bonus = { currency: Math.round((gained.currency || 0) * factor), growth: Math.round((gained.growth || 0) * factor) };
    if (bonus.currency <= 0 && bonus.growth <= 0) return { ok: false };
    earn(state.wallet, bonus);
    return { ok: true, bonus };
  },

  // 환생: 이번 회차 진행을 리셋하고 영구 파워/수입 배수를 얻는다.
  // 정통 방치형 루프 — 벽에서 환생 → 배수로 더 깊이 재등반.
  // peakStage(역대 최고)는 유지하므로 "실제 진행도"는 사라지지 않는다.
  prestige(state, rng = Math.random) {
    const gain = Math.floor(Math.sqrt(state.maxStage));
    if (gain < 1) return { prestigeGained: 0, totalPrestige: state.prestige };
    // 리셋 전 도달치로 전리품 상자 지급.
    const box = openPrestigeBox(state, state.maxStage, rng);
    state.prestige += gain;
    state.peakStage = Math.max(state.peakStage || 1, state.maxStage);
    state.stage = 1;
    state.maxStage = 1; // 이번 회차 리셋 → 재등반
    return { prestigeGained: gain, totalPrestige: state.prestige, box };
  },
};
