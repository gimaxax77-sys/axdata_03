// ─────────────────────────────────────────────────────────────
// 밸런스 상수 단일 소스 — 게임의 "숫자 감각"이 전부 여기 모인다.
// progression/stats/units/enhance/gear 가 모두 이 값을 참조한다.
// 밸런스 시뮬레이터가 이 값을 바꿔가며 성장 곡선을 실험한다.
// (기본값을 바꾸지 않는 한 게임 동작은 그대로다.)
//
// 값을 평면(flat)으로 두어 오버라이드/스냅샷이 단순하도록 했다.
// ─────────────────────────────────────────────────────────────

export const BALANCE = {
  // 적 스탯 (스테이지 곡선) — base를 30% 낮춰 전 층 요구치를 즉시 하향.
  enemyBase: { hp: 630, atk: 49, def: 30 },
  // 적 강화율(1.11) < 보상 증가율(1.14) → 수입이 난이도를 앞질러 벽을 완만하게.
  // base 하향 + 강화율 완화가 겹쳐 층이 깊을수록 요구 전투력이 크게 낮아진다.
  // 남는 벽은 "성장 비용의 지수화"라 환생(파워 배수)이 자연스레 이를 넘는다.
  enemyGrowth: 1.11, // 스테이지당 적 강화율 (허들 추가 완화)

  // 스테이지 보상 (수입 곡선) — base 30% 상향 + 증가율 난이도보다 빠르게.
  rewardBase: { currency: 31, growth: 13 },
  rewardGrowth: 1.14, // 스테이지당 보상 증가율

  // 유닛 성장 (스탯 곡선)
  statPerLevel: 0.08, // 레벨당 스탯 +8%
  statPerRank: 0.25, // 랭크당 스탯 +25%
  spdPerLevel: 0.01, // 레벨당 속도 +1%

  // 전투력 지표 가중치 — "각 스탯이 전투력 1점에 얼마나 기여하는가"의 단일 소스.
  //   전투력 = Σ(스탯 × powerWeights) + Σ(전투효과 × powerEffectWeights)
  // 기존 하드코딩(0.15/1.2/0.6/1.0)을 그대로 옮겨 기본 동작은 동일.
  // hp 0.15→0.09: 방어형(VANGUARD)의 막대한 HP가 전투력 지표를 지배해
  //   저등급 탱커가 고등급 딜러(STRIKER)를 앞지르던 역전을 제거(원형 간 형평).
  //   ※ 전투 판정(resolution)은 원시 스탯을 쓰므로 승패엔 영향 없음 — 표시 지표만 교정.
  powerWeights: { hp: 0.09, atk: 1.2, def: 0.6, spd: 1.0 },
  // 전투 효과(치명·흡혈·관통·피해감소=회피성)를 전투력에 환산.
  //   값은 "효과 1.0(=100%)당 전투력 기여". 실제 효과는 소수(0.1~0.5)이므로
  //   lifesteal 0.15 → 900×0.15 = +135 전투력 식으로 반영된다.
  //   계수는 resolution.mjs의 실제 전투 기여에 맞춰 산정(감이 아니라 공식 기반):
  //   · lifesteal(900)/dmgReduce(1000): 순수 생존(유효 HP)축 → 포인트당 최고.
  //       dmgReduce는 감쇠 1/(1-r)가 가속적이라 흡혈보다 소폭 높게.
  //   · critChance(500)×critDamage(250): dps=×(1+치명확률·치명피해)로 서로 곱 커플링.
  //       전형값(치명피해~0.5·치명확률~0.25)을 상대 계수로 반영 → 500/250.
  //   · defPierce(500): 고방어 적에게만 유효(상황적) → 흡혈 대비 할인.
  //   신규축: evasion/absDef(생존, 상한 50%) ~ dmgReduce급 · trueDamage(고정딜, 상한90%)
  //   ~ defPierce보다 강 · accuracy(적 회피 상쇄, 상황형) 저계수.
  powerEffectWeights: { critChance: 500, critDamage: 250, lifesteal: 900, defPierce: 500, dmgReduce: 1000, evasion: 1000, absDef: 1000, trueDamage: 700, accuracy: 200 },

  // 성장 비용 (지출 곡선) — 시뮬레이터가 밝혀낸 핵심 튜닝 포인트
  levelCostBase: 50, levelCostGrowth: 1.15, // 레벨업 (growth)
  enhanceCostBase: 40, enhanceCostGrowth: 1.25, // 각인 (currency)
  gearCostBase: 60, gearCostGrowth: 1.3, // 장비 강화 (currency)

  // 환생(prestige) 영구 보너스 — 지수적 벽을 넘는 곱셈형 루프.
  // 환생 포인트 1당: 방치 수입 배수 + 글로벌 파워 배수(상한 없음).
  // 파워 배수가 상한 없이 커져야 1.13ⁿ 난이도를 매 환생마다 따라잡는다.
  // 포인트당 파워 0.14 → 필요 환생 횟수↓·곡선 매끄러움↑(cv 0.67→0.53).
  prestigeIncomeBonus: 0.5,
  prestigePowerBonus: 0.14,
};

import { relicMods } from './relics.mjs';
import { petMods } from './pets.mjs';
import { rentalMods } from './rentals.mjs';
import { summonMasteryPower } from './summonMastery.mjs';
import { emblemMods } from './emblems.mjs';
import { guardianMods } from './guardians.mjs';

// 계정 단위 보정 = 환생(prestige) + 유물(relic) + 펫(pet) 합산.
//   powerMult    : resolve()에 넘겨 전투력에 곱함
//   currencyMult / growthMult : 방치 수입에 곱함
// 새 계정 성장 축을 붙일 때도 여기 한 곳만 곱해주면 전 시스템에 반영된다.
export function accountMods(state) {
  const pr = state.prestige || 0;
  const income = 1 + pr * BALANCE.prestigeIncomeBonus;
  const rm = relicMods(state);
  const pm = petMods(state);
  const rn = rentalMods(state);
  const sm = summonMasteryPower(state); // 소환 숙련도(홀수 레벨 능력치 보상)
  const em = emblemMods(state); // 엠블럼(문장)
  const gd = guardianMods(state); // 정령/가디언
  return {
    powerMult: (1 + pr * BALANCE.prestigePowerBonus) * rm.power * pm.power * rn.power * sm * em.power * gd.power,
    currencyMult: income * rm.currency * pm.currency * rn.currency * em.currency * gd.currency,
    growthMult: income * rm.growth * pm.growth * em.growth * gd.growth,
  };
}
