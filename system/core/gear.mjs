import { spend } from './economy.mjs';
import { BALANCE } from './balance.mjs';
import { weightedPick } from './rng.mjs';
import { spendMaterial } from './materials.mjs';

// ─────────────────────────────────────────────────────────────
// 장비 시스템 — 슬롯별 장착 + 강화로 유닛을 추가 성장시킨다.
//   강화(각인)가 "본체 스탯 %투자"라면, 장비는 "착용형 flat 스탯 + 효과".
//   장비도 modifiers 파이프라인의 한 소스로 합산된다.
//
// 슬롯: weapon(공격) · armor(생존) · accessory(효과/속도)
// 장비 인스턴스는 unit.gear[slot] 또는 state.inventory 에 존재한다.
// ─────────────────────────────────────────────────────────────

// 장비 슬롯 — 3계열(무기/방어구/장신구) + 탈것. 계열은 세트/UI 그룹핑에 쓴다.
//   ⚠ 슬롯 id는 세이브에 박히므로 기존 weapon/armor/accessory는 그대로 유지(하위호환).
export const GEAR_SLOTS = [
  'weapon', 'offhand',                         // 무기
  'helmet', 'armor', 'gloves', 'pants',        // 방어구
  'necklace', 'earring', 'accessory', 'cloak', // 장신구
  'mount',                                     // 탈것
];

// 슬롯 표시 메타 (라벨·이모지·계열). UI/드롭 요약 공용.
export const SLOT_META = {
  weapon: { label: '무기', emoji: '⚔️', cat: 'weapon' },
  offhand: { label: '보조무기', emoji: '🛡️', cat: 'weapon' },
  helmet: { label: '투구', emoji: '🪖', cat: 'armor' },
  armor: { label: '갑옷', emoji: '🥋', cat: 'armor' },
  gloves: { label: '장갑', emoji: '🧤', cat: 'armor' },
  pants: { label: '바지', emoji: '👖', cat: 'armor' },
  necklace: { label: '목걸이', emoji: '📿', cat: 'accessory' },
  earring: { label: '귀걸이', emoji: '💠', cat: 'accessory' },
  accessory: { label: '반지', emoji: '💍', cat: 'accessory' },
  cloak: { label: '망토', emoji: '🦋', cat: 'accessory' },
  mount: { label: '탈것', emoji: '🐎', cat: 'mount' },
};

// 빈 장비 세트(전 슬롯 null) — 유닛 생성/세이브 보정 공용(슬롯 목록 단일 소스).
export function emptyGearSet() {
  return Object.fromEntries(GEAR_SLOTS.map((s) => [s, null]));
}

