import { spend } from './economy.mjs';
import { weightedPick } from './rng.mjs';
import { spendMaterial } from './materials.mjs';

// 펫 등급 확률 (gacha와 분리해 순환 의존 방지).
const PET_RARITY = [
  { id: 'R', weight: 65 }, { id: 'SR', weight: 25 }, { id: 'SSR', weight: 8 }, { id: 'UR', weight: 2 },
];

// ─────────────────────────────────────────────────────────────
// 펫 — 계정 성장 축(유물과 형제). 차이: 수집(소환)+장착 루프가 있다.
//   · 소환으로 획득, 중복은 레벨업(합성)
//   · 최대 3마리 장착, 장착 펫 보너스만 accountMods에 합산
//   · 다이아(gem) 소비처 → BM과 연결
// 보너스 축은 power/currency/growth (accountMods와 동일).
// ─────────────────────────────────────────────────────────────

export const PETS = {
  P_CAT: { id: 'P_CAT', label: '럭키캣', emoji: '🐱', type: 'currency', rarity: 'R', per: 0.06 },
  P_WOLF: { id: 'P_WOLF', label: '늑대', emoji: '🐺', type: 'power', rarity: 'R', per: 0.04 },
  P_OWL: { id: 'P_OWL', label: '부엉이', emoji: '🦉', type: 'growth', rarity: 'R', per: 0.06 },
  P_FOX: { id: 'P_FOX', label: '황금여우', emoji: '🦊', type: 'currency', rarity: 'SR', per: 0.09 },
  P_BEAR: { id: 'P_BEAR', label: '큰곰', emoji: '🐻', type: 'power', rarity: 'SR', per: 0.07 },
  P_TURTLE: { id: 'P_TURTLE', label: '거북', emoji: '🐢', type: 'growth', rarity: 'SR', per: 0.09 },
  P_DRAGON: { id: 'P_DRAGON', label: '드래곤', emoji: '🐉', type: 'power', rarity: 'SSR', per: 0.12 },
  // ── Phase B 신규 ──
  P_PHOENIX: { id: 'P_PHOENIX', label: '불사조', emoji: '🦅', type: 'power', rarity: 'SSR', per: 0.13 },
  P_UNICORN: { id: 'P_UNICORN', label: '유니콘', emoji: '🦄', type: 'growth', rarity: 'SSR', per: 0.13 },
  P_KRAKEN: { id: 'P_KRAKEN', label: '크라켄', emoji: '🐙', type: 'currency', rarity: 'SSR', per: 0.13 },
  P_KIRIN: { id: 'P_KIRIN', label: '기린', emoji: '🐲', type: 'power', rarity: 'UR', per: 0.16 },
  P_LEVIATHAN: { id: 'P_LEVIATHAN', label: '레비아탄', emoji: '🐋', type: 'currency', rarity: 'UR', per: 0.16 },
};

export const MAX_ACTIVE_PETS = 3;
export const PET_PULL_COST = { gem: 30 };

// 펫 개체 옵션(부가 배수) — 소환 시 롤, 재련 가능. accountMods에 추가 합산.
const PET_OPT_POOL = [
  { key: 'power', min: 0.02, max: 0.05 },
  { key: 'currency', min: 0.03, max: 0.07 },
  { key: 'growth', min: 0.03, max: 0.07 },
];
function rollPetOpt(state, id, rng) {
  state.pets.opts = state.pets.opts || {};
  const p = PET_OPT_POOL[Math.floor(rng() * PET_OPT_POOL.length)];
  state.pets.opts[id] = { key: p.key, value: Math.round((p.min + rng() * (p.max - p.min)) * 1000) / 1000 };
}
// 옵션 재련 — 다이아 소모.
export function rerollPetOpt(state, id, rng = Math.random) {
  if (!state.pets.owned[id]) return { ok: false, reason: '미보유 펫' };
  const cost = { gem: 15 };
  if (!spend(state.wallet, cost)) return { ok: false, reason: '다이아 부족', cost };
  rollPetOpt(state, id, rng);
  return { ok: true, opt: state.pets.opts[id], cost };
}

