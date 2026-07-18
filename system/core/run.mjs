// 원정(로그라이트) 런 — 좌→우 진격. 전투마다 보상 3택, 소모전(생명)으로 긴장.
// 전투는 기존 resolve()를 그대로 호출(새 전투식 없음). 난이도는 getStage 곡선 재사용.
// 소모전: resolve의 margin(승리 여유)으로 생명(runHP)을 깎는다 — 아슬한 승리일수록 더.
// 상태는 state.run(순수 데이터)에 스냅샷 → 세이브 자동 왕복.

import { getStage } from './progression.mjs';
import { resolve } from './resolution.mjs';
import { getPartyUnits } from './gameState.mjs';
import { accountMods } from './balance.mjs';
import { earn } from './economy.mjs';

export const RUN_NODES = 10; // 한 런의 노드 수(전투 + 엘리트 + 보스)

// 런 한정 강화(boon) 카탈로그 — 런 종료까지만 유지(영구 아님).
//   power: 파워 배수(누적 곱) · heal: 생명 즉시 회복(0~1, 상한 1).
export const BOONS = [
  { id: 'might',    label: '전투력 +18%',           power: 1.18 },
  { id: 'bulwark',  label: '전투력 +12%',           power: 1.12 },
  { id: 'surge',    label: '전투력 +25%',           power: 1.25 },
  { id: 'mend',     label: '생명 +30%',             heal: 0.30 },
  { id: 'vitality', label: '생명 +20% · 전투력 +8%', heal: 0.20, power: 1.08 },
];
const BOON_BY_ID = Object.fromEntries(BOONS.map((b) => [b.id, b]));

// 노드 i(0-based)의 종류·난이도. 마지막=보스, 중간(5)=엘리트, 나머지=일반.
function nodeAt(floor, i) {
  const stage = (floor - 1) * 18 + (i + 1) * 4; // 층·진행에 따라 상승
  const base = getStage(stage);
  const isBoss = i === RUN_NODES - 1;
  const isElite = i === 5;
  let ch = { ...base.challenge };
  let type = 'battle';
  if (isBoss) { type = 'boss'; ch = { hp: Math.round(ch.hp * 2.2), atk: Math.round(ch.atk * 1.4), def: Math.round(ch.def * 1.2), element: ch.element }; }
  else if (isElite) { type = 'elite'; ch = { hp: Math.round(ch.hp * 1.5), atk: Math.round(ch.atk * 1.2), def: Math.round(ch.def * 1.1), element: ch.element }; }
  return { type, stage, challenge: ch, rewards: base.rewards };
}

// 승리 시 생명 소모량 — margin(여유)이 작을수록(아슬할수록) 크게 깎인다.
function attritionCost(margin) {
  const c = 0.18 / Math.max(1, margin);
  return Math.min(0.18, Math.max(0.03, c));
}

// boons에서 파생된 파워 배수(누적 곱).
function boonPower(boons) {
  return boons.reduce((m, id) => m * (BOON_BY_ID[id]?.power || 1), 1);
}

// 런 시작 — 현재 편성을 스냅샷. 파티 없으면 실패.
export function startRun(state, { floor = 1 } = {}) {
  if (state.run && state.run.status === 'active') return { ok: false, reason: '이미 진행 중인 원정이 있습니다' };
  if (!state.party || !state.party.length) return { ok: false, reason: '파티를 먼저 편성하세요' };
  const nodes = Array.from({ length: RUN_NODES }, (_, i) => nodeAt(floor, i));
  state.run = {
    floor,
    nodes,
    idx: 0,          // 클리어한 노드 수 = idx
    runHP: 1,        // 생명 풀(0~1)
    boons: [],       // 획득한 boon id
    party: [...state.party],
    formation: { ...(state.formation || {}) },
    offer: null,     // 현재 제시된 boon 3택(id 배열) 또는 null
    loot: { currency: 0, growth: 0 },
    status: 'active',
  };
  return { ok: true, run: state.run };
}