// 장비 설계도(blueprint). flat=고정 스탯, effect=전투 효과.
export const GEAR_CATALOG = {
  // ── 무기(주) : 종류별 개성 — 검/단검/활/도끼/양손검 ──
  IRON_SWORD: { id: 'IRON_SWORD', slot: 'weapon', label: '강철검', flat: { atk: 120 } },
  RUNE_BLADE: { id: 'RUNE_BLADE', slot: 'weapon', label: '룬블레이드', flat: { atk: 90 }, effect: { critChance: 0.08 } },
  DAGGER: { id: 'DAGGER', slot: 'weapon', label: '단검', flat: { atk: 70, spd: 45 }, effect: { critChance: 0.06 } },
  BOW: { id: 'BOW', slot: 'weapon', label: '장궁', flat: { atk: 110, spd: 15 }, effect: { critDamage: 0.15 } },
  AXE: { id: 'AXE', slot: 'weapon', label: '전투도끼', flat: { atk: 155 }, effect: { defPierce: 0.1 } },
  GREATSWORD: { id: 'GREATSWORD', slot: 'weapon', label: '양손대검', flat: { atk: 200 }, craftCost: 300 },
  // ── 보조무기 : 방패/마도서 ──
  TOWER_SHIELD: { id: 'TOWER_SHIELD', slot: 'offhand', label: '타워실드', flat: { hp: 500, def: 45 }, effect: { dmgReduce: 0.05 } },
  ARCANE_TOME: { id: 'ARCANE_TOME', slot: 'offhand', label: '비전서', flat: { atk: 55, spd: 15 }, effect: { critChance: 0.06 } },
  // ── 방어구 : 투구/갑옷/장갑/바지 ──
  IRON_HELM: { id: 'IRON_HELM', slot: 'helmet', label: '강철투구', flat: { hp: 420, def: 32 } },
  PLATE_ARMOR: { id: 'PLATE_ARMOR', slot: 'armor', label: '판금갑옷', flat: { hp: 800, def: 60 } },
  AEGIS: { id: 'AEGIS', slot: 'armor', label: '이지스', flat: { hp: 500, def: 40 }, effect: { lifesteal: 0.12 } },
  BATTLE_GLOVES: { id: 'BATTLE_GLOVES', slot: 'gloves', label: '전투장갑', flat: { atk: 55, spd: 22 } },
  GREAVES: { id: 'GREAVES', slot: 'pants', label: '판금각반', flat: { hp: 520, def: 38 } },
  // ── 장신구 : 목걸이/귀걸이/반지/망토 ──
  VITAL_AMULET: { id: 'VITAL_AMULET', slot: 'necklace', label: '생명목걸이', flat: { hp: 380, spd: 12 }, effect: { lifesteal: 0.08 } },
  FOCUS_EARRING: { id: 'FOCUS_EARRING', slot: 'earring', label: '집중귀걸이', flat: { spd: 26 }, effect: { critChance: 0.08 } },
  CRIT_RING: { id: 'CRIT_RING', slot: 'accessory', label: '치명반지', flat: { spd: 30 }, effect: { critChance: 0.12, critDamage: 0.3 } },
  PIERCE_CHARM: { id: 'PIERCE_CHARM', slot: 'accessory', label: '관통부적', flat: { spd: 20 }, effect: { defPierce: 0.25 } },
  SWIFT_CLOAK: { id: 'SWIFT_CLOAK', slot: 'cloak', label: '질풍망토', flat: { spd: 40, hp: 250 }, effect: { dmgReduce: 0.05 } },
  // ── 신규 능력치 특화 ──
  SHADE_CLOAK: { id: 'SHADE_CLOAK', slot: 'cloak', label: '그림자망토', flat: { spd: 35 }, effect: { evasion: 0.10 } },
  HAWK_EARRING: { id: 'HAWK_EARRING', slot: 'earring', label: '매눈귀걸이', flat: { spd: 18 }, effect: { accuracy: 0.15 } },
  VOID_EDGE: { id: 'VOID_EDGE', slot: 'weapon', label: '공허검', flat: { atk: 120 }, effect: { trueDamage: 0.12 }, craftCost: 400 },
  GUARDIAN_WALL: { id: 'GUARDIAN_WALL', slot: 'offhand', label: '수호벽', flat: { hp: 460, def: 40 }, effect: { absDef: 0.10 }, craftCost: 400 },
  // ── 탈것 : 기동 + 소폭 생존 ──
  WAR_STEED: { id: 'WAR_STEED', slot: 'mount', label: '군마', flat: { spd: 55, hp: 350, atk: 30 } },
  // ── P1 상위 티어 (제작 비용↑, 콘텐츠 진행 후 노림) · 용사 세트 ──
  DRAGON_FANG: { id: 'DRAGON_FANG', slot: 'weapon', label: '용아검', flat: { atk: 180 }, effect: { critChance: 0.1 }, craftCost: 600, set: 'CHAMPION' },
  BULWARK_PLATE: { id: 'BULWARK_PLATE', slot: 'armor', label: '성벽갑옷', flat: { hp: 1100, def: 85 }, effect: {}, craftCost: 600, set: 'CHAMPION' },
  OMNI_CHARM: { id: 'OMNI_CHARM', slot: 'accessory', label: '만능부적', flat: { spd: 35 }, effect: { critChance: 0.1, defPierce: 0.15 }, craftCost: 600, set: 'CHAMPION' },
  VALIANT_HELM: { id: 'VALIANT_HELM', slot: 'helmet', label: '용사투구', flat: { hp: 650, def: 55 }, effect: { dmgReduce: 0.04 }, craftCost: 600, set: 'CHAMPION' },
  VALIANT_CLOAK: { id: 'VALIANT_CLOAK', slot: 'cloak', label: '용사망토', flat: { spd: 45, hp: 400 }, effect: { dmgReduce: 0.06 }, craftCost: 600, set: 'CHAMPION' },
  // ── 광전사 세트(딜러) ──
  RAGE_BLADE: { id: 'RAGE_BLADE', slot: 'weapon', label: '광란검', flat: { atk: 135 }, effect: { critChance: 0.06 }, craftCost: 500, set: 'BERSERKER' },
  RAGE_GAUNTLET: { id: 'RAGE_GAUNTLET', slot: 'gloves', label: '광란건틀릿', flat: { atk: 65, spd: 22 }, craftCost: 500, set: 'BERSERKER' },
  RAGE_MANTLE: { id: 'RAGE_MANTLE', slot: 'cloak', label: '광란망토', flat: { spd: 38 }, effect: { critDamage: 0.15 }, craftCost: 500, set: 'BERSERKER' },
  // ── 수호 세트(탱커) ──
  BASTION_HELM: { id: 'BASTION_HELM', slot: 'helmet', label: '수호투구', flat: { hp: 560, def: 46 }, craftCost: 500, set: 'BASTION' },
  BASTION_WALL: { id: 'BASTION_WALL', slot: 'offhand', label: '수호방벽', flat: { hp: 620, def: 56 }, effect: { dmgReduce: 0.05 }, craftCost: 500, set: 'BASTION' },
  BASTION_LEGS: { id: 'BASTION_LEGS', slot: 'pants', label: '수호각반', flat: { hp: 600, def: 46 }, craftCost: 500, set: 'BASTION' },
  // ── 현자 세트(서포터) ──
  SAGE_PENDANT: { id: 'SAGE_PENDANT', slot: 'necklace', label: '현자펜던트', flat: { spd: 22, hp: 300 }, effect: { lifesteal: 0.08 }, craftCost: 500, set: 'ARCANIST' },
  SAGE_STUD: { id: 'SAGE_STUD', slot: 'earring', label: '현자귀걸이', flat: { spd: 28 }, effect: { critChance: 0.07 }, craftCost: 500, set: 'ARCANIST' },
  SPIRIT_MOUNT: { id: 'SPIRIT_MOUNT', slot: 'mount', label: '정령마', flat: { spd: 60, hp: 320 }, craftCost: 500, set: 'ARCANIST' },
};

