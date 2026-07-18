// 낮은 등급 장비 자동 분해 — 인벤토리에 쌓인 하급 드롭을 재화로 정리(피로도 제로).
//   보호 규칙: 강화·인챈트한 장비와 임계 초과 등급은 대상에서 제외(투자분 보존).
//   장착 중인 장비는 인벤토리에 없으므로 자연히 안전하다.
import { earn } from './economy.mjs';

const RANK = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };
// 등급별 분해 환급(소프트 재화). 상급일수록 값이 크지만 자동 대상은 보통 N/R.
export const SALVAGE_VALUE = { N: 20, R: 50, SR: 120, SSR: 300, UR: 800 };

// 자동 분해 대상: 등급이 임계 이하 & 강화(레벨1) 안 하고 인챈트 없는 순수 드롭.
export function salvageTargets(state, maxRarity) {
  const cap = RANK[maxRarity];
  if (cap == null) return [];
  return (state.inventory || []).filter(
    (it) => it.rarity && RANK[it.rarity] <= cap && (it.level || 1) === 1 && !it.enchant,
  );
}

// 임계 이하 하급 장비를 일괄 분해하고 재화를 환급한다.
export function autoSalvage(state, maxRarity) {
  const targets = salvageTargets(state, maxRarity);
  if (!targets.length) return { ok: false, removed: 0, refund: {} };
  const uids = new Set(targets.map((t) => t.uid));
  let currency = 0;
  for (const it of targets) currency += SALVAGE_VALUE[it.rarity] || 0;
  state.inventory = (state.inventory || []).filter((it) => !uids.has(it.uid));
  const refund = { currency };
  earn(state.wallet, refund);
  return { ok: true, removed: targets.length, refund };
}
