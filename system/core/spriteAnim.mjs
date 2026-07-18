// ─────────────────────────────────────────────────────────────
// 스프라이트 시트 프레임 애니메이션 — 순수 계산(장르/UI 무관).
//   3D→2D 프리렌더(경로 Y) 스프라이트를 RN/웹 컴포넌트가 이 값으로 렌더한다.
//   가로 스트립 규약: N프레임이 좌→우로 배열, 프레임 i의 x오프셋 = -i*frameW.
//   docs/ART_PIPELINE_3D.md §3~5 참조.
// ─────────────────────────────────────────────────────────────

// 시트 폭 → 프레임 수(가로 스트립).
export function frameCount(sheetWidth, frameW) {
  if (!frameW || frameW <= 0) return 1;
  return Math.max(1, Math.floor(sheetWidth / frameW));
}

// 경과 시간(ms) → 현재 프레임 인덱스.
//   loop=true: 순환 재생. loop=false: 마지막 프레임에서 정지(1회 재생).
export function frameAt(elapsedMs, fps, frames, loop = true) {
  if (frames <= 1 || fps <= 0) return 0;
  const idx = Math.floor(Math.max(0, elapsedMs) / (1000 / fps));
  return loop ? (idx % frames) : Math.min(idx, frames - 1);
}

// 프레임 인덱스 → 배경 x오프셋(px). 음수(왼쪽으로 이동).
export function frameOffsetX(frameIndex, frameW) {
  return frameIndex ? -frameIndex * frameW : 0; // 0에서 -0 방지
}

// 1회 재생 상태가 끝났는지(공격/피격/사망 전환 판정용).
export function isPlaybackDone(elapsedMs, fps, frames) {
  if (frames <= 1 || fps <= 0) return true;
  return elapsedMs >= (frames / fps) * 1000;
}

// 전투 상태별 재생 규약(기본값). fps·순환 여부.
// 16프레임 기준 fps — 8프레임 대비 재생 시간은 같게 유지하며 부드러움만 2배.
export const SPRITE_STATES = {
  idle: { loop: true, fps: 20 },
  attack: { loop: false, fps: 28 },
  hit: { loop: false, fps: 24 },
  walk: { loop: false, fps: 20 }, // 한 걸음 사이클 1회(웨이브 전진 연출)
  death: { loop: false, fps: 20 },
  spawn: { loop: false, fps: 24 },
};

// 상태 정의 조회(미정의 상태는 idle 규약으로 폴백).
export function stateSpec(state) {
  return SPRITE_STATES[state] || SPRITE_STATES.idle;
}
