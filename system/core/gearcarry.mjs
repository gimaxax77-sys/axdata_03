import { GEAR_SLOTS } from './gear.mjs';
import { setFormation, unitRole } from './formation.mjs';

// ─────────────────────────────────────────────────────────────
// 장비 전승 — "슬롯(자리) 기반 장비"의 실사용 효용을 안전하게 제공.
//   트렌드 의도: 캐릭터를 교체해도 장비를 다시 빼고 낄 필요가 없어야 한다.
//   데이터 모델(unit.gear)은 그대로 두고, "자리 교체 시 장비를 승계"하는
//   편의 액션으로 동일 효용을 낸다(전투 엔진·세이브 무변경 → 저위험).
// ─────────────────────────────────────────────────────────────

function findUnit(state, uid) { return (state.units || []).find((u) => u.uid === uid); }

// 나가는 유닛의 장착 장비를 들어오는 유닛으로 이전.
//   들어오는 유닛의 기존 장비는 소실 없이 인벤토리로 회수한다.
export function inheritGear(state, fromUid, toUid) {
  const from = findUnit(state, fromUid);
  const to = findUnit(state, toUid);
  if (!from || !to) return { ok: false, reason: '유닛 없음' };
  if (fromUid === toUid) return { ok: false, reason: '같은 유닛' };
  let moved = 0;
  for (const slot of GEAR_SLOTS) {
    const item = from.gear ? from.gear[slot] : null;
    if (!item) continue;
    const displaced = to.gear[slot];
    if (displaced) state.inventory.push(displaced); // 기존 장비 회수(소실 없음)
    to.gear[slot] = item;
    from.gear[slot] = null;
    moved += 1;
  }
  return { ok: true, moved };
}

// 파티 자리 교체 — out을 in으로 같은 인덱스에서 교체하고,
//   진형 역할과 장비를 그대로 승계(재장착 노동 제거).
//   carryGear=false면 진형만 승계.
export function swapPartyMember(state, outUid, inUid, { carryGear = true } = {}) {
  const idx = (state.party || []).indexOf(outUid);
  if (idx === -1) return { ok: false, reason: '편성되지 않은 유닛(out)' };
  if (state.party.includes(inUid)) return { ok: false, reason: '이미 편성된 유닛(in)' };
  if (!findUnit(state, inUid)) return { ok: false, reason: '보유하지 않은 유닛(in)' };
  const role = unitRole(state, outUid);
  let moved = 0;
  if (carryGear) moved = (inheritGear(state, outUid, inUid).moved) || 0;
  // 자리 교체.
  state.party[idx] = inUid;
  // 진형 역할 승계 후 out 참조 정리.
  if (state.formation) delete state.formation[outUid];
  setFormation(state, inUid, role);
  return { ok: true, index: idx, role, gearMoved: moved };
}