// 장비 세트 — 같은 세트를 여러 슬롯에 착용하면 조건부 보너스(룬 세트와 유사).
export const GEAR_SETS = {
  CHAMPION: {
    label: '용사',
    two: { statPct: { atk: 0.08 } },                       // 2피스
    three: { statPct: { atk: 0.15 }, effect: { critChance: 0.1 } }, // 3피스(풀세트)
  },
  // ── 역할 지향 세트 3종 ──
  BERSERKER: {
    label: '광전사', // 딜러
    two: { statPct: { atk: 0.10 } },
    three: { statPct: { atk: 0.18 }, effect: { critDamage: 0.25 } },
  },
  BASTION: {
    label: '수호', // 탱커
    two: { statPct: { hp: 0.12, def: 0.10 } },
    three: { statPct: { hp: 0.18, def: 0.15 }, effect: { dmgReduce: 0.10 } },
  },
  ARCANIST: {
    label: '현자', // 서포터
    two: { statPct: { spd: 0.12 } },
    three: { statPct: { spd: 0.18, atk: 0.08 }, effect: { lifesteal: 0.10 } },
  },
};

// 유닛 장착 장비의 세트 보너스 합산 (2/3피스 임계).
export function gearSetBonus(unit) {
  const counts = {};
  for (const slot of GEAR_SLOTS) {
    const it = unit.gear && unit.gear[slot];
    const set = it && GEAR_CATALOG[it.blueprint] && GEAR_CATALOG[it.blueprint].set;
    if (set) counts[set] = (counts[set] || 0) + 1;
  }
  const out = { statPct: {}, effect: {} };
  for (const [set, n] of Object.entries(counts)) {
    const def = GEAR_SETS[set];
    if (!def) continue;
    const tier = n >= 3 ? def.three : n >= 2 ? def.two : null;
    if (!tier) continue;
    for (const [k, v] of Object.entries(tier.statPct || {})) out.statPct[k] = (out.statPct[k] || 0) + v;
    for (const [k, v] of Object.entries(tier.effect || {})) out.effect[k] = (out.effect[k] || 0) + v;
  }
  return out;
}

