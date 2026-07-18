// ─────────────────────────────────────────────────────────────
// 재료(Materials) — 던전에서 얻어 특정 성장에 쓰는 소모품.
//   · elemEssence(속성정수): 장비 속성 옵션 부여 — 속성 던전.
//   · petShard(펫조각): 등급별, 아무 펫에나 쓰는 조각 — 펫 던전.
// 지갑(wallet)과 분리된 별도 저장소(state.materials).
// (돌파석은 폐지 — 돌파는 소환석/동일 영웅 소모로 전환.)
// ─────────────────────────────────────────────────────────────

export const MATERIAL_META = {
  elemEssence: { label: '속성정수', emoji: '🔷' },
};
export const SHARD_META = { emoji: '🧩', label: '펫조각' };

export function ensureMaterials(state) {
  state.materials = state.materials || {};
  const m = state.materials;
  if (typeof m.elemEssence !== 'number') m.elemEssence = 0;
  m.petShard = m.petShard || {};
  for (const g of ['R', 'SR', 'SSR', 'UR']) if (typeof m.petShard[g] !== 'number') m.petShard[g] = 0;
  return m;
}

// 재료 지급. kind='petShard'면 sub(등급)에 누적.
export function addMaterial(state, kind, amount, sub = null) {
  const m = ensureMaterials(state);
  if (kind === 'petShard') m.petShard[sub] = (m.petShard[sub] || 0) + amount;
  else m[kind] = (m[kind] || 0) + amount;
}

export function materialCount(state, kind, sub = null) {
  const m = ensureMaterials(state);
  return kind === 'petShard' ? (m.petShard[sub] || 0) : (m[kind] || 0);
}

// 재료 소모(부족하면 false).
export function spendMaterial(state, kind, amount, sub = null) {
  const have = materialCount(state, kind, sub);
  if (have < amount) return false;
  const m = ensureMaterials(state);
  if (kind === 'petShard') m.petShard[sub] -= amount;
  else m[kind] -= amount;
  return true;
}
