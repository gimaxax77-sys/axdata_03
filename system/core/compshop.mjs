import { earn } from './economy.mjs';
import { getStage } from './progression.mjs';

// ─────────────────────────────────────────────────────────────
// 경쟁 상점 — 아레나 포인트 / 길드 코인의 "사용처".
// 두 재화는 지갑(wallet)이 아니라 state.arena.points / state.guild.coins 에 쌓인다.
// 여기서 그걸 소모해 실 자원(소환권·다이아·골드·정수)으로 환전한다.
// grant의 *Stage 키는 진행도(peakStage) 보상에 비례해 스케일(상점과 동일 규약).
// ─────────────────────────────────────────────────────────────

export const COMP_SHOP = {
  // 아레나 포인트(랭크전 누적)로 구매
  arena: [
    { id: 'AP_SUMMON', label: '소환권 교환', cost: 100, grant: { summon: 30 } },
    { id: 'AP_GEM', label: '다이아 교환', cost: 150, grant: { gem: 20 } },
    { id: 'AP_GOLD', label: '골드 대량', cost: 60, grant: { currencyStage: 120 } },
  ],
  // 길드 코인(보스 레이드 기여)으로 구매
  guild: [
    { id: 'GC_GROWTH', label: '정수 대량', cost: 40, grant: { growthStage: 150 } },
    { id: 'GC_SUMMON', label: '소환권 교환', cost: 80, grant: { summon: 25 } },
    { id: 'GC_GEM', label: '다이아 교환', cost: 120, grant: { gem: 25 } },
  ],
};

// 재화 종류별 잔액 접근자
function balanceOf(state, kind) {
  return kind === 'arena' ? (state.arena?.points || 0) : (state.guild?.coins || 0);
}
function deduct(state, kind, amount) {
  if (kind === 'arena') state.arena.points -= amount;
  else state.guild.coins -= amount;
}
function find(kind, id) {
  return (COMP_SHOP[kind] || []).find((p) => p.id === id);
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

// 표시용: 현재 진행도 기준 지급량 미리보기
export function compGrantPreview(state, grant) {
  return resolveGrant(state, grant);
}

// 구매 처리. 성공 시 { ok, grant, spent, balance }.
export function compPurchase(state, kind, id) {
  const p = find(kind, id);
  if (!p) return { ok: false, reason: '알 수 없는 상품' };
  const bal = balanceOf(state, kind);
  if (bal < p.cost) return { ok: false, reason: '재화 부족', need: p.cost, have: bal };
  deduct(state, kind, p.cost);
  const g = resolveGrant(state, p.grant);
  earn(state.wallet, g);
  return { ok: true, grant: g, spent: p.cost, balance: balanceOf(state, kind) };
}