// 펫 합성(승급) — 같은 등급 펫 보유레벨 FUSE_COST 소모 → 상위 등급 1 획득.
const FUSE_NEXT = { R: 'SR', SR: 'SSR', SSR: 'UR' };
export const PET_FUSE_COST = 5;
export function petFuseAvail(state, rarity) {
  let n = 0;
  for (const [id, lv] of Object.entries(state.pets.owned || {})) {
    if (PETS[id] && PETS[id].rarity === rarity) n += lv;
  }
  return n;
}
export function petFuse(state, rarity, rng = Math.random) {
  const next = FUSE_NEXT[rarity];
  if (!next) return { ok: false, reason: '최고 등급은 합성 불가' };
  if (petFuseAvail(state, rarity) < PET_FUSE_COST) {
    return { ok: false, reason: `${rarity} 펫 레벨 ${PET_FUSE_COST} 필요` };
  }
  // 소모: 해당 등급 펫들의 레벨을 차감(0이면 제거·장착 해제)
  let need = PET_FUSE_COST;
  for (const id of Object.keys(state.pets.owned)) {
    if (need <= 0) break;
    if (!PETS[id] || PETS[id].rarity !== rarity) continue;
    const take = Math.min(need, state.pets.owned[id]);
    state.pets.owned[id] -= take; need -= take;
    if (state.pets.owned[id] <= 0) {
      delete state.pets.owned[id];
      state.pets.active = state.pets.active.filter((x) => x !== id);
      if (state.pets.opts) delete state.pets.opts[id];
    }
  }
  // 상위 등급 펫 1 획득 + 옵션 롤
  const pool = Object.values(PETS).filter((p) => p.rarity === next);
  const pet = pool[Math.floor(rng() * pool.length)];
  const first = !state.pets.owned[pet.id];
  state.pets.owned[pet.id] = (state.pets.owned[pet.id] || 0) + 1;
  if (first) rollPetOpt(state, pet.id, rng);
  return { ok: true, pet: pet.id, rarity: next };
}

// ── QoL: 자동 합성 — 합성 가능한 모든 등급을 한 번에 승급(하위→상위 연쇄). ──
// 스마트 필터(opts): 원하는 등급만 골라 합성해 "아끼는 등급"이 휩쓸리지 않게 한다.
//   · opts.stopAt: 이 등급부터는 합성 안 함(그 아래만). 예 stopAt:'SSR' → R·SR만.
//   · opts.only:   합성할 등급 화이트리스트(부분집합). 지정 시 그 등급만.
// 기본(옵션 없음)은 기존 동작(R·SR·SSR 전부)과 동일 — 하위호환.
export function autoFusePets(state, rng = Math.random, opts = {}) {
  const ALL = ['R', 'SR', 'SSR'];
  const stopIdx = opts.stopAt ? ALL.indexOf(opts.stopAt) : ALL.length;
  let order = ALL.filter((_, i) => stopIdx < 0 ? true : i < stopIdx);
  if (opts.only && opts.only.length) order = order.filter((r) => opts.only.includes(r));
  let fused = 0, guard = 0, progressed = true;
  while (progressed && guard++ < 100) {
    progressed = false;
    for (const rar of order) {
      while (petFuseAvail(state, rar) >= PET_FUSE_COST) {
        const r = petFuse(state, rar, rng);
        if (!r.ok) break;
        fused++; progressed = true;
      }
    }
  }
  return { ok: fused > 0, fused };
}

export function petEffectLabel(type, concept) {
  if (type === 'power') return '전투력';
  if (type === 'currency') return `${concept ? concept.resources.currency.name : '골드'} 수입`;
  return `${concept ? concept.resources.growth.name : '정수'} 수입`;
}

