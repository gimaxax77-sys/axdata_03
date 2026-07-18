// ─────────────────────────────────────────────────────────────
// 강화(각인) 시스템 — 특정 스탯에 "집중 투자"해 같은 유닛을 특화한다.
// 레벨업이 균일 성장이라면, 강화는 방향성 있는 성장이다.
//   같은 캐릭터라도 ATK 강화형(글래스캐논) vs HP 강화형(탱커)로 갈린다.
//
// 노드별로 레벨을 올리며, 노드마다 오르는 값이 다르다.
// 비용은 소프트 재화(currency)를 쓴다 → 레벨업(growth)과 자원 분리.
// ─────────────────────────────────────────────────────────────

import { BALANCE } from './balance.mjs';

export const ENHANCE_NODES = {
  atk: { kind: 'statPct', stat: 'atk', per: 0.04, label: '공격 각인' },
  hp: { kind: 'statPct', stat: 'hp', per: 0.04, label: '체력 각인' },
  def: { kind: 'statPct', stat: 'def', per: 0.05, label: '방어 각인' },
  crit: { kind: 'effect', stat: 'critChance', per: 0.02, label: '치명 각인' },
};

export const ENHANCE_CAP = 10; // 노드당 최대 강화 레벨

export function getEnhanceNode(stat) {
  const n = ENHANCE_NODES[stat];
  if (!n) throw new Error(`알 수 없는 강화 노드: ${stat}`);
  return n;
}

// 다음 강화 비용(currency). 레벨이 오를수록 급증.
export function enhanceCost(currentLevel) {
  return {
    currency: Math.round(
      BALANCE.enhanceCostBase * Math.pow(BALANCE.enhanceCostGrowth, currentLevel)
    ),
  };
}

// 유닛의 빈 강화 상태 생성.
export function createEnhance() {
  return { atk: 0, hp: 0, def: 0, crit: 0 };
}
