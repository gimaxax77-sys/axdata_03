import { pruneFormation } from './formation.mjs';

// ─────────────────────────────────────────────────────────────
// 편성 프리셋 — 파티 구성(멤버 + 진형)을 슬롯 1~5에 저장/불러오기.
//   · 계정 로컬 저장(세이브에 포함). 유닛 uid를 그대로 참조하므로
//     같은 계정 안에서만 유효 — 분해된 유닛은 불러오기 시 자동 제외.
//   · 스테이지(방치)/보스(경쟁) 등 상황별로 덱을 빠르게 전환하는 용도.
// ─────────────────────────────────────────────────────────────

export const PRESET_SLOTS = 5;

function ensure(state) {
  state.formationPresets = state.formationPresets || {};
  return state.formationPresets;
}

// 현재 파티+진형을 슬롯에 저장(덮어쓰기).
export function savePreset(state, slot) {
  if (slot < 1 || slot > PRESET_SLOTS) return { ok: false, reason: '잘못된 슬롯' };
  if (!state.party || !state.party.length) return { ok: false, reason: '편성된 유닛이 없습니다' };
  const presets = ensure(state);
  presets[slot] = {
    party: [...state.party],
    formation: { ...(state.formation || {}) },
    savedAt: Date.now(),
  };
  return { ok: true, slot, count: state.party.length };
}

// 슬롯의 파티+진형을 현재 편성에 적용. 더 이상 보유하지 않은 유닛은 제외.
export function loadPreset(state, slot) {
  const presets = ensure(state);
  const p = presets[slot];
  if (!p) return { ok: false, reason: '저장된 편성이 없습니다' };
  const owned = new Set((state.units || []).map((u) => u.uid));
  const party = p.party.filter((uid) => owned.has(uid));
  if (!party.length) return { ok: false, reason: '저장된 유닛을 더 이상 보유하지 않습니다' };
  state.party = party;
  const formation = {};
  for (const uid of party) if (p.formation[uid]) formation[uid] = p.formation[uid];
  state.formation = formation;
  pruneFormation(state);
  const missing = p.party.length - party.length;
  return { ok: true, slot, applied: party.length, missing };
}

// 슬롯 현황(UI 표시용) — 저장 여부·인원·저장 시각.
export function presetInfo(state, slot) {
  const presets = ensure(state);
  const p = presets[slot];
  if (!p) return { slot, exists: false };
  return { slot, exists: true, count: p.party.length, savedAt: p.savedAt };
}

export function listPresetInfo(state) {
  const out = [];
  for (let i = 1; i <= PRESET_SLOTS; i++) out.push(presetInfo(state, i));
  return out;
}

export function clearPreset(state, slot) {
  const presets = ensure(state);
  delete presets[slot];
  return { ok: true, slot };
}
