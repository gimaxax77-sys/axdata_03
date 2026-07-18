import { isUnlocked, unlockStage } from './unlocks.mjs';
import { MAX_PARTY } from './gameState.mjs';

// ─────────────────────────────────────────────────────────────
// 온보딩 목표 — 다음에 뭘 해야 하는지 state에서 유도한다(코치마크 대신 목표 배너).
// 핵심 루프를 순서대로 가르친다: 레벨업 → 소환 해금 → 팀 구성.
// id는 Concept가 현지화 텍스트를 붙이고, tab은 이동 안내에 쓴다.
// null 반환 = 온보딩 완료(배너 숨김).
// ─────────────────────────────────────────────────────────────

export function nextObjective(state) {
  const units = state.units || [];
  const gachaOpen = isUnlocked(state, 'gacha');

  // 1) 아직 팀 없음 + 소환 미해금 → 레벨업으로 강해져 소환 해금 스테이지 도달
  if (units.length <= 1 && !gachaOpen) {
    return { id: 'level', tab: 'roster', target: unlockStage('gacha') };
  }
  // 2) 소환 열림 + 아직 혼자 → 소환으로 파티원 확보
  if (gachaOpen && units.length <= 1) {
    return { id: 'summon', tab: 'gacha' };
  }
  // 3) 유닛 2+ 인데 편성이 1명 → 파티 편성
  if (units.length >= 2 && (state.party || []).length < Math.min(2, MAX_PARTY)) {
    return { id: 'party', tab: 'roster' };
  }
  // ── 중반 힌트: 신규 시스템 발견성 (해금됐지만 아직 안 쓴 경우 1회성 안내) ──
  // 4) 환생 가능한데 미실행 → 영구 성장 안내
  if ((state.maxStage || 1) >= 15 && (state.prestige || 0) === 0) {
    return { id: 'prestige', tab: 'idle' };
  }
  // 5) 파티 2+ · 진형 미설정 → 전열/후열 전략 안내
  const formationSet = state.formation && Object.keys(state.formation).length > 0;
  if ((state.party || []).length >= 2 && !formationSet && (state.peakStage || 1) >= 20) {
    return { id: 'formation', tab: 'roster' };
  }
  // 6) 아레나 열림 · 한 번도 대전 안 함 → 전투력 리그 안내
  const ladderPts = state.ladders && Object.values(state.ladders).some((l) => (l && l.points) > 0);
  if (isUnlocked(state, 'arena') && (state.arena && state.arena.points || 0) === 0 && !ladderPts) {
    return { id: 'arena', tab: 'arena' };
  }
  // 7) 완료
  return null;
}
