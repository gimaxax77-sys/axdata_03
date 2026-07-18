import { spend, earn } from './economy.mjs';
import { dropGear, GEAR_CATALOG } from './gear.mjs';
import { dropRune } from './runes.mjs';
import { summonCostumePool, grantCostume } from './costumes.mjs';

// ─────────────────────────────────────────────────────────────
// 통합 소환 — 영웅 외 자원도 "뽑기"로 제공하는 파밍 경로.
//   · 장비 소환 : 랜덤 장비 → 인벤토리 (dropGear 재사용)
//   · 룬 소환   : 랜덤 룬 → 룬 가방   (dropRune 재사용)
//   · 코스튬 소환: 미보유 프로필 외형(프레임/칭호) 지급, 전부 보유 시 환급
// 진행도(peakStage)가 상위 등급 확률(luck)을 끌어올린다(던전과 동일 규약).
// 펫 소환은 pets.mjs(petSummon), 영웅 소환은 gacha.mjs가 담당.
// ─────────────────────────────────────────────────────────────

export const GEAR_PULL_COST = { gem: 20 };
export const RUNE_PULL_COST = { gem: 20 };
export const COSTUME_PULL_COST = { gem: 50 };
export const COSTUME_DUP_REFUND = { gem: 25 };

function luckOf(state) {
  return Math.min(1, (state.peakStage || 1) / 200);
}

export function summonGear(state, rng = Math.random) {
  if (!spend(state.wallet, GEAR_PULL_COST)) return { ok: false, reason: '다이아 부족', cost: GEAR_PULL_COST };
  const r = dropGear(state, rng, luckOf(state));
  return { ok: true, kind: 'gear', item: r.item, rarity: r.rarity, label: GEAR_CATALOG[r.item.blueprint].label };
}

export function summonRune(state, rng = Math.random) {
  if (!spend(state.wallet, RUNE_PULL_COST)) return { ok: false, reason: '다이아 부족', cost: RUNE_PULL_COST };
  const r = dropRune(state, rng, luckOf(state));
  return { ok: true, kind: 'rune', rune: r.rune, rarity: r.rarity };
}

// 코스튬(캐릭터 스킨) 소환 — 미보유 소환 코스튬 무작위 지급. 전부 보유 시 다이아 일부 환급.
export function summonCosmetic(state, rng = Math.random) {
  if (!spend(state.wallet, COSTUME_PULL_COST)) return { ok: false, reason: '다이아 부족', cost: COSTUME_PULL_COST };
  const pool = summonCostumePool(state);
  if (!pool.length) {
    earn(state.wallet, COSTUME_DUP_REFUND);
    return { ok: true, kind: 'costume', duplicate: true, refund: COSTUME_DUP_REFUND };
  }
  const pick = pool[Math.floor(rng() * pool.length)];
  grantCostume(state, pick.id);
  return { ok: true, kind: 'costume', item: { id: pick.id, label: pick.label, emoji: pick.emoji, rarity: pick.rarity } };
}