// 유닛의 활성 세트 목록 (표시용): [{ set, label, pieces, active2, active3 }]
export function activeGearSets(unit) {
  const counts = {};
  for (const slot of GEAR_SLOTS) {
    const it = unit.gear && unit.gear[slot];
    const set = it && GEAR_CATALOG[it.blueprint] && GEAR_CATALOG[it.blueprint].set;
    if (set) counts[set] = (counts[set] || 0) + 1;
  }
  return Object.entries(counts)
    .filter(([set, n]) => GEAR_SETS[set] && n >= 2)
    .map(([set, n]) => ({ set, label: GEAR_SETS[set].label, pieces: n, active2: n >= 2, active3: n >= 3 }));
}

const GEAR_ENH_PER = 0.12; // 강화 레벨당 flat +12%

// ── 장비 등급 + 부옵션 ────────────────────────────────────────
// 등급이 기본 flat 배수와 부옵션(substat) 개수를 정한다. 등급 없는
// 레거시 아이템은 배수 1.0(=N)으로 취급 → 기존 세이브 파워 불변.
export const GEAR_RARITY = {
  N: { id: 'N', mult: 1.00, subs: 0, weight: 40, label: '노멀' },
  R: { id: 'R', mult: 1.15, subs: 1, weight: 32, label: '레어' },
  SR: { id: 'SR', mult: 1.35, subs: 2, weight: 18, label: '에픽' },
  SSR: { id: 'SSR', mult: 1.60, subs: 3, weight: 8, label: '전설' },
  UR: { id: 'UR', mult: 1.90, subs: 4, weight: 2, label: '신화' },
};

// 부옵션 풀 — statPct(자기 스탯%) 또는 effect(전투 효과). [min,max] 롤 범위.
const SUBSTAT_POOL = [
  { key: 'atk', kind: 'statPct', min: 0.04, max: 0.10 },
  { key: 'hp', kind: 'statPct', min: 0.04, max: 0.10 },
  { key: 'def', kind: 'statPct', min: 0.04, max: 0.10 },
  { key: 'spd', kind: 'statPct', min: 0.04, max: 0.10 },
  { key: 'critChance', kind: 'effect', min: 0.03, max: 0.08 },
  { key: 'critDamage', kind: 'effect', min: 0.08, max: 0.20 },
  { key: 'lifesteal', kind: 'effect', min: 0.04, max: 0.10 },
  { key: 'defPierce', kind: 'effect', min: 0.05, max: 0.12 },
  { key: 'dmgReduce', kind: 'effect', min: 0.03, max: 0.08 },
  { key: 'evasion', kind: 'effect', min: 0.03, max: 0.08 },
  { key: 'accuracy', kind: 'effect', min: 0.05, max: 0.12 },
  { key: 'trueDamage', kind: 'effect', min: 0.04, max: 0.10 },
  { key: 'absDef', kind: 'effect', min: 0.03, max: 0.08 },
];

