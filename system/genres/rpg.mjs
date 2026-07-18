import { resolve } from '../core/resolution.mjs';
import { getStage } from '../core/progression.mjs';
import { getPartyUnits } from '../core/gameState.mjs';
import { earn } from '../core/economy.mjs';
import { accountMods } from '../core/balance.mjs';

// ─────────────────────────────────────────────────────────────
// 장르 어댑터: RPG (능동형)
// 플레이어가 직접 전투를 트리거한다. 행동력을 소모하고,
// 승리해야만 다음 스테이지가 열린다. 시간은 플레이어가 굴린다.
// ─────────────────────────────────────────────────────────────

export const rpgGenre = {
  id: 'rpg',
  name: 'RPG (능동)',
  ENERGY_COST: 6,

  // 현재 스테이지에 전투를 건다. 결과 로그를 반환.
  battle(state) {
    if (state.energy < this.ENERGY_COST) {
      return { ok: false, reason: '행동력 부족', energy: state.energy };
    }
    state.energy -= this.ENERGY_COST;

    const party = getPartyUnits(state);
    const stageDef = getStage(state.stage);
    const result = resolve(party, stageDef.challenge, accountMods(state), state.formation);

    if (result.win) {
      earn(state.wallet, {
        currency: stageDef.rewards.currency,
        growth: stageDef.rewards.growth,
      });
      state.maxStage = Math.max(state.maxStage, state.stage + 1);
      state.stage += 1; // 다음 스테이지 개방
      return {
        ok: true,
        win: true,
        stage: stageDef.stage,
        reward: stageDef.rewards,
        log: `${result.log} → 스테이지 ${state.stage} 개방`,
      };
    }
    return { ok: true, win: false, stage: stageDef.stage, log: result.log };
  },

  // 행동력 회복 (RPG 전용 자원 루프)
  restoreEnergy(state, amount) {
    state.energy = Math.min(120, state.energy + amount);
  },
};
