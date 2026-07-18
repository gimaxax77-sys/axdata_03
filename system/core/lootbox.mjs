import { earn } from './economy.mjs';
import { dropGear } from './gear.mjs';
import { dropRune } from './runes.mjs';

// ─────────────────────────────────────────────────────────────
// 전리품 상자 — 환생 보상. 이번 회차 도달(maxStage) 비례로 굴린다.
//   · 드롭 수 = 2 + floor(peak/40), 상위등급 luck = peak/200.
//   · 장비/룬(실 아이템) + 다이아/소환권을 가중 롤 → 환생에 "뽑는 맛".
// 반환: { rolls, gear, rune, gem, summon } (연출/요약용).
// ─────────────────────────────────────────────────────────────
export function openPrestigeBox(state, peakStage, rng = Math.random) {
  const peak = Math.max(1, peakStage || 1);
  const luck = Math.min(1, peak / 200);
  const rolls = 2 + Math.floor(peak / 40);
  const out = { rolls, gear: 0, rune: 0, gem: 0, summon: 0 };
  for (let i = 0; i < rolls; i++) {
    const r = rng();
    if (r < 0.35) { dropGear(state, rng, luck); out.gear++; }
    else if (r < 0.60) { dropRune(state, rng, luck); out.rune++; }
    else if (r < 0.85) { const g = 5 + Math.floor(peak / 10); earn(state.wallet, { gem: g }); out.gem += g; }
    else { const s = 10 + Math.floor(peak / 8); earn(state.wallet, { summon: s }); out.summon += s; }
  }
  return out;
}
