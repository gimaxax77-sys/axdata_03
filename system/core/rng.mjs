// ─────────────────────────────────────────────────────────────
// 난수 — 가차처럼 확률이 필요한 곳에만 쓴다.
// Core의 나머지는 결정론적이므로, RNG는 "주입"한다.
// 시드를 주면 재현 가능 → 테스트/밸런싱에 유리.
// ─────────────────────────────────────────────────────────────

// mulberry32: 작고 빠른 시드 PRNG. [0,1) 반환.
export function makeRng(seed = 0x9e3779b9) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 가중치 목록에서 하나 고르기. entries: [{ weight, ...}, ...]
export function weightedPick(entries, rng) {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll < 0) return e;
  }
  return entries[entries.length - 1];
}
