import { toCombatProfile } from './units.mjs';

// ─────────────────────────────────────────────────────────────
// 진형 — 파티 "배치"에 전략을 부여한다.
// 각 편성 유닛을 전열(front)·중열(mid)·후열(back) 중 하나에 둔다.
//   · 전열 : 방어벽. 방어·체력↑ 대신 공격↓ (탱킹 자세). 정원 2.
//   · 중열 : 균형. 모든 스탯 소폭↑ (범용 자세). 정원 3.
//   · 후열 : 보호받는 딜러. 공격↑ 대신 방어·체력↓ (유리대포). 정원 2.
//   · 중열·후열은 전열이 최소 1명 있어야 보호받음 — 전열이 없으면 공격 보너스 소멸.
// 시너지와 마찬가지로 resolve()가 프로필 단계에서 적용한다.
//
// 하위호환: 아무도 중열/후열로 지정하지 않으면(=기본 전원 전열) 진형은
// "휴면" 상태로 어떤 보정도 걸지 않는다. 하나라도 배치하는 순간 발동.
// ─────────────────────────────────────────────────────────────

export const FORMATION_ROLES = ['front', 'mid', 'back'];
export const ROLE_LABEL = { front: '전열', mid: '중열', back: '후열' };
// 정원 — 전열2 · 중열3 · 후열2 = 총 7명 편성 구조.
export const ROLE_CAP = { front: 2, mid: 3, back: 2 };

// 진형 보정 계수 (전열/중열/후열 각각의 스탯 배수).
export const FORMATION_MODS = {
  front: { def: 1.25, hp: 1.15, dps: 0.85 },
  mid: { def: 1.05, hp: 1.05, dps: 1.05 },
  midExposed: { def: 1.05, hp: 1.05, dps: 1.0 }, // 전열 없이 노출된 중열
  back: { dps: 1.30, def: 0.80, hp: 0.90 },
  backExposed: { dps: 1.0, def: 0.80, hp: 0.90 }, // 전열 없이 노출된 후열
};

// formation 맵에서 uid의 역할을 읽는다 — 미지정은 전열.
function roleOf(formation, uid) {
  const r = formation && formation[uid];
  return FORMATION_ROLES.includes(r) ? r : 'front';
}

// uid의 진형 역할 — 미지정은 전열.
export function unitRole(state, uid) {
  return roleOf(state.formation, uid);
}

// 파티 내 역할별 인원수(정원 검사용).
function roleCounts(state) {
  const counts = { front: 0, mid: 0, back: 0 };
  for (const uid of state.party || []) counts[unitRole(state, uid)]++;
  return counts;
}

// 진형 배치: 편성된 유닛만 지정 가능. 대상 역할의 정원을 넘으면 거부.
export function setFormation(state, uid, role) {
  if (!FORMATION_ROLES.includes(role)) return { ok: false, reason: '잘못된 진형' };
  if (!state.party.includes(uid)) return { ok: false, reason: '편성되지 않은 유닛' };
  const cur = unitRole(state, uid);
  if (cur !== role) {
    const counts = roleCounts(state);
    if (counts[role] >= ROLE_CAP[role]) {
      return { ok: false, reason: `${ROLE_LABEL[role]} 정원(${ROLE_CAP[role]}) 초과` };
    }
  }
  state.formation = state.formation || {};
  if (role === 'front') delete state.formation[uid];
  else state.formation[uid] = role;
  return { ok: true, role };
}

// 전열→중열→후열→전열 순환. 정원이 찬 역할은 건너뛴다.
export function toggleFormation(state, uid) {
  const cur = unitRole(state, uid);
  const idx = FORMATION_ROLES.indexOf(cur);
  for (let step = 1; step <= FORMATION_ROLES.length; step++) {
    const next = FORMATION_ROLES[(idx + step) % FORMATION_ROLES.length];
    const r = setFormation(state, uid, next);
    if (r.ok) return r;
  }
  return { ok: false, reason: '배치할 자리가 없습니다' };
}

// 편성이 바뀌어 파티에 없는 uid가 남았으면 정리.
export function pruneFormation(state) {
  if (!state.formation) return;
  for (const uid of Object.keys(state.formation)) {
    if (!state.party.includes(uid)) delete state.formation[uid];
  }
}

// 진형 활성 여부 — 중열/후열이 1명 이상일 때만 발동.
export function formationActive(formation, party) {
  if (!formation) return false;
  return party.some((u) => roleOf(formation, u.uid) !== 'front');
}

// 전투 판정용 — 역할별 스탯 보정 계수를 반환(전열 유무에 따라 노출 여부 반영).
export function formationModsFor(formation, uid, hasFront) {
  const role = roleOf(formation, uid);
  if (role === 'front') return FORMATION_MODS.front;
  if (role === 'mid') return hasFront ? FORMATION_MODS.mid : FORMATION_MODS.midExposed;
  return hasFront ? FORMATION_MODS.back : FORMATION_MODS.backExposed;
}

