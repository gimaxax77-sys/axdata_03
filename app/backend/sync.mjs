// ─────────────────────────────────────────────────────────────
// 클라우드 세이브 동기화 — 공급자 무관 순수 로직(테스트 가능).
//   세이브를 "봉투(envelope)"로 감싸 로컬↔원격을 비교·선택한다.
//   봉투: { blob, version, progress, updatedAt }
//     · blob      : serialize() 문자열 (그대로 저장)
//     · version   : SAVE_VERSION (스키마 버전)
//     · progress  : 진행도 단조 지표(peakStage 등) — 진행 손실 방지의 핵심
//     · updatedAt : 마지막 기록 시각(ms)
//
// 충돌 해결 정책(진행 손실 최소화 우선):
//   1) 스키마 version 높은 쪽 우선(구버전이 신버전을 덮지 않게)
//   2) progress 큰 쪽 우선(오래된 기기가 더 나간 진행을 덮지 않게)
//   3) updatedAt 최신 우선
// ─────────────────────────────────────────────────────────────

export function cloudDocPath(uid) {
  return `users/${uid}`;
}

export function makeEnvelope({ blob, version = 0, progress = 0, now = Date.now() } = {}) {
  return { blob, version, progress, updatedAt: now };
}

// 로컬/원격 봉투 중 어느 것을 채택할지 결정. remote/local은 봉투 또는 null.
export function chooseSave(local, remote) {
  if (!remote || !remote.blob) return { pick: 'local', reason: 'no-remote' };
  if (!local || !local.blob) return { pick: 'remote', reason: 'no-local' };

  const lv = local.version || 0, rv = remote.version || 0;
  if (rv > lv) return { pick: 'remote', reason: 'version' };
  if (lv > rv) return { pick: 'local', reason: 'version' };

  const lp = local.progress || 0, rp = remote.progress || 0;
  if (rp > lp) return { pick: 'remote', reason: 'progress' };
  if (lp > rp) return { pick: 'local', reason: 'progress' };

  const lu = local.updatedAt || 0, ru = remote.updatedAt || 0;
  if (ru > lu) return { pick: 'remote', reason: 'updatedAt' };
  return { pick: 'local', reason: 'updatedAt' };
}

// 상태에서 진행도 지표 추출(단조 증가하는 peakStage 기반).
export function saveProgress(state) {
  if (!state) return 0;
  return (state.peakStage || 0) * 1000 + (state.maxStage || 0);
}
