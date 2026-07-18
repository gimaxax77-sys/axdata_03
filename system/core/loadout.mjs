import { equippableSkills, skillSlots } from './skills.mjs';
import { GEAR_SLOTS, GEAR_CATALOG, equipGear, craftGear, gearCraftCost } from './gear.mjs';
import { RUNE_SLOTS, runeMainValue, equipRune } from './runes.mjs';
import { equipSkill } from './character.mjs';
import { computePower } from './stats.mjs';

// ─────────────────────────────────────────────────────────────
// 추천 빌드 — 보유 자원 중 최적 조합을 한 번에 장착하는 QoL.
//   · 비파괴적: 빈 스킬 슬롯만 채우고(기존 선택·레벨 보존),
//     장비·룬은 "보유분 중 더 나은 것"으로만 교체(밀려난 것은 회수).
//   · 원형별 가중치로 딜러/탱커/서포터에 맞는 스킬을 고른다.
// ─────────────────────────────────────────────────────────────

const ROLE_W = {
  VANGUARD: { atk: 0.7, hp: 1.1, def: 1.1, spd: 0.6, effect: 0.8, team: 1.0 },
  STRIKER: { atk: 1.2, hp: 0.4, def: 0.4, spd: 0.9, effect: 1.0, team: 1.0 },
  SUPPORT: { atk: 0.6, hp: 0.9, def: 0.8, spd: 0.7, effect: 0.9, team: 1.4 },
  ROGUE: { atk: 1.1, hp: 0.4, def: 0.3, spd: 1.2, effect: 1.1, team: 1.0 },
  ARCHER: { atk: 1.0, hp: 0.5, def: 0.5, spd: 0.9, effect: 1.0, team: 1.0 },
  MAGE: { atk: 1.3, hp: 0.3, def: 0.3, spd: 0.7, effect: 1.0, team: 1.0 },
};
function weights(unit) { return ROLE_W[unit.archetype] || ROLE_W.STRIKER; }

function effectSum(e = {}) {
  return (e.critChance || 0) + (e.critDamage || 0) + (e.lifesteal || 0) + (e.defPierce || 0) + (e.dmgReduce || 0);
}
function skillScore(skill, w) {
  const p = skill.statPct || {};
  const tb = skill.teamBuff || {};
  const team = (tb.atk || 0) + (tb.def || 0) + (tb.critChance || 0);
  return (p.atk || 0) * w.atk + (p.hp || 0) * w.hp + (p.def || 0) * w.def + (p.spd || 0) * w.spd
    + effectSum(skill.effect) * w.effect + team * w.team;
}
// 장비 후보를 슬롯에 임시 장착했을 때의 실제 전투력(computePower) — 휴리스틱이
// 아니라 진짜 파워로 비교하므로 "더 강한 장비"를 항상 정확히 고른다.
function powerWithGear(unit, slot, item) {
  const prev = unit.gear[slot];
  unit.gear[slot] = item || null;
  const p = computePower(unit);
  unit.gear[slot] = prev; // 원복 (실제 장착은 equipGear가 담당)
  return p;
}

// 한 유닛의 스킬·장비·룬을 추천값으로 장착. { ok, changed:{skills,gear,runes} }.
//   scope: 'all'(기본) | 'skill' | 'gear'(장비+룬) — 카드별 부분 최적화 지원.
export function optimizeLoadout(state, unitUid, scope = 'all') {
  const unit = state.units.find((u) => u.uid === unitUid);
  if (!unit) return { ok: false, reason: '유닛 없음' };
  const w = weights(unit);
  const changed = { skills: 0, gear: 0, runes: 0 };
  const doSkill = scope === 'all' || scope === 'skill';
  const doGear = scope === 'all' || scope === 'gear';

  // 1) 스킬 — 빈 슬롯만 최고 점수의 미장착 스킬로 채운다(기존 슬롯·레벨 보존).
  if (doSkill) {
    const slots = skillSlots(unit);
    const used = new Set((unit.skills || []).filter(Boolean).map((s) => s.id));
    const ranked = equippableSkills()
      .filter((s) => !used.has(s.id))
      .sort((a, b) => skillScore(b, w) - skillScore(a, w));
    let ri = 0;
    for (let i = 0; i < slots; i++) {
      if (unit.skills[i]) continue;
      const s = ranked[ri++];
      if (!s) break;
      if (equipSkill(state, unitUid, i, s.id).ok) changed.skills++;
    }
  }

  if (!doGear) return { ok: true, changed };

  // 2) 장비 — 슬롯별로 실제 전투력 기준 최적 선택:
  //    (a) 인벤토리 후보 중 파워를 가장 높이는 것이 장착품보다 강하면 교체,
  //    (b) 아니면 감당 가능한 상위 설계도의 신규 아이템이 더 강하면 제작·장착.
  //    → 빈 슬롯 채움 + 낀 슬롯 업그레이드. 진짜 파워로 비교(휴리스틱 아님).
  for (const slot of GEAR_SLOTS) {
    const equipped = unit.gear[slot];
    const eqPow = powerWithGear(unit, slot, equipped); // 현재(또는 빈 슬롯) 파워
    // (a) 인벤토리 최고 파워 후보
    const cands = state.inventory.filter((g) => g.slot === slot);
    let best = null, bestPow = eqPow;
    for (const cand of cands) {
      const pow = powerWithGear(unit, slot, cand);
      if (pow > bestPow) { bestPow = pow; best = cand; }
    }
    if (best) {
      if (equipGear(state, unitUid, best.uid).ok) { changed.gear++; continue; }
    }
    // (b) 제작 업그레이드: 감당 가능한 상위 티어 신규 아이템이 더 강하면 제작.
    const eqCost = equipped ? (GEAR_CATALOG[equipped.blueprint].craftCost || 150) : 0;
    const affordable = Object.values(GEAR_CATALOG)
      .filter((b) => b.slot === slot && (state.wallet.currency || 0) >= gearCraftCost(b.id).currency);
    if (affordable.length) {
      const bp = affordable.reduce((a, b) => ((b.craftCost || 150) > (a.craftCost || 150) ? b : a));
      const mock = { blueprint: bp.id, level: 1, rarity: 'R', subs: [] };
      // 상위 티어이고 신규 아이템 파워가 장착품보다 클 때만(다운그레이드·낭비 방지).
      if ((bp.craftCost || 150) > eqCost && powerWithGear(unit, slot, mock) > eqPow) {
        const c = craftGear(state, bp.id);
        if (c.ok && equipGear(state, unitUid, c.item.uid).ok) changed.gear++;
      }
    }
  }

  // 3) 룬 — 슬롯별 가방 최고 메인값이 장착품보다 크면 교체.
  for (let i = 0; i < RUNE_SLOTS; i++) {
    const bag = state.runeBag || [];
    if (!bag.length) continue;
    const best = bag.reduce((a, b) => (runeMainValue(b) > runeMainValue(a) ? b : a));
    const equipped = (unit.runes || [])[i];
    if (!equipped || runeMainValue(best) > runeMainValue(equipped)) {
      if (equipRune(state, unitUid, i, best.uid).ok) changed.runes++;
    }
  }

  return { ok: true, changed };
}
