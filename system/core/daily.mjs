import { earn } from './economy.mjs';
import { getStage } from './progression.mjs';
import { dropGear } from './gear.mjs';
import { dropRune } from './runes.mjs';
import { addMaterial } from './materials.mjs';
import { weightedPick } from './rng.mjs';

// ─────────────────────────────────────────────────────────────
// 일일 콘텐츠 — 출석 · 일일 미션 · 던전. (장르/컨셉 무관)
// 자원 faucet: 특히 소환권(summon)을 공급해 수집 루프를 돌린다.
// 하루 경계는 UTC epoch-day 기준.
// ─────────────────────────────────────────────────────────────

export function epochDay(now = Date.now()) {
  return Math.floor(now / 86400000);
}

// 출석 7일 순환 보상
export const ATTENDANCE = [
  { currency: 500 }, { growth: 300 }, { summon: 20 }, { currency: 1000 },
  { growth: 600 }, { summon: 30 }, { summon: 60 },
];

// 일일 미션
export const MISSIONS = [
  { id: 'summon', label: '소환 1회', goal: 1, reward: { growth: 300 } },
  { id: 'upgrade', label: '캐릭터 강화 5회', goal: 5, reward: { summon: 20 } },
  { id: 'dungeon', label: '던전 3회', goal: 3, reward: { currency: 800 } },
];

// 던전: 자원/아이템 파밍. 하루 입장 제한.
//   kind 'resource' → 재화 대량 지급 · 'gear'/'rune' → 실제 아이템 드롭.
export const DUNGEONS = {
  GOLD: { kind: 'resource', resource: 'currency', entriesPerDay: 3 },
  ESSENCE: { kind: 'resource', resource: 'growth', entriesPerDay: 3 },
  GEAR: { kind: 'gear', entriesPerDay: 2 },
  RUNE: { kind: 'rune', entriesPerDay: 2 },
  // ── 재료 던전 ──
  WEEKDAY: { kind: 'weekday', entriesPerDay: 2 },   // 장비/악세 + 돌파석
  ELEMENT: { kind: 'element', entriesPerDay: 2 },   // 속성정수 (장비 속성 옵션)
  PETSHARD: { kind: 'petshard', entriesPerDay: 2 }, // 펫조각 (등급별)
};

// 펫조각 등급 확률 (진행도 luck으로 상위 가중).
function rollShardGrade(rng, luck) {
  return weightedPick([
    { id: 'R', weight: 60 }, { id: 'SR', weight: 25 * (1 + luck) },
    { id: 'SSR', weight: 10 * (1 + luck * 2) }, { id: 'UR', weight: 3 * (1 + luck * 4) },
  ], rng).id;
}

// 진행도(peakStage) → 상위 등급 드롭 확률 luck(0~1).
function dropLuck(state) {
  return Math.min(1, (state.peakStage || 1) / 200);
}

// 하루가 바뀌면 미션/던전 초기화 (출석 streak은 유지).
export function refreshDaily(state, now = Date.now()) {
  const d = epochDay(now);
  const dl = state.daily;
  if (dl.epochDay !== d) {
    dl.epochDay = d;
    dl.missions = { summon: 0, upgrade: 0, dungeon: 0 };
    dl.claimed = {};
    dl.dungeon = Object.fromEntries(Object.keys(DUNGEONS).map((k) => [k, 0]));
  }
}

// ── 출석 ──────────────────────────────────────────────────────
export function canClaimAttendance(state, now = Date.now()) {
  refreshDaily(state, now);
  return state.daily.claimedDay !== epochDay(now);
}
export function claimAttendance(state, now = Date.now()) {
  if (!canClaimAttendance(state, now)) return { ok: false, reason: '오늘 이미 수령' };
  const idx = state.daily.streak % ATTENDANCE.length;
  const reward = ATTENDANCE[idx];
  earn(state.wallet, reward);
  state.daily.streak += 1;
  state.daily.claimedDay = epochDay(now);
  return { ok: true, reward, day: idx + 1, streak: state.daily.streak };
}

// ── 미션 ──────────────────────────────────────────────────────
export function recordMission(state, key, n = 1, now = Date.now()) {
  refreshDaily(state, now);
  state.daily.missions[key] = (state.daily.missions[key] || 0) + n;
}
export function missionList(state, now = Date.now()) {
  refreshDaily(state, now);
  return MISSIONS.map((m) => {
    const progress = Math.min(state.daily.missions[m.id] || 0, m.goal);
    const claimed = !!state.daily.claimed[m.id];
    return { ...m, progress, done: progress >= m.goal, claimed };
  });
}
export function claimMission(state, id) {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) return { ok: false };
  const progress = state.daily.missions[m.id] || 0;
  if (progress < m.goal) return { ok: false, reason: '미완료' };
  if (state.daily.claimed[m.id]) return { ok: false, reason: '이미 수령' };
  earn(state.wallet, m.reward);
  state.daily.claimed[m.id] = true;
  return { ok: true, reward: m.reward };
}

