import { toCombatProfile } from './units.mjs';
import { accountMods } from './balance.mjs';
import { getStage } from './progression.mjs';
import { getPartyUnits } from './gameState.mjs';
import { earn } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 길드 보스 레이드 — 협동 경쟁 골격(비동기).
// 매일 정해진 횟수만큼 보스를 공격해 누적 피해를 넣는다.
// 보스를 처치하면 티어가 오르고(=다음 보스는 더 강함) 보너스 보상.
// 실 길드원 대신, 진행도 기반 보스 HP로 "레이드 감"을 재현한다.
// ─────────────────────────────────────────────────────────────

export const GUILD_ATTACKS = 3;      // 하루 공격 횟수
const ATTACK_SECONDS = 30;           // 1회 공격 = 30초 딜
// 보스 HP = 현재 진행 스테이지 적 HP × BOSS_HP_MULT × 티어.
// 대략 스테이지에 맞는 파티가 티어당 며칠에 걸쳐 잡도록 조정(골격 수치).
const BOSS_HP_MULT = 18;

// 파티 총 DPS(계정 배수 포함) — 한 번 공격에 넣는 피해의 초당량.
function partyDpsEff(state) {
  const party = getPartyUnits(state);
  const mult = accountMods(state).powerMult;
  const dps = party.reduce((s, u) => s + toCombatProfile(u).dps, 0);
  return dps * mult;
}

// 티어별 보스 최대 HP. peakStage(진행도)와 티어가 함께 오른다.
export function guildBossMaxHp(state) {
  const tier = state.guild.tier || 1;
  return Math.round(getStage(state.peakStage).challenge.hp * BOSS_HP_MULT * tier);
}

function refresh(state, now) {
  const d = Math.floor(now / 86400000);
  if (state.guild.day !== d) { state.guild.day = d; state.guild.attacks = 0; }
  if (state.guild.bossHp === null || state.guild.bossHp === undefined) {
    state.guild.bossHp = guildBossMaxHp(state);
  }
}

export function guildAttacksLeft(state, now = Date.now()) {
  refresh(state, now);
  return GUILD_ATTACKS - state.guild.attacks;
}

// 한 번 공격. 누적 피해를 보스 HP에서 깎고, 처치 시 티어업 + 보너스.
export function guildAttack(state, now = Date.now()) {
  if (guildAttacksLeft(state, now) <= 0) return { ok: false, reason: '오늘 공격 소진' };
  state.guild.attacks += 1;
  const dmg = Math.round(partyDpsEff(state) * ATTACK_SECONDS);
  state.guild.bossHp = Math.max(0, state.guild.bossHp - dmg);

  // 기여 보상: 피해량 비례 길드 코인 + 진행도 골드
  const coin = Math.max(1, Math.round(dmg / 500));
  state.guild.coins = (state.guild.coins || 0) + coin;
  const reward = { currency: Math.round(getStage(state.peakStage).rewards.currency * 15) };
  earn(state.wallet, reward);

  let killed = false, bonus = null;
  if (state.guild.bossHp <= 0) {
    killed = true;
    state.guild.tier += 1;
    bonus = { gem: 15, summon: 20 };
    earn(state.wallet, bonus);
    state.guild.bossHp = guildBossMaxHp(state); // 다음 보스 등장
  }
  return {
    ok: true, dmg, killed, bonus, coin, reward,
    tier: state.guild.tier, bossHp: state.guild.bossHp, bossMax: guildBossMaxHp(state),
  };
}
