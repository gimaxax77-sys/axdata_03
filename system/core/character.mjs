import { spend } from './economy.mjs';
import { levelUpCost, levelCap } from './units.mjs';
import { getSkill, skillSlots, skillUpCost, AWAKEN_MAX, awakenCost } from './skills.mjs';
import { getEnhanceNode, enhanceCost, ENHANCE_CAP } from './enhance.mjs';
import { availableDupes } from './starGrade.mjs';

// ─────────────────────────────────────────────────────────────
// 캐릭터 성장 액션 — 장르 무관(RPG도 방치형도 캐릭터를 키운다).
// 상태(state.wallet)에서 자원을 소모하고 유닛을 강하게 만든다.
// 모든 액션은 { ok, ... } 를 반환한다.
// ─────────────────────────────────────────────────────────────

function findUnit(state, uid) {
  const u = state.units.find((x) => x.uid === uid);
  if (!u) throw new Error(`유닛 없음: ${uid}`);
  return u;
}

// ── 레벨업 ────────────────────────────────────────────────────
export function levelUp(state, uid) {
  const unit = findUnit(state, uid);
  if (unit.level >= levelCap(unit)) {
    return { ok: false, reason: `레벨 상한 ${levelCap(unit)} (돌파 필요)` };
  }
  const cost = levelUpCost(unit);
  if (!spend(state.wallet, cost)) return { ok: false, reason: '성장 재료 부족', cost };
  unit.level += 1;
  return { ok: true, level: unit.level, cost };
}

// ── 돌파(랭크업) : 레벨 상한을 열고 스킬 슬롯을 늘린다 ──────────
// 소환석을 우선 소모(랭크가 오를수록 요구량이 우상향), 부족하면 동일
// 영웅 중복 1명 소모로 대체(장비·룬은 회수, 성급 강화용 중복 풀과 공유).
export function ascendCost(unit) { const r = unit.rank || 1; return { summon: 20 * r * r }; }
export function ascend(state, uid) {
  const unit = findUnit(state, uid);
  const cost = ascendCost(unit);
  if (spend(state.wallet, cost)) {
    unit.rank += 1;
    return { ok: true, rank: unit.rank, used: 'summon', cost, newCap: levelCap(unit), slots: skillSlots(unit) };
  }
  // 소환석 부족 → 동일 영웅 중복 1명 소모로 대체
  const dupe = availableDupes(state, unit)[0];
  if (!dupe) return { ok: false, reason: '소환석 부족 · 동일 영웅 중복 없음', cost };
  state.inventory = state.inventory || [];
  state.runeBag = state.runeBag || [];
  for (const slot of Object.keys(dupe.gear || {})) { const it = dupe.gear[slot]; if (it) state.inventory.push(it); }
  for (const r of (dupe.runes || [])) { if (r) state.runeBag.push(r); }
  if (state.profile && state.profile.avatarUid === dupe.uid) state.profile.avatarUid = null;
  state.units = state.units.filter((u) => u.uid !== dupe.uid);
  unit.rank += 1;
  return { ok: true, rank: unit.rank, used: 'dupe', consumedUid: dupe.uid, newCap: levelCap(unit), slots: skillSlots(unit) };
}

// ── 스킬 장착 ─────────────────────────────────────────────────
export function equipSkill(state, uid, slotIndex, skillId) {
  const unit = findUnit(state, uid);
  getSkill(skillId); // 검증
  if (slotIndex < 0 || slotIndex >= skillSlots(unit)) {
    return { ok: false, reason: `슬롯 ${slotIndex} 잠김 (현재 ${skillSlots(unit)}개, 돌파 필요)` };
  }
  // 같은 스킬 중복 장착 방지
  const dup = unit.skills.some((s, i) => s && s.id === skillId && i !== slotIndex);
  if (dup) return { ok: false, reason: '이미 장착된 스킬' };
  unit.skills[slotIndex] = { id: skillId, level: unit.skills[slotIndex]?.id === skillId ? unit.skills[slotIndex].level : 1 };
  return { ok: true, slot: slotIndex, skill: skillId };
}

export function unequipSkill(state, uid, slotIndex) {
  const unit = findUnit(state, uid);
  unit.skills[slotIndex] = null;
  return { ok: true };
}

// ── 스킬 강화(레벨업) ─────────────────────────────────────────
export function upgradeSkill(state, uid, slotIndex) {
  const unit = findUnit(state, uid);
  const slot = unit.skills[slotIndex];
  if (!slot || !slot.id) return { ok: false, reason: '빈 슬롯' };
  const cost = skillUpCost(slot.level);
  if (!spend(state.wallet, cost)) return { ok: false, reason: '스킬 강화 재료 부족', cost };
  slot.level += 1;
  return { ok: true, skill: slot.id, level: slot.level, cost };
}

// ── 시그니처 각성 : 고유 스킬에 2차 효과를 연다 ────────────────
export function awakenSignature(state, uid) {
  const unit = findUnit(state, uid);
  if (!unit.signature) return { ok: false, reason: '고유 스킬 없음' };
  const cur = unit.sigAwaken || 0;
  if (cur >= AWAKEN_MAX) return { ok: false, reason: `각성 상한 ${AWAKEN_MAX}` };
  const cost = awakenCost(cur);
  if (!spend(state.wallet, cost)) return { ok: false, reason: '각성 재료 부족', cost };
  unit.sigAwaken = cur + 1;
  return { ok: true, level: unit.sigAwaken, cost };
}

// ── 강화(각인) : 특정 스탯에 집중 투자 ────────────────────────
export function enhanceNode(state, uid, stat) {
  const unit = findUnit(state, uid);
  getEnhanceNode(stat); // 검증
  const cur = unit.enhance[stat] || 0;
  if (cur >= ENHANCE_CAP) return { ok: false, reason: `강화 상한 ${ENHANCE_CAP}` };
  const cost = enhanceCost(cur);
  if (!spend(state.wallet, cost)) return { ok: false, reason: '강화 재료 부족', cost };
  unit.enhance[stat] = cur + 1;
  return { ok: true, stat, level: unit.enhance[stat], cost };
}