// 펫 소환: 다이아 소모 → 등급 확률로 펫 획득(중복은 레벨업), 빈 슬롯이면 자동 장착.
export function petSummon(state, rng = Math.random) {
  if (!spend(state.wallet, PET_PULL_COST)) return { ok: false, reason: '다이아 부족', cost: PET_PULL_COST };
  const rarity = weightedPick(PET_RARITY, rng);
  const pool = Object.values(PETS).filter((p) => p.rarity === rarity.id);
  const from = pool.length ? pool : Object.values(PETS);
  const pet = from[Math.floor(rng() * from.length)];
  const first = !state.pets.owned[pet.id];
  state.pets.owned[pet.id] = (state.pets.owned[pet.id] || 0) + 1;
  if (first) rollPetOpt(state, pet.id, rng); // 첫 획득 시 개체 옵션 롤
  if (state.pets.active.length < MAX_ACTIVE_PETS && !state.pets.active.includes(pet.id)) {
    state.pets.active.push(pet.id);
  }
  return { ok: true, pet: pet.id, rarity: rarity.id, level: state.pets.owned[pet.id] };
}

// 펫조각 소환 — 해당 등급 조각 SHARD_SUMMON_COST개로 그 등급 랜덤 펫 획득.
export const SHARD_SUMMON_COST = 10;
export function petShardSummon(state, grade, rng = Math.random) {
  if (!spendMaterial(state, 'petShard', SHARD_SUMMON_COST, grade)) return { ok: false, reason: '펫조각 부족' };
  const pool = Object.values(PETS).filter((p) => p.rarity === grade);
  const from = pool.length ? pool : Object.values(PETS);
  const pet = from[Math.floor(rng() * from.length)];
  const first = !state.pets.owned[pet.id];
  state.pets.owned[pet.id] = (state.pets.owned[pet.id] || 0) + 1;
  if (first) rollPetOpt(state, pet.id, rng);
  if (state.pets.active.length < MAX_ACTIVE_PETS && !state.pets.active.includes(pet.id)) state.pets.active.push(pet.id);
  return { ok: true, pet: pet.id, grade, level: state.pets.owned[pet.id] };
}

export function equipPet(state, id) {
  if (!state.pets.owned[id]) return { ok: false, reason: '미보유' };
  if (state.pets.active.includes(id)) return { ok: false, reason: '이미 장착' };
  if (state.pets.active.length >= MAX_ACTIVE_PETS) return { ok: false, reason: '장착 슬롯 가득' };
  state.pets.active.push(id);
  return { ok: true };
}
export function unequipPet(state, id) {
  state.pets.active = state.pets.active.filter((x) => x !== id);
  return { ok: true };
}

// 장착 펫들의 계정 배수 (power/currency/growth). 없으면 전부 1.
export function petMods(state) {
  let power = 1, currency = 1, growth = 1;
  const pets = state.pets;
  if (!pets) return { power, currency, growth };
  const add = (key, v) => { if (key === 'power') power += v; else if (key === 'currency') currency += v; else growth += v; };
  for (const id of pets.active || []) {
    const p = PETS[id];
    const lv = pets.owned[id] || 0;
    if (!p || !lv) continue;
    add(p.type, p.per * lv);
    // 개체 옵션 (부가 배수)
    const opt = pets.opts && pets.opts[id];
    if (opt) add(opt.key, opt.value);
  }
  return { power, currency, growth };
}

// 펫 옵션 표시 라벨.
export function petOptLabel(opt, concept) {
  if (!opt) return null;
  const name = opt.key === 'power' ? '전투력' : opt.key === 'currency' ? (concept ? concept.resources.currency.name : '골드') + ' 수입' : (concept ? concept.resources.growth.name : '정수') + ' 수입';
  return `${name} +${Math.round(opt.value * 100)}%`;
}
