// 재화 낭비 알림 — 쌓아두면 손해인 재화가 충분히 모였을 때 사용을 권한다.
//   소환 재화는 소환 외 쓸 곳이 없어, 방치하면 그대로 낭비다(피로도 제로 보조).
import { PULL_COST } from './gacha.mjs';

// 10연차 1회분 이상 소환 재화가 쌓이면 알린다.
const SUMMON_NUDGE = PULL_COST.summon * 10;

export function spendNudges(state) {
  const w = state.wallet || {};
  const out = [];
  if ((w.summon || 0) >= SUMMON_NUDGE) {
    const pulls = Math.floor((w.summon || 0) / (PULL_COST.summon * 10));
    out.push({ key: 'summon', pulls, msg: `🔮 소환 재화 넉넉 — 10연 ${pulls}회 가능` });
  }
  return out;
}
