import { getArchetype } from './archetypes.mjs';
import { getSkill, skillPower } from './skills.mjs';
import { ENHANCE_NODES } from './enhance.mjs';
import { GEAR_SLOTS, gearContribution, gearSetBonus } from './gear.mjs';
import { intimacyBonus } from './intimacy.mjs';
import { sigWeaponContribution, sigWeaponBoost } from './sigweapon.mjs';
import { runeMainContribution, runeSetContribution } from './runes.mjs';
import { seedStatPct } from './seed.mjs';

// ─────────────────────────────────────────────────────────────
// 모디파이어 파이프라인 — 한 유닛의 "모든 성장 요소"를 하나로 합산.
// 소스: 원형(archetype) · 장착 스킬 · 강화(각인)
// 이 합산 결과를 stats(스탯 계산)와 resolution(판정)이 함께 쓴다.
//
// 반환 형태:
//   statPct   : { atk, hp, def, spd }  자기 스탯 % 가산
//   effect    : { critChance, critDamage, lifesteal, defPierce }
//   teamBuff  : { atk }                팀 전체 버프
// ─────────────────────────────────────────────────────────────

function emptyMods() {
  return {
    statPct: { atk: 0, hp: 0, def: 0, spd: 0 },
    statFlat: { atk: 0, hp: 0, def: 0, spd: 0 },
    effect: { critChance: 0, critDamage: 0, lifesteal: 0, defPierce: 0, dmgReduce: 0, evasion: 0, accuracy: 0, trueDamage: 0, absDef: 0 },
    // 팀버프 3종: atk(공격)·def(피해경감)·critChance(치명) — 지원형 정체성 분화.
    teamBuff: { atk: 0, def: 0, critChance: 0 },
  };
}

// 팀버프 소스(atk/def/critChance)를 배수 반영해 합산.
function addTeamBuff(mods, tb, scale = 1) {
  if (!tb) return;
  for (const k of Object.keys(mods.teamBuff)) {
    if (tb[k]) mods.teamBuff[k] += tb[k] * scale;
  }
}

function addStatPct(mods, src, scale = 1) {
  if (!src) return;
  for (const k of Object.keys(mods.statPct)) {
    if (src[k]) mods.statPct[k] += src[k] * scale;
  }
}
function addStatFlat(mods, src) {
  if (!src) return;
  for (const k of Object.keys(mods.statFlat)) {
    if (src[k]) mods.statFlat[k] += src[k];
  }
}
function addEffect(mods, src, scale = 1) {
  if (!src) return;
  for (const k of Object.keys(mods.effect)) {
    if (src[k]) mods.effect[k] += src[k] * scale;
  }
}

// 한 유닛의 전체 모디파이어를 계산한다.
export function collectUnitModifiers(unit) {
  const mods = emptyMods();

  // 1) 원형 고유 팀 버프 (예: SUPPORT의 팀 ATK +15%)
  const arch = getArchetype(unit.archetype);
  if (arch.teamBuff && arch.teamBuff.stat === 'atk') {
    mods.teamBuff.atk += arch.teamBuff.mult;
  }

  // 1-b) 전용(시그니처) 스킬 — 항상 발동, 랭크에 비례해 강해짐(정체성=성장)
  //      전용무기 보유 시 시그니처 강도가 증폭되고, 각성 시 2차 효과가 열린다.
  if (unit.signature) {
    const sig = getSkill(unit.signature);
    const scale = skillPower(unit.rank) * (1 + sigWeaponBoost(unit));
    addStatPct(mods, sig.statPct, scale);
    addEffect(mods, sig.effect, scale);
    addTeamBuff(mods, sig.teamBuff, scale);
    // 각성: 2차 효과 (각성 레벨 비례)
    const aw = unit.sigAwaken || 0;
    if (aw && sig.awaken) {
      addStatPct(mods, sig.awaken.statPct, aw);
      addEffect(mods, sig.awaken.effect, aw);
      addTeamBuff(mods, sig.awaken.teamBuff, aw);
    }
  }

  // 2) 장착 스킬 (슬롯별, 스킬 레벨에 비례)
  for (const slot of unit.skills || []) {
    if (!slot || !slot.id) continue;
    const skill = getSkill(slot.id);
    const scale = skillPower(slot.level || 1);
    addStatPct(mods, skill.statPct, scale);
    addEffect(mods, skill.effect, scale);
    addTeamBuff(mods, skill.teamBuff, scale);
  }

  // 3) 강화(각인) — 노드 레벨 × 노드당 증가값
  const enh = unit.enhance || {};
  for (const [stat, lvl] of Object.entries(enh)) {
    if (!lvl) continue;
    const node = ENHANCE_NODES[stat];
    if (!node) continue;
    if (node.kind === 'statPct') mods.statPct[node.stat] += node.per * lvl;
    else if (node.kind === 'effect') mods.effect[node.stat] += node.per * lvl;
  }

  // 3-b) 친밀도 — 레벨당 전 스탯 % 보너스
  const ib = intimacyBonus(unit);
  if (ib) for (const k of Object.keys(mods.statPct)) mods.statPct[k] += ib;

  // (코스튬은 순수 외형으로 전환 — 능력치 기여 없음. 레거시 costumeBonus 미적용)

  // 4) 장착 장비 — flat 스탯 + 전투 효과
  const gear = unit.gear || {};
  for (const slot of GEAR_SLOTS) {
    const item = gear[slot];
    if (!item) continue;
    const c = gearContribution(item);
    addStatFlat(mods, c.flat);
    addStatPct(mods, c.statPct); // 부옵션 statPct
    addEffect(mods, c.effect);
  }
  // 4-b) 장비 세트 보너스 — 같은 세트 2/3피스 착용 시 추가 statPct/효과.
  const gs = gearSetBonus(unit);
  addStatPct(mods, gs.statPct);
  addEffect(mods, gs.effect);

  // 5) 전용무기 — 별도 슬롯(일반 장비와 무관)의 flat + 효과
  const sw = sigWeaponContribution(unit);
  if (sw) { addStatFlat(mods, sw.flat); addEffect(mods, sw.effect); }

  // 6) 룬 — 메인스탯 + 세트 보너스
  const rm = runeMainContribution(unit.runes);
  addStatPct(mods, rm.statPct);
  addEffect(mods, rm.effect);
  const rs = runeSetContribution(unit.runes);
  addStatPct(mods, rs.statPct);
  addEffect(mods, rs.effect);

  // 7) 씨앗 — 서사 발현(등급별 보정, 달성 조건분 statPct)
  addStatPct(mods, seedStatPct(unit));

  return mods;
}
