// ─────────────────────────────────────────────────────────────
// 속성 상성 — 장르/컨셉 무관한 고정 규칙 (원형과 같은 취급).
// Core는 속성 ID만 안다. 표시명(불/열 …)은 Concept가 매핑한다.
//
//   상성 순환: FIRE > WOOD > WATER > FIRE   (가위바위보)
//             LIGHT ↔ DARK                 (서로 유리)
// ─────────────────────────────────────────────────────────────

import { isOn } from './features.mjs';

export const ELEMENTS = ['FIRE', 'WATER', 'WOOD', 'LIGHT', 'DARK'];

// key가 value를 이긴다.
const BEATS = { FIRE: 'WOOD', WOOD: 'WATER', WATER: 'FIRE', LIGHT: 'DARK', DARK: 'LIGHT' };

const ADVANTAGE = 1.3; // 유리 시 피해 배수
const DISADVANTAGE = 0.8; // 불리 시 피해 배수

// 공격자 속성이 방어자 속성에 대해 갖는 피해 배수.
export function affinity(atk, def) {
  if (!isOn('elements')) return 1; // 속성 옵션 off → 상성 무관(스탯 전용)
  if (!atk || !def) return 1; // 속성 없으면 무관
  if (BEATS[atk] === def) return ADVANTAGE;
  if (BEATS[def] === atk) return DISADVANTAGE;
  return 1;
}

export function affinityLabel(atk, def) {
  const m = affinity(atk, def);
  return m > 1 ? '유리' : m < 1 ? '불리' : '무관';
}
