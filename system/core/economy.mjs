// ─────────────────────────────────────────────────────────────
// 자원/경제 — 장르/컨셉 무관.
// 자원은 추상 키로만 다룬다:
//   currency : 소프트 재화 (컨셉에서 골드/크레딧 등으로 표시)
//   growth   : 성장 재료 (레벨업에 소모)
//   summon   : 소환 재화 (신규 유닛 획득)
//   gem      : 프리미엄 재화 (BM/상점 — 다이아 등)
// ─────────────────────────────────────────────────────────────

export function createWallet(init = {}) {
  return { currency: 0, growth: 0, summon: 0, gem: 0, ...init };
}

export function earn(wallet, gains) {
  for (const [k, v] of Object.entries(gains)) {
    wallet[k] = (wallet[k] || 0) + v;
  }
  return wallet;
}

// 비용을 지불할 수 있으면 차감하고 true, 아니면 false.
export function spend(wallet, cost) {
  for (const [k, v] of Object.entries(cost)) {
    if ((wallet[k] || 0) < v) return false;
  }
  for (const [k, v] of Object.entries(cost)) {
    wallet[k] -= v;
  }
  return true;
}
