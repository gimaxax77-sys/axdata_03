import { earn } from './economy.mjs';
import { levelUpCost } from './units.mjs';
import { skillUpCost, awakenCost } from './skills.mjs';
import { enhanceCost } from './enhance.mjs';
import { ascendCost } from './character.mjs';
import { GEAR_SLOTS } from './gear.mjs';

// ─────────────────────────────────────────────────────────────
// 100% 자원 환급(분해) — 신캐 육성 스트레스 제거(피로도 제로).
//   · 유닛에 투자한 성장/돌파/스킬/각인/각성 자원을 "전액" 반환한다.
//   · 장착 장비는 소실 없이 인벤토리로 회수(장비는 자체 인스턴스라 별도 자산).
//   · 최소 1명·파티원 보호: 마지막 유닛 또는 편성 중 유닛은 분해 불가.
// 재료 소모 없이 100% 회수 → "새 캐릭 뽑아도 부담 없다"는 신뢰를 준다.
// ─────────────────────────────────────────────────────────────

// 유닛에 누적 투자된 자원 총량을 재구성한다(비용식 역산 — 별도 원장 불필요).
export function invested(unit) {
  const bag = { growth: 0, currency: 0, summon: 0, gem: 0 };
  // 레벨업(growth): 1→현재 레벨까지 각 단계 비용 합.
  for (let L = 1; L < (unit.level || 1); L++) {
    bag.growth += levelUpCost({ level: L }).growth;
  }
  // 돌파(소환석): 랭크 1→현재까지 각 단계 비용 합(중복 소모로 돌파한 경우는 환급 대상 아님).
  for (let r = 1; r < (unit.rank || 1); r++) bag.summon += ascendCost({ rank: r }).summon;
  // 스킬 강화(growth): 각 스킬 레벨 1→현재.
  for (const s of unit.skills || []) {
    if (!s || !s.id) continue;
    for (let lv = 1; lv < (s.level || 1); lv++) bag.growth += skillUpCost(lv).growth;
  }
  // 각인(currency): 노드별 0→현재.
  for (const stat of Object.keys(unit.enhance || {})) {
    const cur = unit.enhance[stat] || 0;
    for (let c = 0; c < cur; c++) bag.currency += enhanceCost(c).currency;
  }
  // 시그니처 각성(summon+gem): 0→현재.
  for (let a = 0; a < (unit.sigAwaken || 0); a++) {
    const c = awakenCost(a);
    bag.summon += c.summon; bag.gem += c.gem;
  }
  return bag;
}

// 분해 미리보기(확인 다이얼로그용): 반환량 + 회수 장비 수.
export function dismantlePreview(state, uid) {
  const unit = (state.units || []).find((u) => u.uid === uid);
  if (!unit) return { ok: false, reason: '유닛 없음' };
  const refund = invested(unit);
  const gearBack = GEAR_SLOTS.filter((s) => unit.gear && unit.gear[s]).length;
  return { ok: true, refund, gearBack };
}

// 실제 분해 실행: 자원 환급 + 장비 회수 + 유닛 제거.
export function dismantleUnit(state, uid) {
  const units = state.units || [];
  if (units.length <= 1) return { ok: false, reason: '마지막 유닛은 분해 불가' };
  if ((state.party || []).includes(uid)) return { ok: false, reason: '편성 중인 유닛은 분해 불가(먼저 편성 해제)' };
  const unit = units.find((u) => u.uid === uid);
  if (!unit) return { ok: false, reason: '유닛 없음' };

  const refund = invested(unit);
  // 지갑 자원(growth/currency/summon/gem) 환급.
  earn(state.wallet, { growth: refund.growth, currency: refund.currency, summon: refund.summon, gem: refund.gem });
  // 장착 장비 인벤토리로 회수(소실 없음).
  let gearBack = 0;
  for (const slot of GEAR_SLOTS) {
    const item = unit.gear && unit.gear[slot];
    if (item) { state.inventory.push(item); unit.gear[slot] = null; gearBack += 1; }
  }
  // 유닛 제거 + 진형/아바타 등 참조 정리.
  state.units = units.filter((u) => u.uid !== uid);
  if (state.formation) delete state.formation[uid];
  if (state.profile && state.profile.avatarUid === uid) state.profile.avatarUid = null;

  return { ok: true, refund, gearBack };
}
