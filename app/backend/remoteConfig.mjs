import { applyOverrides } from '../../system/core/admin.mjs';

// ─────────────────────────────────────────────────────────────
// 원격 설정(Remote Config) 로더 — 앱 재배포 없이 밸런스/공지/이벤트를 조정.
//   · balance: { '<path>': value } → admin.applyOverrides 재사용(BALANCE 라이브 반영)
//   · notice : { text, url? }        → 공지 배너 표시용
//   · event  : { text, ... }         → 이벤트 배너 표시용
// 서버 미설정 시 이 로더는 호출되지 않아 로컬 기본값을 그대로 쓴다.
// ─────────────────────────────────────────────────────────────

// Firebase Remote Config 값은 "문자열"로 오므로 JSON 파싱해 객체화한다.
// 이미 객체면 그대로 둔다.
export function parseRemoteConfig(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    if (typeof v === 'string') {
      const t = v.trim();
      if (t === '') continue;
      try { out[k] = JSON.parse(t); } catch { out[k] = v; }
    } else if (v != null) {
      out[k] = v;
    }
  }
  return out;
}

// 파싱된 설정을 적용. balance는 BALANCE에 반영, notice/event는 표시용 반환.
export function applyRemoteConfig(cfg) {
  const c = cfg || {};
  let applied = 0;
  if (c.balance && typeof c.balance === 'object') {
    applyOverrides(c.balance); // ADMIN_FIELDS에 등록된 경로만 반영(안전)
    applied = Object.keys(c.balance).length;
  }
  return {
    applied,
    notice: c.notice && c.notice.text ? c.notice : null,
    event: c.event && c.event.text ? c.event : null,
  };
}

// 원격 raw → 적용까지 한 번에.
export function loadRemoteConfig(raw) {
  return applyRemoteConfig(parseRemoteConfig(raw));
}