function rollSub(rng) {
  const p = SUBSTAT_POOL[Math.floor(rng() * SUBSTAT_POOL.length)];
  const v = p.min + rng() * (p.max - p.min);
  return { key: p.key, kind: p.kind, value: Math.round(v * 1000) / 1000 };
}
// 등급별 부옵션 개수만큼 중복 키 없이 롤.
export function rollGearSubs(rarity, rng) {
  const n = (GEAR_RARITY[rarity] && GEAR_RARITY[rarity].subs) || 0;
  const subs = [];
  const used = new Set();
  let guard = 0;
  while (subs.length < n && guard++ < 30) {
    const s = rollSub(rng);
    if (used.has(s.key)) continue;
    used.add(s.key);
    subs.push(s);
  }
  return subs;
}
// 드롭 등급 롤 — luck(0~1)이 높을수록 상위 등급 가중↑ (진행도 비례).
export function rollGearRarity(rng, luck = 0) {
  const entries = Object.values(GEAR_RARITY).map((d) => ({
    weight: d.weight * (d.id === 'UR' ? 1 + luck * 4 : d.id === 'SSR' ? 1 + luck * 2 : 1),
    id: d.id,
  }));
  return weightedPick(entries, rng).id;
}

export function getBlueprint(id) {
  const b = GEAR_CATALOG[id];
  if (!b) throw new Error(`알 수 없는 장비: ${id}`);
  return b;
}

let _gseq = 0;
export function ensureGearSeq(n) { if (n > _gseq) _gseq = n; }

// rarity/rng 주면 등급+부옵션 아이템 생성(드롭·제작). 없으면 레거시(등급없음).
export function createGear(blueprintId, { rarity, rng } = {}) {
  const b = getBlueprint(blueprintId);
  const item = { uid: `g${++_gseq}`, blueprint: blueprintId, slot: b.slot, level: 1 };
  if (rarity) {
    item.rarity = rarity;
    item.subs = rng ? rollGearSubs(rarity, rng) : [];
  }
  return item;
}

// ── 인챈트(마법부여) — 장비에 각인하는 성장형 효과. 전 슬롯(탈것 포함) 적용. ──
//   첫 인챈트는 무작위 효과를 1레벨로 부여, 이후 같은 효과를 레벨업(강도↑).
//   속성정수(마법 재료)로 부여·강화, 다이아로 효과 재추첨(reroll).
export const ENCHANT_MAX = 5;
export const ENCHANT_POOL = [
  { key: 'atk', kind: 'statPct', per: 0.02, label: '공격' },
  { key: 'hp', kind: 'statPct', per: 0.02, label: '체력' },
  { key: 'def', kind: 'statPct', per: 0.02, label: '방어' },
  { key: 'spd', kind: 'statPct', per: 0.02, label: '속도' },
  { key: 'critChance', kind: 'effect', per: 0.015, label: '치명확률' },
  { key: 'critDamage', kind: 'effect', per: 0.04, label: '치명피해' },
  { key: 'lifesteal', kind: 'effect', per: 0.02, label: '흡혈' },
  { key: 'defPierce', kind: 'effect', per: 0.025, label: '관통' },
  { key: 'dmgReduce', kind: 'effect', per: 0.015, label: '피해감소' },
  { key: 'evasion', kind: 'effect', per: 0.015, label: '회피' },
  { key: 'accuracy', kind: 'effect', per: 0.025, label: '명중' },
  { key: 'trueDamage', kind: 'effect', per: 0.02, label: '절대공격' },
  { key: 'absDef', kind: 'effect', per: 0.015, label: '절대방어' },
];
function enchantDef(key) { return ENCHANT_POOL.find((e) => e.key === key) || null; }

