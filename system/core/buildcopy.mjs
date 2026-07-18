import { getPartyUnits } from './gameState.mjs';
import { setFormation, unitRole, FORMATION_ROLES } from './formation.mjs';
import { equipSkill } from './character.mjs';
import { skillSlots } from './skills.mjs';

// ─────────────────────────────────────────────────────────────
// 원클릭 덱 복사(로컬) — 파티 "위치별" 스킬 로드아웃 + 진형을 코드로 주고받는다.
//   · 유닛 인스턴스는 계정마다 다르므로 "슬롯 인덱스 기준"으로 적용한다.
//   · 복사되는 것: 각 자리의 스킬 구성 + 전열/후열 배치(전략의 핵심).
//   · 장비는 인스턴스 자산이라 로컬 복사 대상에서 제외(안내만). 서버 시 확장.
//   추천덱/봇덱/다른 유저덱을 버튼 하나로 내 파티에 적용하는 용도.
// ─────────────────────────────────────────────────────────────

export const BUILD_CODE_PREFIX = 'DECK1:';

// 현재 파티 → 빌드 객체(위치 순서 보존).
export function exportBuild(state) {
  const party = getPartyUnits(state);
  return {
    v: 1,
    slots: party.map((u) => ({
      archetype: u.archetype, // 참고용(호환 표시)
      role: unitRole(state, u.uid),
      skills: (u.skills || []).map((s) => (s && s.id) || null),
    })),
  };
}

// 빌드 → 공유 코드 문자열(왕복 가능, base64-ish JSON).
export function encodeBuild(build) {
  const json = JSON.stringify(build);
  const b64 = typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, 'utf8').toString('base64');
  return BUILD_CODE_PREFIX + b64;
}

export function decodeBuild(code) {
  if (typeof code !== 'string' || !code.startsWith(BUILD_CODE_PREFIX)) return null;
  try {
    const b64 = code.slice(BUILD_CODE_PREFIX.length);
    const json = typeof atob === 'function'
      ? decodeURIComponent(escape(atob(b64)))
      : Buffer.from(b64, 'base64').toString('utf8');
    const build = JSON.parse(json);
    if (!build || !Array.isArray(build.slots)) return null;
    return build;
  } catch { return null; }
}

// 빌드를 현재 파티에 적용(위치 인덱스 매칭). 무료(자원 소모 없음) — 재배치일 뿐.
//   반환: { ok, applied(자리 수), skills(장착 성공 스킬 수), skipped }
export function applyBuild(state, build) {
  if (!build || !Array.isArray(build.slots)) return { ok: false, reason: '잘못된 빌드' };
  const party = getPartyUnits(state);
  let applied = 0, skills = 0, skipped = 0;
  party.forEach((u, i) => {
    const slot = build.slots[i];
    if (!slot) { skipped += 1; return; }
    applied += 1;
    // 진형 적용(전열/중열/후열). 알 수 없는 값은 전열로 폴백.
    setFormation(state, u.uid, FORMATION_ROLES.includes(slot.role) ? slot.role : 'front');
    // 스킬 로드아웃 적용(내 유닛이 열 수 있는 슬롯까지만).
    const cap = skillSlots(u);
    (slot.skills || []).forEach((sid, si) => {
      if (!sid || si >= cap) return;
      try { if (equipSkill(state, u.uid, si, sid).ok) skills += 1; } catch { /* 알 수 없는 스킬 ID 무시 */ }
    });
  });
  return { ok: applied > 0, applied, skills, skipped };
}

// 편의 래퍼: 코드 문자열을 바로 적용.
export function applyBuildCode(state, code) {
  const build = decodeBuild(code);
  if (!build) return { ok: false, reason: '잘못된 코드' };
  return applyBuild(state, build);
}
