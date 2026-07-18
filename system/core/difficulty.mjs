import { getStage } from './progression.mjs';

// ─────────────────────────────────────────────────────────────
// 스테이지 난이도 티어 — 방치 진행에 적·보상 배수를 건다.
//   · 상위 난이도일수록 적이 강해지지만 보상 배수도 크다(고위험·고보상).
//   · 역대 최고 층(peakStage)로 해금.
//   · 방치 진행은 선택 난이도에서 "이길 수 있는 최심 층"으로 자동 정착한다
//     (idle.tick이 하강/전진으로 조정) → 어떤 난이도든 파밍이 성립.
// ─────────────────────────────────────────────────────────────
// 배수 설계: 적 배수는 완만, 보상 배수는 넉넉하게 → 스테이지가 조금 내려가도
// 순수입은 늘어(감당 가능한 유저에게 명확한 이득). 상위 난이도일수록 순이득↑.
// 시뮬로 튜닝: 적 배수(완만)보다 보상 배수를 크게 잡아, 감당 가능한 유저는
// 상위 난이도일수록 시간당 순수입이 확실히 는다(일반 대비 험난 ~2.2×, 나락 ~2.5×).
// eva=적 회피(우리 명중으로 상쇄) · acc=적 명중(우리 회피를 상쇄). 상위 난이도일수록↑.
export const DIFFICULTIES = [
  { id: 'normal', label: '일반', emoji: '🟢', enemyMult: 1, rewardMult: 1, unlock: 1, eva: 0, acc: 0 },
  { id: 'hard', label: '험난', emoji: '🟡', enemyMult: 2, rewardMult: 8, unlock: 30, eva: 0.15, acc: 0.10 },
  { id: 'hell', label: '지옥', emoji: '🔴', enemyMult: 4, rewardMult: 40, unlock: 60, eva: 0.25, acc: 0.20 },
  { id: 'abyss', label: '나락', emoji: '🟣', enemyMult: 8, rewardMult: 200, unlock: 100, eva: 0.35, acc: 0.30 },
];

export function difficultyDef(id) {
  return DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[0];
}
export function difficultyUnlocked(state, id) {
  return (state.peakStage || 1) >= difficultyDef(id).unlock;
}

// 난이도 배수를 반영한 스테이지 (방치 진행 전용). getStage에 배수만 곱한다.
export function playStage(state, stage = state.stage) {
  const base = getStage(stage);
  const d = difficultyDef(state.difficulty || 'normal');
  return {
    ...base,
    challenge: {
      ...base.challenge,
      hp: Math.round(base.challenge.hp * d.enemyMult),
      atk: Math.round(base.challenge.atk * d.enemyMult),
      def: Math.round(base.challenge.def * d.enemyMult),
      eva: d.eva || 0, // 적 회피 → 우리 명중으로 상쇄
      acc: d.acc || 0, // 적 명중 → 우리 회피를 상쇄
    },
    rewards: {
      currency: Math.round(base.rewards.currency * d.rewardMult),
      growth: Math.round(base.rewards.growth * d.rewardMult),
    },
    difficulty: d,
  };
}

// 난이도 변경 (해금 검사). 방치 진행은 다음 틱에 자동 재정착.
export function setDifficulty(state, id) {
  if (!difficultyUnlocked(state, id)) return { ok: false, reason: '미해금 난이도' };
  state.difficulty = id;
  return { ok: true, difficulty: id };
}
