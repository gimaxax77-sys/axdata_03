import { earn } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 우편함 — 지연 보상 수령함(순위 정산·이벤트·운영 보상).
//   서버 연동 전에는 로컬에서 정산 보상을 여기에 넣고 수령한다.
//   서버 연동 시 서버가 우편을 push하고 클라는 동일 UI로 수령.
// mail: { id, title, reward:{gem,currency,...}, ts, claimed }
// ─────────────────────────────────────────────────────────────

let _mseq = 0;
export function ensureMailSeq(n) { if (n > _mseq) _mseq = n; }

function ensure(state) {
  state.mail = state.mail || [];
  return state.mail;
}

export function addMail(state, { title, reward = {}, ts = Date.now() } = {}) {
  const box = ensure(state);
  const mail = { id: `m${++_mseq}`, title: title || '보상', reward, ts, claimed: false };
  box.push(mail);
  // 오래된 수령 완료 우편 정리(최근 100통 유지).
  if (box.length > 100) state.mail = box.slice(-100);
  return mail;
}

export function mailList(state) {
  return (state.mail || []).slice().sort((a, b) => b.ts - a.ts);
}
export function unreadMailCount(state) {
  return (state.mail || []).filter((m) => !m.claimed).length;
}

export function claimMail(state, id) {
  const m = (state.mail || []).find((x) => x.id === id);
  if (!m) return { ok: false, reason: '없는 우편' };
  if (m.claimed) return { ok: false, reason: '이미 수령' };
  earn(state.wallet, m.reward || {});
  m.claimed = true;
  return { ok: true, reward: m.reward };
}

export function claimAllMail(state) {
  const got = [];
  for (const m of state.mail || []) {
    if (!m.claimed) { earn(state.wallet, m.reward || {}); m.claimed = true; got.push(m.id); }
  }
  return { ok: got.length > 0, claimed: got.length };
}

// QoL: 수령 완료(읽은) 우편을 우편함에서 제거. 미수령 우편은 남긴다.
export function clearClaimedMail(state) {
  const box = state.mail || [];
  const kept = box.filter((m) => !m.claimed);
  const removed = box.length - kept.length;
  state.mail = kept;
  return { ok: removed > 0, removed };
}