// party 중 전열이 1명이라도 있는지(보호 여부 판정 공용).
export function hasFrontLine(formation, party) {
  return party.some((u) => roleOf(formation, u.uid) === 'front');
}

// 진형 요약(UI 브리핑용): 전열/중열/후열 인원과 노출 경고.
export function formationSummary(state) {
  const front = [], mid = [], back = [];
  for (const uid of state.party || []) {
    const role = unitRole(state, uid);
    (role === 'back' ? back : role === 'mid' ? mid : front).push(uid);
  }
  const active = mid.length > 0 || back.length > 0;
  const exposed = active && front.length === 0;
  return { front, mid, back, cap: ROLE_CAP, active, exposed };
}

// 역할별 원형 우선순위 — "누가 그 자리에 어울리나"의 1차 기준(여러 원형 가능).
//   전열: 방어형(VANGUARD, 근접 탱커) 우선
//   중열: 근접 딜러(STRIKER 전사·ROGUE 도적) 우선 — 어느 정도 맞으며 딜을 넣는 자리
//   후열: 원거리·지원(MAGE 법사·ARCHER 궁수·SUPPORT 지원) 우선 — 남는 인원은
//         앞열(전열·중열)에 못 들어간 유닛이 화력 순으로 흘러들어온다.
const ROLE_ARCHETYPE_PRIORITY = {
  front: ['VANGUARD'],
  mid: ['STRIKER', 'ROGUE'],
  back: ['MAGE', 'ARCHER', 'SUPPORT'],
};

// ── 자동 배치 ────────────────────────────────────────────────
// 전열·중열·후열 모두 같은 규칙을 적용한다:
//   1) 그 역할의 우선 원형을 스탯 순으로 목표치까지 채운다.
//   2) 우선 원형이 모자라면, 아직 미배치인 유닛을 스탯 순으로 채워 넣는다
//      (역할 무관 — "앞열에 못 들어간 유닛이 뒤로 밀린다"는 자연스러운 흐름).
// 정원(2·3·2)은 인원이 모자라면 비율대로 줄인다(예: 2명이면 전열1·후열1).
export function autoFormation(state) {
  const byId = new Map((state.units || []).map((u) => [u.uid, u]));
  const party = (state.party || []).map((uid) => byId.get(uid)).filter(Boolean);
  const total = party.length;
  if (!total) return { ok: false, reason: '편성된 유닛 없음' };

  // toCombatProfile을 재사용해 실제 전투 엔진의 dps/hp/def를 그대로 채점 지표로 쓴다
  // (자체 공식을 따로 두면 전투 공식이 바뀔 때 조용히 어긋날 수 있음).
  const scored = party.map((u) => {
    const p = toCombatProfile(u);
    return {
      uid: u.uid,
      archetype: u.archetype,
      tank: p.def * 2 + p.hp * 0.05, // 방어 위주 지표 — 전열 적합도(원형이 같을 때 정렬용)
      strike: p.dps, // 화력 지표(치명타 반영 실제 dps) — 중·후열 적합도(정렬용)
    };
  });

  // 인원이 정원(7)보다 적으면 전열·후열 목표치를 비율로 낮춘다. 중열은 나머지.
  const frontN = Math.min(ROLE_CAP.front, Math.ceil((total * ROLE_CAP.front) / 7));
  const backN = Math.min(ROLE_CAP.back, Math.ceil((total * ROLE_CAP.back) / 7), total - frontN);
  const midN = total - frontN - backN;
  const targets = { front: frontN, mid: midN, back: backN };
  const sortKey = { front: 'tank', mid: 'strike', back: 'strike' };

  // 역할 하나를 채운다: 1순위 원형 → 부족분은 남은 유닛 중 정렬 기준 순.
  const placed = new Set();
  function fill(role) {
    const n = targets[role];
    const key = sortKey[role];
    const priArchs = ROLE_ARCHETYPE_PRIORITY[role];
    const pool = scored.filter((x) => !placed.has(x.uid));
    const primary = pool.filter((x) => priArchs.includes(x.archetype)).sort((a, b) => b[key] - a[key]);
    let picked = primary.slice(0, n);
    if (picked.length < n) {
      const rest = pool.filter((x) => !priArchs.includes(x.archetype)).sort((a, b) => b[key] - a[key]);
      picked = picked.concat(rest.slice(0, n - picked.length));
    }
    for (const x of picked) placed.add(x.uid);
    return picked.map((x) => x.uid);
  }

  // 전열 → 중열 → 후열 순으로 채운다: 후열의 "앞열 미배치 인원 우선"이
  // 자연히 성립하려면 전열·중열을 먼저 확정해야 한다.
  const frontIds = fill('front');
  const midIds = fill('mid');
  const backIds = fill('back');

  // 적용 순서: 정원 초과가 절대 없도록(비-전열부터 명시 지정, 전열은 기본값이라 항상 통과).
  state.formation = {}; // 초기화 후 재배치
  for (const uid of backIds) setFormation(state, uid, 'back');
  for (const uid of midIds) setFormation(state, uid, 'mid');
  return { ok: true, front: frontIds, mid: midIds, back: backIds };
}