// 인챈트 현황(표시용): { key, kind, level, per, label, value } 또는 null.
export function enchantInfo(item) {
  if (!item || !item.enchant) return null;
  const d = enchantDef(item.enchant.key);
  if (!d) return null;
  return { ...d, level: item.enchant.level, value: Math.round(d.per * item.enchant.level * 1000) / 1000 };
}
// 현재 인챈트 레벨(0=없음) 기준 다음 강화 비용.
export function enchantCost(level) {
  return { elemEssence: 2 + level * 2 };
}
export function enchantGear(state, gearUid, rng = Math.random) {
  const item = findGearAnywhere(state, gearUid);
  if (!item) return { ok: false, reason: '장비 없음' };
  const cur = item.enchant ? item.enchant.level : 0;
  if (cur >= ENCHANT_MAX) return { ok: false, reason: `인챈트 상한 ${ENCHANT_MAX}` };
  const cost = enchantCost(cur);
  if (!spendMaterial(state, 'elemEssence', cost.elemEssence)) return { ok: false, reason: '속성정수 부족', cost };
  if (!item.enchant) {
    const p = ENCHANT_POOL[Math.floor(rng() * ENCHANT_POOL.length)];
    item.enchant = { key: p.key, kind: p.kind, level: 1 };
  } else {
    item.enchant.level += 1;
  }
  return { ok: true, enchant: item.enchant, info: enchantInfo(item), cost };
}
// 효과 재추첨 — 레벨 유지, 효과 종류만 다이아로 다시 뽑는다.
export function rerollEnchant(state, gearUid, rng = Math.random) {
  const item = findGearAnywhere(state, gearUid);
  if (!item || !item.enchant) return { ok: false, reason: '인챈트 없음' };
  const cost = { gem: 25 };
  if (!spend(state.wallet, cost)) return { ok: false, reason: '다이아 부족', cost };
  const p = ENCHANT_POOL[Math.floor(rng() * ENCHANT_POOL.length)];
  item.enchant = { key: p.key, kind: p.kind, level: item.enchant.level };
  return { ok: true, enchant: item.enchant, info: enchantInfo(item), cost };
}

// 장비 한 점이 유닛에 주는 기여분 (강화 레벨 + 등급 배수 + 부옵션 + 인챈트 반영).
export function gearContribution(gearItem) {
  const b = getBlueprint(gearItem.blueprint);
  const rmult = (GEAR_RARITY[gearItem.rarity] && GEAR_RARITY[gearItem.rarity].mult) || 1.0;
  const scale = (1 + GEAR_ENH_PER * (gearItem.level - 1)) * rmult;
  const flat = {};
  for (const [k, v] of Object.entries(b.flat || {})) flat[k] = v * scale;
  const statPct = {};
  const effect = { ...(b.effect || {}) };
  for (const s of gearItem.subs || []) {
    if (s.kind === 'statPct') statPct[s.key] = (statPct[s.key] || 0) + s.value;
    else effect[s.key] = (effect[s.key] || 0) + s.value;
  }
  // 인챈트 기여 (statPct 또는 effect)
  const en = enchantInfo(gearItem);
  if (en) {
    if (en.kind === 'statPct') statPct[en.key] = (statPct[en.key] || 0) + en.value;
    else effect[en.key] = (effect[en.key] || 0) + en.value;
  }
  return { flat, statPct, effect };
}

// 아이템(장착/인벤토리) 어디서든 uid로 찾기.
function findGearAnywhere(state, gearUid) {
  return (
    state.inventory.find((g) => g.uid === gearUid) ||
    state.units.flatMap((u) => GEAR_SLOTS.map((s) => u.gear[s])).find((g) => g && g.uid === gearUid) ||
    null
  );
}

// 속성정수로 부옵션 1개 추가(등급 상한을 넘어 GEAR_SUB_MAX까지 확장) — 속성 던전 사용처.
export const ELEM_OPTION_COST = 5;
export const GEAR_SUB_MAX = 6;
export function grantGearElementOption(state, gearUid, rng = Math.random) {
  const item = findGearAnywhere(state, gearUid);
  if (!item) return { ok: false, reason: '장비 없음' };
  item.subs = item.subs || [];
  if (item.subs.length >= GEAR_SUB_MAX) return { ok: false, reason: `부옵션 상한 ${GEAR_SUB_MAX}` };
  if (!spendMaterial(state, 'elemEssence', ELEM_OPTION_COST)) return { ok: false, reason: '속성정수 부족', cost: ELEM_OPTION_COST };
  const used = new Set(item.subs.map((s) => s.key));
  let guard = 0, added = null;
  while (guard++ < 30) { const s = rollSub(rng); if (used.has(s.key)) continue; item.subs.push(s); added = s; break; }
  return { ok: true, sub: added, subs: item.subs };
}

