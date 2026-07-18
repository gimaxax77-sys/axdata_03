import { spend } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 개성(코스메틱) — 윤리적 BM 축. "과시/편의"에 값을 매기되 전투력엔 무관.
//   · 프로필 프레임 · 칭호  : 순수 외형(능력치 0)
//   · 프로필(닉네임·대표영웅) : 계정 정체성 커스터마이즈
//   · 광고제거 프리미엄 패스  : 편의 구매(pay-for-convenience, 비 pay-to-win)
// 어떤 항목도 stats/확률에 관여하지 않는다 — 코어는 이를 강제 보장한다.
// ─────────────────────────────────────────────────────────────

// 프로필 프레임 (순수 외형)
export const PROFILE_FRAMES = {
  none: { id: 'none', label: '기본', emoji: '◻️', cost: null },
  bronze: { id: 'bronze', label: '청동 테', emoji: '🟫', cost: { gem: 300 } },
  silver: { id: 'silver', label: '은빛 테', emoji: '⬜', cost: { gem: 800 } },
  gold: { id: 'gold', label: '황금 테', emoji: '🟨', cost: { gem: 2000 } },
  mythic: { id: 'mythic', label: '신화 테', emoji: '🟪', cost: { gem: 5000 } },
};

// 칭호 (순수 외형)
export const PROFILE_TITLES = {
  none: { id: 'none', label: '칭호 없음', cost: null },
  novice: { id: 'novice', label: '견습 조련사', cost: { gem: 200 } },
  hunter: { id: 'hunter', label: '심연 사냥꾼', cost: { gem: 1000 } },
  legend: { id: 'legend', label: '엘드리아의 전설', cost: { gem: 3000 } },
};

const CATALOG = { frame: PROFILE_FRAMES, title: PROFILE_TITLES };
export const PROFILE_NAME_MAX = 12;
export const DEFAULT_PROFILE_NAME = '조련사';

// 내부: profile 구조 보장.
function ensure(state) {
  state.profile = state.profile || {};
  const p = state.profile;
  p.owned = p.owned || {};
  p.owned.frame = p.owned.frame || {};
  p.owned.title = p.owned.title || {};
  return p;
}

// 표시용 정규화 프로필.
export function getProfile(state) {
  const p = state.profile || {};
  return {
    name: p.name || DEFAULT_PROFILE_NAME,
    avatarUid: p.avatarUid || null,
    frame: p.frame || 'none',
    title: p.title || 'none',
    premium: !!p.premium,
    owned: {
      frame: { none: true, ...(p.owned && p.owned.frame) },
      title: { none: true, ...(p.owned && p.owned.title) },
    },
  };
}

export function setProfileName(state, name) {
  const n = String(name || '').trim();
  if (!n) return { ok: false, reason: '이름을 입력하세요' };
  if (n.length > PROFILE_NAME_MAX) return { ok: false, reason: `최대 ${PROFILE_NAME_MAX}자` };
  ensure(state).name = n;
  return { ok: true, name: n };
}

// 대표 영웅(아바타) — 보유 유닛만.
export function setAvatar(state, uid) {
  if (uid && !(state.units || []).some((u) => u.uid === uid)) return { ok: false, reason: '보유하지 않은 영웅' };
  ensure(state).avatarUid = uid || null;
  return { ok: true, avatarUid: uid || null };
}

export function ownsCosmetic(state, kind, id) {
  if (id === 'none') return true;
  return !!(state.profile && state.profile.owned && state.profile.owned[kind] && state.profile.owned[kind][id]);
}

// 코스메틱 구매 — 다이아 소모. 능력치 없음.
export function buyCosmetic(state, kind, id) {
  const item = CATALOG[kind] && CATALOG[kind][id];
  if (!item) return { ok: false, reason: '없는 항목' };
  if (ownsCosmetic(state, kind, id)) return { ok: false, reason: '이미 보유' };
  if (item.cost && !spend(state.wallet, item.cost)) return { ok: false, reason: '다이아 부족', cost: item.cost };
  ensure(state).owned[kind][id] = true;
  return { ok: true, kind, id, cost: item.cost || null };
}

// 장착 — 보유 항목만.
export function equipCosmetic(state, kind, id) {
  if (!(CATALOG[kind] && CATALOG[kind][id])) return { ok: false, reason: '없는 항목' };
  if (!ownsCosmetic(state, kind, id)) return { ok: false, reason: '미보유' };
  ensure(state)[kind] = id;
  return { ok: true, kind, id };
}

// ── 광고제거 프리미엄 패스 ──────────────────────────────────
// 광고 시청 없이도 광고 보상/오프라인 2배를 자동 지급받는 편의 상품.
// 능력치·드롭률·확률에는 일절 관여하지 않는다.
export function hasPremium(state) {
  return !!(state.profile && state.profile.premium);
}
export function grantPremium(state) {
  ensure(state).premium = true;
  return { ok: true };
}
