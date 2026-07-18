import { createUnit } from './units.mjs';
import { spend } from './economy.mjs';
import { weightedPick } from './rng.mjs';

// ─────────────────────────────────────────────────────────────
// 소환(가차) 시스템 — summon 자원으로 신규 유닛 획득.
//   · 등급(rarity)은 확률로, 역할(archetype)은 균등으로 결정
//   · 등급이 시작 랭크를 정한다 (전설=R3에서 시작)
//   · 천장(pity): PITY_HARD 회 안에 최고 등급 보장
//   · RNG 주입 → 시드로 재현 가능
// ─────────────────────────────────────────────────────────────

export const RARITY = {
  N: { id: 'N', label: '노멀', weight: 100, startRank: 1 },
  R: { id: 'R', label: '레어', weight: 66, startRank: 1 },
  SR: { id: 'SR', label: '에픽', weight: 28, startRank: 2 },
  SSR: { id: 'SSR', label: '전설', weight: 5, startRank: 3 },
  UR: { id: 'UR', label: '신화', weight: 1, startRank: 4 }, // 최고 티어 (~0.5%)
};

const ARCH_IDS = ['VANGUARD', 'STRIKER', 'SUPPORT'];
export const PULL_COST = { summon: 10 };
const PITY_HARD = 90; // 이 횟수 안에 SSR 보장
const MULTI_FLOOR = 'SR'; // 10연차 최소 1개 보장 등급

function rollRarity(rng) {
  return weightedPick(
    Object.values(RARITY).map((r) => ({ weight: r.weight, r })),
    rng
  ).r;
}
function rollArchetype(rng) {
  return ARCH_IDS[Math.floor(rng() * ARCH_IDS.length)];
}

// pool에서 해당 등급의 캐릭터를 고른다. 없으면 pool 전체에서.
function pickCharacter(pool, rarityId, rng) {
  const of = pool.filter((c) => c.rarity === rarityId);
  const from = of.length ? of : pool;
  return from[Math.floor(rng() * from.length)];
}

// 한 유닛을 실제로 만들어 상태에 추가.
// pool(컨셉 도감)이 주어지면 "개별 캐릭터"를 뽑고, 없으면 원형만 뽑는다.
function grant(state, rarity, rng, pool) {
  if (pool && pool.length) {
    const ch = pickCharacter(pool, rarity.id, rng);
    const unit = createUnit(ch.archetype, {
      level: 1, rank: rarity.startRank, characterId: ch.id, signature: ch.signature, element: ch.element,
    });
    unit.rarity = rarity.id;
    state.units.push(unit);
    return { rarity: rarity.id, archetype: ch.archetype, characterId: ch.id, uid: unit.uid, unit };
  }
  const archetype = rollArchetype(rng);
  const unit = createUnit(archetype, { level: 1, rank: rarity.startRank });
  unit.rarity = rarity.id;
  state.units.push(unit);
  return { rarity: rarity.id, archetype, uid: unit.uid, unit };
}

// 단차 소환. pool 주면 캐릭터 소환, 없으면 원형 소환.
export function summonOne(state, rng = Math.random, pool = null) {
  if (!spend(state.wallet, PULL_COST)) {
    return { ok: false, reason: '소환 재화 부족', cost: PULL_COST };
  }
  state.gacha.pity += 1;

  let rarity;
  if (state.gacha.pity >= PITY_HARD) {
    rarity = RARITY.SSR; // 천장 보장
    state.gacha.pity = 0;
  } else {
    rarity = rollRarity(rng);
    if (rarity.id === 'SSR' || rarity.id === 'UR') state.gacha.pity = 0; // 최고등급 뽑으면 천장 리셋
  }
  return { ok: true, ...grant(state, rarity, rng, pool) };
}

// 10연차 소환 (최소 1개 SR 이상 보장). pool 주면 캐릭터 소환.
export function summonMulti(state, count = 10, rng = Math.random, pool = null) {
  const cost = { summon: PULL_COST.summon * count };
  if (!spend(state.wallet, cost)) {
    return { ok: false, reason: '소환 재화 부족', cost };
  }
  const results = [];
  const rank = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };
  for (let i = 0; i < count; i++) {
    state.gacha.pity += 1;
    let rarity;
    if (state.gacha.pity >= PITY_HARD) {
      rarity = RARITY.SSR;
      state.gacha.pity = 0;
    } else {
      rarity = rollRarity(rng);
      if (rarity.id === 'SSR' || rarity.id === 'UR') state.gacha.pity = 0;
    }
    results.push(grant(state, rarity, rng, pool));
  }
  // 바닥 보장: SR 이상이 하나도 없으면 마지막을 승급
  if (!results.some((r) => rank[r.rarity] >= rank[MULTI_FLOOR])) {
    const last = results[results.length - 1];
    const u = state.units.find((x) => x.uid === last.uid);
    u.rank = RARITY[MULTI_FLOOR].startRank;
    u.rarity = MULTI_FLOOR;
    last.rarity = MULTI_FLOOR;
  }
  return { ok: true, results };
}
