// ─────────────────────────────────────────────────────────────
// 운영자 콘솔 — 순수 로직(테스트 가능).
//   매니저/운영자가 공지·이벤트를 "원격 설정(remote_config)"에 기록하면
//   모든 플레이어가 기존 공지 배너로 자동 표시한다(remoteConfig 로더 재사용).
//
//   여기서는 입력 검증 + 기록할 { key, value } 구성만 담당한다.
//   실제 저장/보안은 Supabase(RLS: manager/admin만 쓰기)가 강제한다.
// ─────────────────────────────────────────────────────────────

import { can } from './roles.mjs';

export const NOTICE_MAX = 140; // 공지 최대 길이(배너 2줄 기준)

// 공지/이벤트 텍스트 정규화·검증. { ok, text?, reason? }
export function validateNotice(text) {
  const t = (text == null ? '' : String(text)).trim();
  if (!t) return { ok: false, reason: '내용을 입력하세요' };
  if (t.length > NOTICE_MAX) return { ok: false, reason: `최대 ${NOTICE_MAX}자까지 가능합니다 (현재 ${t.length}자)` };
  return { ok: true, text: t };
}

// 공지 설정 구성 → remote_config 에 넣을 { key, value(JSON 문자열) }.
export function buildNoticeConfig(text, { url = null } = {}) {
  const v = validateNotice(text);
  if (!v.ok) return v;
  const payload = url ? { text: v.text, url } : { text: v.text };
  return { ok: true, key: 'notice', value: JSON.stringify(payload) };
}

// 이벤트 배너 설정 구성.
export function buildEventConfig(text) {
  const v = validateNotice(text);
  if (!v.ok) return v;
  return { ok: true, key: 'event', value: JSON.stringify({ text: v.text }) };
}

// 우편 보상으로 허용되는 재화 키(economy wallet 과 일치).
export const MAIL_REWARD_KEYS = ['currency', 'gem', 'summon', 'growth'];

// 우편 발송 페이로드 검증·정리. { ok, title, rewards } | { ok:false, reason }.
//   제목만 있으면 발송 가능(안내 우편). rewards는 선택 — 0/음수/빈값은 제거.
export function buildMailPayload({ title, rewards = {} } = {}) {
  const t = (title == null ? '' : String(title)).trim();
  if (!t) return { ok: false, reason: '우편 제목을 입력하세요' };
  if (t.length > NOTICE_MAX) return { ok: false, reason: `제목은 최대 ${NOTICE_MAX}자입니다` };
  const clean = {};
  for (const k of MAIL_REWARD_KEYS) {
    const n = Math.floor(Number(rewards[k]));
    if (Number.isFinite(n) && n > 0) clean[k] = n;
  }
  return { ok: true, title: t, rewards: clean };
}

// 역할이 콘솔에 들어올 수 있나(공지 발송 권한 = 매니저 이상).
export function canOpenConsole(role) {
  return can(role, 'sendNotice');
}

// 역할이 각 콘솔 액션을 할 수 있나 → UI 활성/비활성 판단용.
export function consoleCapabilities(role) {
  return {
    notice: can(role, 'sendNotice'),
    event: can(role, 'manageEvent'),
    balance: can(role, 'tuneBalance'), // 운영자 조작(밸런스)은 admin만
  };
}
