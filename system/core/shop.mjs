import { earn, spend } from './economy.mjs';
import { getStage } from './progression.mjs';
import { refreshDaily } from './daily.mjs';
import { grantPremium } from './cosmetics.mjs';

// ─────────────────────────────────────────────────────────────
// BM/상점 골격 — 3종 구매 경로:
//   · ad     : 광고 시청(무료), 하루 횟수 제한
//   · gem    : 프리미엄 재화(다이아) 소모
//   · package: 실결제(모의) — 결제 연동은 골격만, 누르면 보상 지급
//
// grant의 *Stage 키는 현재 진행도(peakStage) 보상에 비례해 스케일한다.
// ─────────────────────────────────────────────────────────────

export const SHOP = {
  ad: [
    { id: 'AD_GOLD', label: '광고 보고 골드', limit: 5, grant: { currencyStage: 60 } },
    { id: 'AD_SUMMON', label: '광고 보고 소환권', limit: 3, grant: { summon: 10 } },
    { id: 'AD_GEM', label: '광고 보고 다이아', limit: 3, grant: { gem: 5 } },
  ],
  gem: [
    { id: 'GEM_SUMMON', label: '소환권 100', cost: { gem: 60 }, grant: { summon: 100 } },
    { id: 'GEM_GOLD', label: '골드 대량', cost: { gem: 30 }, grant: { currencyStage: 200 } },
    { id: 'GEM_GROWTH', label: '정수 대량', cost: { gem: 30 }, grant: { growthStage: 200 } },
  ],
  // 금액대별 사다리 — 위로 갈수록 ₩당 다이아 가치가 커진다(고액 유도).
  package: [
    { id: 'PKG_ADFREE', label: '광고 제거 패스', krw: '₩5,500', once: true, tag: '편의', premium: true, note: '광고 없이 광고보상·오프라인 2배 자동', grant: { gem: 100 } },
    { id: 'PKG_STARTER', label: '스타터 패키지', krw: '₩4,900', once: true, tag: '입문', grant: { gem: 300, summon: 50, currencyStage: 150 } },
    { id: 'PKG_MONTHLY', label: '월정액', krw: '₩9,900', once: true, note: '즉시 다이아 + 매일 지급(골격)', grant: { gem: 300 } },
    { id: 'PKG_GROWTH', label: '성장 패키지', krw: '₩11,000', grant: { gem: 500, growthStage: 300 } },
    { id: 'PKG_VALUE', label: '특별 가치 패키지', krw: '₩29,000', tag: '인기', grant: { gem: 1800, summon: 150, growthStage: 300 } },
    { id: 'PKG_PREMIUM', label: '프리미엄 패키지', krw: '₩59,000', grant: { gem: 3800, summon: 350, currencyStage: 400, growthStage: 400 } },
    { id: 'PKG_LEGEND', label: '레전드 패키지', krw: '₩99,000', tag: '최고 가치', grant: { gem: 6600, summon: 700, growthStage: 800 } },
    { id: 'PKG_ULTIMATE', label: '궁극 후원 패키지', krw: '₩129,000', tag: '한정', grant: { gem: 9200, summon: 1000, currencyStage: 600, growthStage: 1200 } },
  ],
};

function allProducts() {
  return [...SHOP.ad, ...SHOP.gem, ...SHOP.package];
}
function find(id) {
  return allProducts().find((p) => p.id === id);
}

// grant 정의 → 실제 지급량 (진행도 스케일 반영)
function resolveGrant(state, grant) {
  const st = getStage(state.peakStage).rewards;
  const out = {};
  for (const [k, v] of Object.entries(grant)) {
    if (k === 'currencyStage') out.currency = (out.currency || 0) + Math.round(st.currency * v);
    else if (k === 'growthStage') out.growth = (out.growth || 0) + Math.round(st.growth * v);
    else out[k] = (out[k] || 0) + v;
  }
  return out;
}

export function adLeft(state, id, now = Date.now()) {
  refreshDaily(state, now);
  const p = find(id);
  return p ? p.limit - (state.daily.ads[id] || 0) : 0;
}

export function packageOwned(state, id) {
  return !!(state.shop && state.shop.purchased[id]);
}

// 구매 처리. 성공 시 { ok, grant }.
export function purchase(state, id, now = Date.now()) {
  const p = find(id);
  if (!p) return { ok: false, reason: '알 수 없는 상품' };
  refreshDaily(state, now);

  if (p.limit) { // 광고
    if ((state.daily.ads[id] || 0) >= p.limit) return { ok: false, reason: '오늘 횟수 소진' };
    const g = resolveGrant(state, p.grant);
    earn(state.wallet, g);
    state.daily.ads[id] = (state.daily.ads[id] || 0) + 1;
    return { ok: true, grant: g };
  }
  if (p.cost) { // 다이아
    if (!spend(state.wallet, p.cost)) return { ok: false, reason: '다이아 부족', cost: p.cost };
    const g = resolveGrant(state, p.grant);
    earn(state.wallet, g);
    return { ok: true, grant: g };
  }
  // 패키지 (모의 결제)
  if (p.once && packageOwned(state, id)) return { ok: false, reason: '구매 완료' };
  const g = resolveGrant(state, p.grant);
  earn(state.wallet, g);
  state.shop = state.shop || { purchased: {} };
  if (p.once) state.shop.purchased[id] = true;
  if (p.premium) grantPremium(state); // 광고제거 패스 활성화
  // 과금 등급(VIP) — 누적 결제액 적립(코스튬 해금용). krw 문자열에서 숫자만 추출.
  const krw = parseInt(String(p.krw || '').replace(/[^0-9]/g, ''), 10) || 0;
  if (krw) { state.vip = state.vip || { spend: 0 }; state.vip.spend += krw; }
  return { ok: true, grant: g, mock: true, premium: !!p.premium };
}