export function currentNode(state) {
  const r = state.run;
  if (!r || r.status !== 'active') return null;
  return r.nodes[r.idx] || null;
}

// 런에 참여한 파티 유닛 인스턴스(스냅샷 uid 기준).
function runParty(state) {
  const ids = new Set(state.run.party);
  return getPartyUnits(state).filter((u) => ids.has(u.uid));
}

// 3택 boon 굴리기 — 서로 다른 3개(카탈로그가 3개 미만이면 있는 만큼).
function rollBoons(rng) {
  const pool = BOONS.map((b) => b.id);
  const out = [];
  while (out.length < 3 && pool.length) {
    const k = Math.floor(rng() * pool.length);
    out.push(pool.splice(k, 1)[0]);
  }
  return out;
}

// 현재 노드 전투. 승리 시 생명 소모 + 전리품 누적 + (보스 아니면)보상 3택 제시.
//   rng: 결정론 테스트용 난수(기본 Math.random).
export function fightNode(state, rng = Math.random) {
  const r = state.run;
  if (!r || r.status !== 'active') return { ok: false, reason: '진행 중인 원정이 없습니다' };
  if (r.offer) return { ok: false, reason: '보상을 먼저 선택하세요' };
  const node = r.nodes[r.idx];
  const party = runParty(state);
  if (!party.length) return { ok: false, reason: '파티 없음' };

  const mods = { ...accountMods(state) };
  mods.powerMult = (mods.powerMult || 1) * boonPower(r.boons);
  const res = resolve(party, node.challenge, mods, r.formation);

  if (!res.win) {
    r.status = 'dead';
    return { ok: true, win: false, node, margin: res.margin, ended: true, status: r.status };
  }
  // 승리 — 전리품 누적 + 생명 소모
  r.loot.currency += node.rewards.currency;
  r.loot.growth += node.rewards.growth;
  r.runHP = Math.max(0, r.runHP - attritionCost(res.margin));
  r.idx += 1;

  let offer = null;
  if (r.runHP <= 0) {
    r.status = 'dead'; // 소모전 탈진(마지막 노드는 클리어로 인정)
  } else if (r.idx >= r.nodes.length) {
    r.status = 'won';  // 보스까지 클리어
  } else {
    offer = rollBoons(rng); // 다음 전투 전 보상 3택
    r.offer = offer;
  }
  return { ok: true, win: true, node, margin: res.margin, runHP: r.runHP, offer, ended: r.status !== 'active', status: r.status };
}

// 제시된 3택 중 하나 선택 → 적용(파워 누적 or 즉시 회복). offer 해제.
export function pickBoon(state, id) {
  const r = state.run;
  if (!r || r.status !== 'active') return { ok: false, reason: '진행 중인 원정이 없습니다' };
  if (!r.offer || !r.offer.includes(id)) return { ok: false, reason: '제시되지 않은 보상' };
  const b = BOON_BY_ID[id];
  r.boons.push(id);
  if (b.heal) r.runHP = Math.min(1, r.runHP + b.heal);
  r.offer = null;
  return { ok: true, boon: b, runHP: r.runHP, boons: [...r.boons] };
}

// 런 종료 정산 — 클리어 노드 수 기반 메타 보상 + 전리품 지급, state.run 비움.
//   진행 중(active)이면 포기로 간주(현재까지 보상). 반환: 정산 요약.
export function endRun(state) {
  const r = state.run;
  if (!r) return { ok: false, reason: '원정 없음' };
  const cleared = r.idx;
  const won = r.status === 'won';
  const reward = {
    ...r.loot,
    gem: cleared * 3 + (won ? 30 : 0),
    summon: cleared * 2 + (won ? 10 : 0),
  };
  earn(state.wallet, reward);
  const summary = { cleared, won, floor: r.floor, boons: [...r.boons], reward };
  state.run = null;
  return { ok: true, ...summary };
}