// ── 던전 ──────────────────────────────────────────────────────
export function dungeonEntriesLeft(state, type, now = Date.now()) {
  refreshDaily(state, now);
  return DUNGEONS[type].entriesPerDay - (state.daily.dungeon[type] || 0);
}
export function enterDungeon(state, type, now = Date.now(), rng = Math.random) {
  if (dungeonEntriesLeft(state, type, now) <= 0) return { ok: false, reason: '입장 횟수 소진' };
  const d = DUNGEONS[type];
  state.daily.dungeon[type] = (state.daily.dungeon[type] || 0) + 1;
  recordMission(state, 'dungeon', 1, now);
  if (d.kind === 'gear') {
    const r = dropGear(state, rng, dropLuck(state));
    return { ok: true, kind: 'gear', item: r.item, rarity: r.rarity };
  }
  if (d.kind === 'rune') {
    const r = dropRune(state, rng, dropLuck(state));
    return { ok: true, kind: 'rune', rune: r.rune, rarity: r.rarity };
  }
  if (d.kind === 'weekday') {
    // 장비 1점 + 소환석(진행도 비례) — 돌파 재료가 소환석으로 통합됨.
    const g = dropGear(state, rng, dropLuck(state));
    const summonAmt = 10 + Math.floor((state.peakStage || 1) / 10);
    earn(state.wallet, { summon: summonAmt });
    return { ok: true, kind: 'weekday', item: g.item, rarity: g.rarity, summon: summonAmt };
  }
  if (d.kind === 'element') {
    const amount = 3 + Math.floor((state.peakStage || 1) / 25);
    addMaterial(state, 'elemEssence', amount);
    return { ok: true, kind: 'element', elemEssence: amount };
  }
  if (d.kind === 'petshard') {
    const grade = rollShardGrade(rng, dropLuck(state));
    const amount = 4 + Math.floor((state.peakStage || 1) / 20);
    addMaterial(state, 'petShard', amount, grade);
    return { ok: true, kind: 'petshard', grade, amount };
  }
  // 자원 던전: 즉시 대량 보상 (진행도 보상 × 40)
  const res = d.resource;
  const amount = Math.round(getStage(state.peakStage).rewards[res] * 40);
  earn(state.wallet, { [res]: amount });
  return { ok: true, kind: 'resource', amount, resource: res };
}

// ── QoL: 소탕(sweep) — 남은 입장 횟수를 한 번에 소진하고 보상 합산. ──
export function sweepDungeon(state, type, now = Date.now(), rng = Math.random) {
  const left = dungeonEntriesLeft(state, type, now);
  if (left <= 0) return { ok: false, reason: '입장 횟수 소진' };
  const acc = { count: 0, elemEssence: 0, items: 0, runes: 0, shards: {}, currency: 0, growth: 0, summon: 0 };
  let last = null;
  for (let i = 0; i < left; i++) {
    const r = enterDungeon(state, type, now, rng);
    if (!r.ok) break;
    last = r; acc.count++;
    acc.elemEssence += r.elemEssence || 0;
    acc.summon += r.summon || 0;
    if (r.kind === 'petshard') acc.shards[r.grade] = (acc.shards[r.grade] || 0) + (r.amount || 0);
    else if (r.kind === 'resource') acc[r.resource] = (acc[r.resource] || 0) + (r.amount || 0);
    else if (r.kind === 'gear' || r.kind === 'weekday') acc.items++;
    else if (r.kind === 'rune') acc.runes++;
  }
  return { ok: acc.count > 0, kind: DUNGEONS[type].kind, ...acc, last };
}

// ── QoL: 원탭 일일 전체수령 — 출석 + 완료 미션 일괄 수령. ──
export function claimAllDaily(state, now = Date.now()) {
  const got = { attendance: null, missions: [] };
  if (canClaimAttendance(state, now)) {
    const a = claimAttendance(state, now);
    if (a.ok) got.attendance = a.reward;
  }
  for (const m of missionList(state, now)) {
    if (m.done && !m.claimed) {
      const r = claimMission(state, m.id);
      if (r.ok) got.missions.push({ id: m.id, reward: r.reward });
    }
  }
  return { ok: !!got.attendance || got.missions.length > 0, ...got };
}