// 부옵션 재련 — 다이아 소모, 등급 개수만큼 부옵션 재롤.
export function rerollGearSubs(state, gearUid, rng = Math.random) {
  const item = findGearAnywhere(state, gearUid);
  if (!item) return { ok: false, reason: '장비 없음' };
  if (!item.rarity || !(GEAR_RARITY[item.rarity] && GEAR_RARITY[item.rarity].subs)) {
    return { ok: false, reason: '부옵션 없는 장비' };
  }
  const cost = { gem: 20 };
  if (!spend(state.wallet, cost)) return { ok: false, reason: '다이아 부족', cost };
  item.subs = rollGearSubs(item.rarity, rng);
  return { ok: true, subs: item.subs, cost };
}

// 장비 강화 비용 (currency).
export function gearEnhanceCost(level) {
  return {
    currency: Math.round(BALANCE.gearCostBase * Math.pow(BALANCE.gearCostGrowth, level - 1)),
  };
}

// ── 액션 (장르 무관) ──────────────────────────────────────────

// 설계도로 장비를 제작해 인벤토리에 넣는다.
export function gearCraftCost(blueprintId) {
  return { currency: getBlueprint(blueprintId).craftCost || 150 };
}
export function craftGear(state, blueprintId, rng = Math.random) {
  const cost = gearCraftCost(blueprintId);
  if (!spend(state.wallet, cost)) return { ok: false, reason: '제작 재화 부족', cost };
  // 제작품은 레어(R) 기본 — 부옵션 1개. 드롭은 등급이 굴려짐(dropGear).
  const item = createGear(blueprintId, { rarity: 'R', rng });
  state.inventory.push(item);
  return { ok: true, item };
}

// 드롭 — 랜덤 설계도 + 등급 롤로 아이템 생성해 인벤토리에 넣는다(던전/상자).
export function dropGear(state, rng = Math.random, luck = 0, slot = null) {
  const pool = Object.values(GEAR_CATALOG).filter((b) => !slot || b.slot === slot);
  const b = pool[Math.floor(rng() * pool.length)];
  const rarity = rollGearRarity(rng, luck);
  const item = createGear(b.id, { rarity, rng });
  state.inventory.push(item);
  return { ok: true, item, rarity };
}

function findUnit(state, uid) {
  const u = state.units.find((x) => x.uid === uid);
  if (!u) throw new Error(`유닛 없음: ${uid}`);
  return u;
}

// 인벤토리의 장비를 유닛 슬롯에 장착 (기존 장비는 인벤토리로 반환).
export function equipGear(state, unitUid, gearUid) {
  const unit = findUnit(state, unitUid);
  const idx = state.inventory.findIndex((g) => g.uid === gearUid);
  if (idx === -1) return { ok: false, reason: '인벤토리에 없는 장비' };
  const item = state.inventory[idx];
  const slot = item.slot;
  const prev = unit.gear[slot];
  state.inventory.splice(idx, 1);
  if (prev) state.inventory.push(prev); // 기존 장비 회수
  unit.gear[slot] = item;
  return { ok: true, slot, equipped: item.uid, unequipped: prev?.uid || null };
}

export function unequipGear(state, unitUid, slot) {
  const unit = findUnit(state, unitUid);
  const item = unit.gear[slot];
  if (!item) return { ok: false, reason: '빈 슬롯' };
  unit.gear[slot] = null;
  state.inventory.push(item);
  return { ok: true, unequipped: item.uid };
}

// 장착/보유 장비를 강화.
export function enhanceGear(state, gearUid) {
  let item =
    state.inventory.find((g) => g.uid === gearUid) ||
    state.units.flatMap((u) => GEAR_SLOTS.map((s) => u.gear[s]))
      .find((g) => g && g.uid === gearUid);
  if (!item) return { ok: false, reason: '장비 없음' };
  const cost = gearEnhanceCost(item.level);
  if (!spend(state.wallet, cost)) return { ok: false, reason: '강화 재화 부족', cost };
  item.level += 1;
  return { ok: true, gear: item.uid, level: item.level, cost };
}
