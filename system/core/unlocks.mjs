// ─────────────────────────────────────────────────────────────
// 콘텐츠 게이팅 — 기능별 해금 요구 스테이지(peakStage 기준).
// 문서 권장(소환20 · 골드던전30 · 강화석던전50 · 펫100 · 아레나200 · 길드300)은
// 더 긴 수명을 가정. 본 빌드 곡선(7일 ≈ 57층)에 맞춰 실제 경험되도록 조정했다.
// 값은 데이터라 언제든 프로덕션 수치로 바꿀 수 있다.
// ─────────────────────────────────────────────────────────────

export const UNLOCKS = {
  gacha: 8,           // 소환 — R2 스타터가 레벨업만으로 도달(~10층) 가능해
                      //         "레벨업 → 팀 구성" 온보딩 루프가 자연스럽게 열린다.
  dungeonGold: 20,    // 골드 던전
  dungeonEssence: 35, // 정수(강화석) 던전
  pets: 45,           // 펫
  emblem: 50,         // 엠블럼(문장) — 다이아 소비 계정 성장(펫 이후 노출)
  arena: 55,          // 아레나 (경쟁)
  guardian: 60,       // 정령/가디언 — 다이아 소환 소환수
  tower: 40,          // 무한의 탑 (엔드게임 도전)
  guild: 75,          // 길드 (경쟁)
};

export function unlockStage(feature) {
  return UNLOCKS[feature] ?? 0;
}
export function isUnlocked(state, feature) {
  return (state.peakStage || 1) >= unlockStage(feature);
}
