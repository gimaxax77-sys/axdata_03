import { computePower } from './stats.mjs';

// ─────────────────────────────────────────────────────────────
// 코스튬(스킨) — 캐릭터가 장착하는 순수 외형. 능력치 무관(비 P2W).
//   · 계정이 코스튬을 "보유"하고, 캐릭터별로 "장착"한다(unit.skin).
//   · char=null 은 범용(모든 영웅), char='kael' 등은 전용.
//   · 획득 경로(source): 소환 / 퀘스트(스토리) / 과금등급(VIP) / 영웅전투력 / 속성전투력
//     소환 외 경로는 조건 충족 시 자동 지급(refreshCostumeUnlocks).
// 외형만 바꾸므로 stats/전투에는 전혀 관여하지 않는다.
// ─────────────────────────────────────────────────────────────

export const COSTUMES = {
  // ── 소환 획득 ──
  CS_WANDERER: { id: 'CS_WANDERER', label: '방랑자 복장', emoji: '🧥', rarity: 'SR', char: null, source: 'summon' },
  CS_FESTIVAL: { id: 'CS_FESTIVAL', label: '축제 의상', emoji: '🎎', rarity: 'SR', char: null, source: 'summon' },
  CS_MIDNIGHT: { id: 'CS_MIDNIGHT', label: '심야 예복', emoji: '🌃', rarity: 'SSR', char: null, source: 'summon' },
  // ── 퀘스트(스토리 진행) ──
  CS_KNIGHT: { id: 'CS_KNIGHT', label: '영웅의 갑주', emoji: '🛡️', rarity: 'SSR', char: null, source: 'quest', need: { campaign: 5 } },
  CS_KAEL_CRIMSON: { id: 'CS_KAEL_CRIMSON', label: '홍염 검성', emoji: '⚔️', rarity: 'UR', char: 'kael', source: 'quest', need: { campaign: 8 } },
  // ── 과금 등급(VIP) ──
  CS_ROYAL: { id: 'CS_ROYAL', label: '왕실 정장', emoji: '👑', rarity: 'SSR', char: null, source: 'vip', need: { vip: 3 } },
  CS_ARCHON: { id: 'CS_ARCHON', label: '집정관 예복', emoji: '🎩', rarity: 'UR', char: null, source: 'vip', need: { vip: 6 } },
  // ── 영웅 전투력(단일 영웅) ──
  CS_TITAN: { id: 'CS_TITAN', label: '거신 갑주', emoji: '🦾', rarity: 'SSR', char: null, source: 'power', need: { power: 50000 } },
  // ── 속성 전투력(해당 속성 합산) ──
  CS_INFERNO: { id: 'CS_INFERNO', label: '업화 예복', emoji: '🔥', rarity: 'SSR', char: null, source: 'element', need: { element: 'FIRE', power: 30000 } },
  CS_GLACIER: { id: 'CS_GLACIER', label: '빙하 예복', emoji: '🌊', rarity: 'SSR', char: null, source: 'element', need: { element: 'WATER', power: 30000 } },
  CS_VERDANT: { id: 'CS_VERDANT', label: '수림 예복', emoji: '🌿', rarity: 'SSR', char: null, source: 'element', need: { element: 'WOOD', power: 30000 } },
  CS_RADIANT: { id: 'CS_RADIANT', label: '광휘 예복', emoji: '✨', rarity: 'SSR', char: null, source: 'element', need: { element: 'LIGHT', power: 30000 } },
  CS_UMBRAL: { id: 'CS_UMBRAL', label: '심연 예복', emoji: '🌑', rarity: 'SSR', char: null, source: 'element', need: { element: 'DARK', power: 30000 } },
};

export const SOURCE_LABEL = { summon: '코스튬 소환', quest: '스토리 퀘스트', vip: '과금 등급', power: '영웅 전투력', element: '속성 전투력' };

// 과금 등급(VIP) — 누적 결제액(원) 기준 티어.
export const VIP_THRESHOLDS = [0, 5000, 15000, 30000, 60000, 120000, 250000];
export function vipTier(state) {
  const spend = (state.vip && state.vip.spend) || 0;
  let t = 0;
  for (let i = 0; i < VIP_THRESHOLDS.length; i++) if (spend >= VIP_THRESHOLDS[i]) t = i;
  return t;
}

function ensure(state) {
  state.costumes = state.costumes || { owned: {} };
  state.costumes.owned = state.costumes.owned || {};
  return state.costumes;
}

export function ownsCostume(state, id) {
  return !!(state.costumes && state.costumes.owned && state.costumes.owned[id]);
}
export function grantCostume(state, id) {
  if (!COSTUMES[id]) return { ok: false, reason: '없는 코스튬' };
  const first = !ownsCostume(state, id);
  ensure(state).owned[id] = true;
  return { ok: true, id, first };
}

// 코스튬이 이 유닛에 맞는가(범용 또는 전용 일치).
export function costumeFits(costume, unit) {
  if (!costume) return false;
  return costume.char == null || costume.char === unit.characterId;
}

// 장착 — 보유 + 적합 시 unit.skin 설정(순수 외형).
export function equipCostume(state, unit, id) {
  const c = COSTUMES[id];
  if (!c) return { ok: false, reason: '없는 코스튬' };
  if (!ownsCostume(state, id)) return { ok: false, reason: '미보유' };
  if (!costumeFits(c, unit)) return { ok: false, reason: '이 영웅은 착용 불가' };
  unit.skin = id;
  return { ok: true, id };
}
export function unequipCostume(unit) {
  unit.skin = null;
  return { ok: true };
}

// 유닛이 착용 가능한 코스튬 목록(범용+전용) + 보유/장착/획득경로.
export function costumesFor(state, unit) {
  return Object.values(COSTUMES)
    .filter((c) => costumeFits(c, unit))
    .map((c) => ({
      ...c,
      owned: ownsCostume(state, c.id),
      equipped: unit.skin === c.id,
      sourceLabel: SOURCE_LABEL[c.source] || c.source,
    }));
}

// 속성별 전투력 합산.
function elementPower(state, element) {
  let sum = 0;
  for (const u of state.units || []) if (u.element === element) sum += computePower(u);
  return sum;
}
// 최고 단일 영웅 전투력.
function bestHeroPower(state) {
  let best = 0;
  for (const u of state.units || []) best = Math.max(best, computePower(u));
  return best;
}

// 조건 충족 코스튬 자동 지급(소환 제외). 반환 { granted: [id...] }.
export function refreshCostumeUnlocks(state) {
  const granted = [];
  const campaign = (state.campaign && state.campaign.cleared) || 0;
  const vip = vipTier(state);
  for (const c of Object.values(COSTUMES)) {
    if (c.source === 'summon' || ownsCostume(state, c.id)) continue;
    const n = c.need || {};
    let ok = false;
    if (c.source === 'quest') ok = campaign >= (n.campaign || 0);
    else if (c.source === 'vip') ok = vip >= (n.vip || 0);
    else if (c.source === 'power') ok = bestHeroPower(state) >= (n.power || 0);
    else if (c.source === 'element') ok = elementPower(state, n.element) >= (n.power || 0);
    if (ok) { grantCostume(state, c.id); granted.push(c.id); }
  }
  return { granted };
}

// 소환용 미보유 코스튬 풀(소환 획득분).
export function summonCostumePool(state) {
  return Object.values(COSTUMES).filter((c) => c.source === 'summon' && !ownsCostume(state, c.id));
}
