import { spend } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 룬 시스템 — 소켓형 서브스탯 수집층. 같은 캐릭터도 룬 세팅으로 빌드 분화.
//   · 유닛당 룬 슬롯 3개. 각 룬 = 계열(set) + 메인스탯 + 레벨.
//   · 같은 계열을 모으면 세트 보너스(2세트/3세트).
//   · 발굴(summon)로 획득 → 룬 가방(state.runeBag)에 쌓이고, 슬롯에 장착.
//   · 계정 유물(relics)과 다른 축: 룬은 "유닛별" 성장.
// ─────────────────────────────────────────────────────────────

export const RUNE_SLOTS = 3;

// 룬 계열 정의. main=슬롯 장착 시 메인스탯, set2/set3=세트 보너스.
export const RUNE_SETS = {
  RAGE: {
    id: 'RAGE', label: '분노', emoji: '🔥',
    main: { kind: 'statPct', stat: 'atk', base: 0.06 },
    set2: { statPct: { atk: 0.10 } },
    set3: { statPct: { atk: 0.15 }, effect: { critDamage: 0.3 } },
  },
  GUARD: {
    id: 'GUARD', label: '수호', emoji: '🛡️',
    main: { kind: 'statPct', stat: 'hp', base: 0.06 },
    set2: { statPct: { def: 0.12 } },
    set3: { statPct: { hp: 0.15, def: 0.15 } },
  },
  SWIFT: {
    id: 'SWIFT', label: '질풍', emoji: '💨',
    main: { kind: 'statPct', stat: 'spd', base: 0.08 },
    set2: { statPct: { spd: 0.15 } },
    set3: { statPct: { spd: 0.20, atk: 0.10 } },
  },
  FATAL: {
    id: 'FATAL', label: '치명', emoji: '🎯',
    main: { kind: 'effect', stat: 'critChance', base: 0.04 },
    set2: { effect: { critChance: 0.08 } },
    set3: { effect: { critChance: 0.10, critDamage: 0.4 } },
  },
  // ── Phase A 신규 계열 ──
  PIERCE: {
    id: 'PIERCE', label: '관통', emoji: '🏹',
    main: { kind: 'effect', stat: 'defPierce', base: 0.05 },
    set2: { effect: { defPierce: 0.10 } },
    set3: { effect: { defPierce: 0.15, critDamage: 0.2 } },
  },
  MENDING: {
    id: 'MENDING', label: '치유', emoji: '🌿',
    main: { kind: 'effect', stat: 'lifesteal', base: 0.05 },
    set2: { effect: { lifesteal: 0.10 } },
    set3: { effect: { lifesteal: 0.14 }, statPct: { hp: 0.10 } },
  },
};

// 룬 등급 — 메인스탯 배수 + 부옵션 개수. 발굴 확률로 결정.
export const RUNE_RARITY = {
  N: { id: 'N', label: '일반', mult: 1.0, weight: 55, subs: 0 },
  R: { id: 'R', label: '고급', mult: 1.5, weight: 32, subs: 1 },
  SR: { id: 'SR', label: '희귀', mult: 2.2, weight: 13, subs: 1 },
  SSR: { id: 'SSR', label: '영웅', mult: 3.0, weight: 5, subs: 2 },
  UR: { id: 'UR', label: '신화', mult: 3.8, weight: 1, subs: 3 },
};

// 룬 부옵션 풀 (장비보다 소폭).
const RUNE_SUB_POOL = [
  { key: 'atk', kind: 'statPct', min: 0.03, max: 0.07 },
  { key: 'hp', kind: 'statPct', min: 0.03, max: 0.07 },
  { key: 'def', kind: 'statPct', min: 0.03, max: 0.07 },
  { key: 'spd', kind: 'statPct', min: 0.03, max: 0.07 },
  { key: 'critChance', kind: 'effect', min: 0.02, max: 0.05 },
  { key: 'critDamage', kind: 'effect', min: 0.05, max: 0.12 },
];
function rollRuneSub(rng) {
  const p = RUNE_SUB_POOL[Math.floor(rng() * RUNE_SUB_POOL.length)];
  const v = p.min + rng() * (p.max - p.min);
  return { key: p.key, kind: p.kind, value: Math.round(v * 1000) / 1000 };
}
export function rollRuneSubs(rarity, rng) {
  const n = (RUNE_RARITY[rarity] && RUNE_RARITY[rarity].subs) || 0;
  const subs = []; const used = new Set(); let guard = 0;
  while (subs.length < n && guard++ < 30) {
    const s = rollRuneSub(rng);
    if (used.has(s.key)) continue;
    used.add(s.key); subs.push(s);
  }
  return subs;
}

