// ─────────────────────────────────────────────────────────────
// 스테이지 진행 사다리 — 장르/컨셉 무관.
// 스테이지 n이 오를수록 적이 강해지고 보상이 커진다.
// 무한 스테이지를 공식으로 생성(데이터 테이블 대신 함수형).
//
// 밸런스 상수는 core/balance.mjs 에 모여 있다 (시뮬레이터가 튜닝).
// ─────────────────────────────────────────────────────────────

import { BALANCE } from './balance.mjs';
import { ELEMENTS } from './elements.mjs';
export { BALANCE }; // 하위호환: 기존 import 경로 유지

// 속성 구역(밴드) — 층을 STAGE_BAND개씩 한 속성으로 묶어 예측 가능하게 나눈다.
//   층1~3 불 · 4~6 물 · 7~9 숲 · 10~12 빛 · 13~15 어둠 · 16~18 불 …
export const STAGE_BAND = 3;
export function stageElement(stage) {
  return ELEMENTS[Math.floor((stage - 1) / STAGE_BAND) % ELEMENTS.length];
}
// 구역 정보 (UI 표시용): 현재 속성, 구역 시작/끝, 다음 구역 속성.
export function stageZone(stage) {
  const idx = Math.floor((stage - 1) / STAGE_BAND);
  const start = idx * STAGE_BAND + 1;
  return {
    element: stageElement(stage),
    start, end: start + STAGE_BAND - 1,
    within: stage - start + 1, size: STAGE_BAND,
    nextElement: ELEMENTS[(idx + 1) % ELEMENTS.length],
  };
}

// stage: 1부터 시작하는 정수
export function getStage(stage) {
  const g = Math.pow(BALANCE.enemyGrowth, stage - 1);
  const r = Math.pow(BALANCE.rewardGrowth, stage - 1);
  return {
    stage,
    challenge: {
      hp: Math.round(BALANCE.enemyBase.hp * g),
      atk: Math.round(BALANCE.enemyBase.atk * g),
      def: Math.round(BALANCE.enemyBase.def * g),
      element: stageElement(stage), // 속성 구역(밴드)
    },
    rewards: {
      // 컨셉 무관한 자원 키. 컨셉이 표시명을 붙인다.
      currency: Math.round(BALANCE.rewardBase.currency * r),
      growth: Math.round(BALANCE.rewardBase.growth * r),
    },
  };
}
