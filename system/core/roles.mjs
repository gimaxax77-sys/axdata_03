// ─────────────────────────────────────────────────────────────
// 역할(Role) · 권한(Permission) — 공급자 무관 순수 로직(테스트 가능).
//   "이 사람이 무엇을 할 수 있나"만 판정한다. 서버·DB·로그인 방식은 모른다.
//
//   3단 위계:  user(일반) < manager(매니저) < admin(운영자)
//     · user    : 자기 계정 플레이·세이브
//     · manager : 공지·이벤트·우편 발송, 문의 처리 (밸런스 변경 불가)
//     · admin   : 밸런스 조정, 계정 제재, 재화 지급, 역할 부여 (전권)
//
//   ⚠ 클라이언트의 판정은 "화면 노출용"일 뿐이다. 실제 보안 경계는
//      서버(Supabase RLS + 서버 검증)가 최종적으로 강제한다. (README_SUPABASE.md §4)
// ─────────────────────────────────────────────────────────────

// 역할 서열(숫자가 클수록 상위). 알 수 없는 값은 최하위로 취급.
export const ROLES = { user: 0, manager: 1, admin: 2 };
export const ROLE_IDS = ['user', 'manager', 'admin'];
export const ROLE_LABEL = { user: '일반', manager: '매니저', admin: '운영자' };
export const DEFAULT_ROLE = 'user';

// 권한(액션) → 요구되는 최소 역할.
// 새 액션은 여기에 한 줄 추가하면 전 화면·서버가 같은 기준을 공유한다.
export const PERMISSIONS = {
  // ── 일반(user) ──
  play: 'user',            // 게임 플레이
  cloudSave: 'user',       // 클라우드 세이브
  editOwnAccount: 'user',  // 자기 계정 설정

  // ── 매니저(manager) ──
  sendNotice: 'manager',   // 공지 발송
  sendMail: 'manager',     // 우편(재화 첨부 X) 발송
  manageEvent: 'manager',  // 이벤트 켜기/끄기
  viewReports: 'manager',  // 문의·신고 열람

  // ── 운영자(admin) ──
  tuneBalance: 'admin',    // 밸런스 배수/배율 조정
  banAccount: 'admin',     // 계정 제재
  grantCurrency: 'admin',  // 재화 지급
  setRole: 'admin',        // 다른 계정의 역할 부여
};

// 역할 문자열 → 서열 숫자(모르는 값은 -1 → 어떤 권한도 불충족).
export function roleRank(role) {
  return Object.prototype.hasOwnProperty.call(ROLES, role) ? ROLES[role] : -1;
}

// 유효한 역할 문자열인가.
export function isRole(role) {
  return Object.prototype.hasOwnProperty.call(ROLES, role);
}

// role이 need 이상인가. (예: atLeast('admin','manager') === true)
export function atLeast(role, need) {
  return roleRank(role) >= roleRank(need);
}

// role이 특정 액션을 수행할 수 있나. 미정의 액션은 안전하게 거부.
export function can(role, action) {
  const need = PERMISSIONS[action];
  if (need === undefined) return false;
  return atLeast(role, need);
}

// role이 수행 가능한 액션 목록(UI 게이팅·디버그용).
export function allowedActions(role) {
  return Object.keys(PERMISSIONS).filter((a) => can(role, a));
}

// 안전 정규화 — null/미상/잘못된 값은 기본 역할로.
export function normalizeRole(role) {
  return isRole(role) ? role : DEFAULT_ROLE;
}