export const RUNE_MAX_LEVEL = 5;
export const RUNE_SUMMON_COST = { currency: 2000 };

let _rseq = 0;
export function ensureRuneSeq(n) { if (n > _rseq) _rseq = n; }

const setIds = Object.keys(RUNE_SETS);
const rarIds = Object.keys(RUNE_RARITY);

function pickWeighted(rng, table, key) {
  const total = table.reduce((s, x) => s + x[key], 0);
  let r = rng() * total;
  for (const x of table) { if ((r -= x[key]) <= 0) return x; }
  return table[table.length - 1];
}

// 룬 한 개 발굴 → 가방에 추가.
export function summonRune(state, rng = Math.random) {
  if (!spend(state.wallet, RUNE_SUMMON_COST)) return { ok: false, reason: '발굴 재화 부족', cost: RUNE_SUMMON_COST };
  state.runeBag = state.runeBag || [];
  state.runeBag.push(makeRune(rng));
  return { ok: true, rune: state.runeBag[state.runeBag.length - 1] };
}

// 룬 한 개 생성(등급 롤 + 부옵션). luck이 상위 등급 가중.
function makeRune(rng, luck = 0) {
  const set = setIds[Math.floor(rng() * setIds.length)];
  const table = Object.values(RUNE_RARITY).map((r) => ({
    weight: r.weight * (r.id === 'UR' ? 1 + luck * 4 : r.id === 'SSR' ? 1 + luck * 2 : 1), id: r.id,
  }));
  const rarity = pickWeighted(rng, table, 'weight').id;
  return { uid: `r${++_rseq}`, set, rarity, level: 0, subs: rollRuneSubs(rarity, rng) };
}

// 드롭 — 룬을 가방에 넣는다(룬 던전/환생 상자).
export function dropRune(state, rng = Math.random, luck = 0) {
  state.runeBag = state.runeBag || [];
  const rune = makeRune(rng, luck);
  state.runeBag.push(rune);
  return { ok: true, rune, rarity: rune.rarity };
}

// 부옵션 재련 — 다이아 소모.
export function rerollRuneSubs(state, runeUid, rng = Math.random) {
  let rune = (state.runeBag || []).find((r) => r.uid === runeUid);
  if (!rune) for (const u of state.units) { const h = (u.runes || []).find((r) => r && r.uid === runeUid); if (h) { rune = h; break; } }
  if (!rune) return { ok: false, reason: '룬 없음' };
  if (!(RUNE_RARITY[rune.rarity] && RUNE_RARITY[rune.rarity].subs)) return { ok: false, reason: '부옵션 없는 룬' };
  const cost = { gem: 15 };
  if (!spend(state.wallet, cost)) return { ok: false, reason: '다이아 부족', cost };
  rune.subs = rollRuneSubs(rune.rarity, rng);
  return { ok: true, subs: rune.subs, cost };
}

// 룬 메인스탯 현재값 (등급 배수 × 레벨 성장).
export function runeMainValue(rune) {
  const set = RUNE_SETS[rune.set];
  const rar = RUNE_RARITY[rune.rarity] || RUNE_RARITY.N;
  return set.main.base * rar.mult * (1 + 0.25 * (rune.level || 0));
}

// 룬 강화 비용.
export function runeEnhanceCost(level) {
  return { currency: Math.round(500 * Math.pow(1.35, level)) };
}

function findUnit(state, uid) {
  const u = state.units.find((x) => x.uid === uid);
  if (!u) throw new Error(`유닛 없음: ${uid}`);
  return u;
}
function findInBag(state, runeUid) {
  return (state.runeBag || []).findIndex((r) => r.uid === runeUid);
}

