// ─────────────────────────────────────────────────────────────
// 본진(마을) 시각 발전 — 진행도가 오를수록 본진이 커지고 화려해지는 '소유의 만족감'.
//   숫자만 오르는 게 아니라 화면 속 거점이 성장하는 것을 보게 한다.
//   순수 표시 데이터(능력치 무관). 현재 tier를 쓰는 화면 없음(픽셀 화면 제거로 UI 미연결).
// ─────────────────────────────────────────────────────────────

// 진행도(peakStage) 마일스톤 → 발전 단계. 오를 때마다 거점이 한 단계 커진다.
export const VILLAGE_TIERS = [
  { min: 0, id: 'camp', label: '야영지', emoji: '⛺', desc: '천막 몇 채와 모닥불.' },
  { min: 20, id: 'outpost', label: '전초 기지', emoji: '🏕️', desc: '목책과 망루가 세워졌다.' },
  { min: 60, id: 'hamlet', label: '작은 마을', emoji: '🏘️', desc: '집과 대장간이 들어섰다.' },
  { min: 150, id: 'town', label: '성읍', emoji: '🏰', desc: '성벽과 시장이 번성한다.' },
  { min: 400, id: 'citadel', label: '요새 도시', emoji: '🏯', desc: '거대한 성채가 하늘을 찌른다.' },
  { min: 1000, id: 'capital', label: '수도', emoji: '🌆', desc: '엘드리아의 심장, 빛나는 수도.' },
];

// peakStage → 현재 발전 단계(+다음 단계까지 진행 정보).
export function villageTier(peakStage = 1) {
  let idx = 0;
  for (let i = 0; i < VILLAGE_TIERS.length; i++) {
    if (peakStage >= VILLAGE_TIERS[i].min) idx = i; else break;
  }
  const cur = VILLAGE_TIERS[idx];
  const next = VILLAGE_TIERS[idx + 1] || null;
  const progress = next
    ? Math.min(1, (peakStage - cur.min) / (next.min - cur.min))
    : 1;
  return { ...cur, index: idx, next, progress };
}