// 가방의 룬을 유닛 슬롯에 장착 (기존 룬은 가방으로 회수).
export function equipRune(state, uid, slot, runeUid) {
  const u = findUnit(state, uid);
  if (slot < 0 || slot >= RUNE_SLOTS) return { ok: false, reason: '잘못된 슬롯' };
  const idx = findInBag(state, runeUid);
  if (idx === -1) return { ok: false, reason: '가방에 없는 룬' };
  if (!u.runes) u.runes = new Array(RUNE_SLOTS).fill(null);
  const rune = state.runeBag[idx];
  state.runeBag.splice(idx, 1);
  const prev = u.runes[slot];
  if (prev) state.runeBag.push(prev);
  u.runes[slot] = rune;
  return { ok: true, slot, equipped: rune.uid };
}

export function unequipRune(state, uid, slot) {
  const u = findUnit(state, uid);
  const rune = u.runes && u.runes[slot];
  if (!rune) return { ok: false, reason: '빈 슬롯' };
  u.runes[slot] = null;
  state.runeBag = state.runeBag || [];
  state.runeBag.push(rune);
  return { ok: true, unequipped: rune.uid };
}

// 장착/가방 룬을 강화.
export function enhanceRune(state, runeUid) {
  let rune = (state.runeBag || []).find((r) => r.uid === runeUid);
  if (!rune) {
    for (const u of state.units) {
      const hit = (u.runes || []).find((r) => r && r.uid === runeUid);
      if (hit) { rune = hit; break; }
    }
  }
  if (!rune) return { ok: false, reason: '룬 없음' };
  if (rune.level >= RUNE_MAX_LEVEL) return { ok: false, reason: `강화 상한 ${RUNE_MAX_LEVEL}` };
  const cost = runeEnhanceCost(rune.level);
  if (!spend(state.wallet, cost)) return { ok: false, reason: '강화 재화 부족', cost };
  rune.level += 1;
  return { ok: true, level: rune.level, cost };
}

// ── 모디파이어 기여 (modifiers.mjs가 읽어 합산) ────────────────

// 장착 룬 메인스탯 + 부옵션 합 → { statPct, effect }.
export function runeMainContribution(runes) {
  const statPct = {}; const effect = {};
  for (const r of runes || []) {
    if (!r) continue;
    const m = RUNE_SETS[r.set].main;
    const val = runeMainValue(r);
    if (m.kind === 'statPct') statPct[m.stat] = (statPct[m.stat] || 0) + val;
    else effect[m.stat] = (effect[m.stat] || 0) + val;
    // 부옵션 합산
    for (const s of r.subs || []) {
      if (s.kind === 'statPct') statPct[s.key] = (statPct[s.key] || 0) + s.value;
      else effect[s.key] = (effect[s.key] || 0) + s.value;
    }
  }
  return { statPct, effect };
}

// 세트 보너스 (같은 계열 2/3개) → { statPct, effect }.
export function runeSetContribution(runes) {
  const count = {};
  for (const r of runes || []) { if (r) count[r.set] = (count[r.set] || 0) + 1; }
  const statPct = {}; const effect = {};
  const merge = (bonus) => {
    if (!bonus) return;
    for (const [k, v] of Object.entries(bonus.statPct || {})) statPct[k] = (statPct[k] || 0) + v;
    for (const [k, v] of Object.entries(bonus.effect || {})) effect[k] = (effect[k] || 0) + v;
  };
  for (const [set, n] of Object.entries(count)) {
    const s = RUNE_SETS[set];
    if (n >= 2) merge(s.set2);
    if (n >= 3) merge(s.set3);
  }
  return { statPct, effect };
}

// 활성 세트 요약 (UI 표시용): [{set,label,emoji,count,active2,active3}]
export function activeRuneSets(runes) {
  const count = {};
  for (const r of runes || []) { if (r) count[r.set] = (count[r.set] || 0) + 1; }
  return Object.entries(count).map(([set, n]) => ({
    set, label: RUNE_SETS[set].label, emoji: RUNE_SETS[set].emoji,
    count: n, active2: n >= 2, active3: n >= 3,
  }));
}
