// ─────────────────────────────────────────────────────────────
// Supabase 클라우드 제공자 (템플릿)
//
// 사용법:
//   1) `npm i @supabase/supabase-js`
//   2) 이 파일을 `app/backend/supabaseImpl.js` 로 복사
//   3) app.json 의 expo.extra.supabase 에 프로젝트 값을 넣는다:
//        "extra": { "supabase": { "url": "https://xxxx.supabase.co",
//          "anonKey": "eyJhbGciOi..." } }
//      (anonKey = 공개 키 — 클라이언트에 넣어도 안전. RLS가 데이터를 지킵니다.)
//   4) backend/supabase/schema.sql 을 Supabase SQL Editor 에서 1회 실행.
//   5) 앱 진입(App.js 최상단)에서 한 번 import:  import './app/backend/supabaseImpl';
//      → globalThis.__ELDRIA_CLOUD__ 에 provider가 등록되어 계정·세이브가 켜진다.
//
// 미설정 시 이 파일을 import 하지 않으면 앱은 로컬 전용으로 동작한다(오프라인 보장).
// ─────────────────────────────────────────────────────────────

import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

// 설정 출처: (1) EXPO_PUBLIC_ 환경변수(.env — 웹·네이티브 빌드에 새겨짐, 권장)
//           (2) app.json 의 expo.extra.supabase (네이티브 폴백)
const extra = (Constants.expoConfig?.extra || Constants.manifest?.extra || {}).supabase || {};
const SB_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.url;
const SB_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.anonKey;

if (SB_URL && SB_KEY) {
  const sb = createClient(SB_URL, SB_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  let currentUser = null; // { uid, email, role }

  // 로그인 세션에서 프로필(역할)까지 붙여 currentUser 를 채운다.
  async function hydrate(authUser) {
    if (!authUser) { currentUser = null; return null; }
    let role = 'user', banned = false;
    try {
      const { data } = await sb
        .from('profiles').select('role, banned')
        .eq('id', authUser.id).single();
      if (data) { role = data.role || 'user'; banned = !!data.banned; }
    } catch { /* 프로필 조회 실패 시 기본값 유지 */ }
    currentUser = { uid: authUser.id, email: authUser.email, role, banned };
    return currentUser;
  }

  // 앱 시작 시 기존 세션 복구 + 세션 변화 구독.
  sb.auth.getUser().then(({ data }) => hydrate(data?.user)).catch(() => {});
  sb.auth.onAuthStateChange((_evt, session) => { hydrate(session?.user); });

  globalThis.__ELDRIA_CLOUD__ = {
    available: () => true,
    user: () => currentUser,                 // { uid, email, role, banned } | null
    role: () => (currentUser ? currentUser.role : null),

    // ── 계정(이메일) ──
    async signUp({ email, password }) {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) return { ok: false, reason: error.message };
      await hydrate(data.user);
      return { ok: true, uid: data.user?.id, role: currentUser?.role };
    },
    async signInWithEmail({ email, password }) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, reason: error.message };
      await hydrate(data.user);
      return { ok: true, uid: data.user?.id, role: currentUser?.role };
    },
    // cloud.js 파사드 호환용(익명 대신 세션 확인).
    async signIn() {
      const { data } = await sb.auth.getUser();
      if (!data?.user) return { ok: false, reason: 'no-session' };
      await hydrate(data.user);
      return { ok: true, uid: data.user.id, role: currentUser?.role };
    },
    async signOut() { await sb.auth.signOut(); currentUser = null; },

    // ── 클라우드 세이브(봉투: { blob, version, progress, updatedAt }) ──
    async pull() {
      if (!currentUser) return null;
      const { data } = await sb
        .from('saves').select('blob, version, progress, updated_at')
        .eq('user_id', currentUser.uid).single();
      if (!data) return null;
      return { blob: data.blob, version: data.version, progress: data.progress, updatedAt: new Date(data.updated_at).getTime() };
    },
    async push(envelope) {
      if (!currentUser) return { ok: false, reason: 'no-user' };
      const { error } = await sb.from('saves').upsert({
        user_id: currentUser.uid,
        blob: envelope.blob, version: envelope.version,
        progress: envelope.progress, updated_at: new Date(envelope.updatedAt || Date.now()).toISOString(),
      });
      return error ? { ok: false, reason: error.message } : { ok: true };
    },

    // ── 원격 설정(remote_config) 읽기 — 공지/이벤트/밸런스 ──
    async fetchConfig() {
      try {
        const { data } = await sb.from('remote_config').select('key, value');
        if (!data) return null;
        const out = {};
        for (const row of data) out[row.key] = String(row.value);
        return out;
      } catch { return null; }
    },
    // ── 운영자 콘솔: 원격 설정 쓰기/삭제 (RLS로 매니저·운영자만 허용) ──
    async setConfig(key, value) {
      if (!currentUser) return { ok: false, reason: 'no-user' };
      const { error } = await sb.from('remote_config').upsert({
        key, value, updated_at: new Date().toISOString(), updated_by: currentUser.uid,
      });
      return error ? { ok: false, reason: error.message } : { ok: true };
    },
    async deleteConfig(key) {
      if (!currentUser) return { ok: false, reason: 'no-user' };
      const { error } = await sb.from('remote_config').delete().eq('key', key);
      return error ? { ok: false, reason: error.message } : { ok: true };
    },

    // ── 우편함 — 서버 우편 조회(전체 + 내 우편), 발송(매니저·운영자) ──
    async fetchMail() {
      if (!currentUser) return [];
      const { data } = await sb
        .from('mail').select('id, title, rewards, created_at')
        .or(`target_user_id.is.null,target_user_id.eq.${currentUser.uid}`)
        .order('created_at', { ascending: true }).limit(100);
      return data || [];
    },
    async sendMail({ targetUserId = null, title, rewards }) {
      if (!currentUser) return { ok: false, reason: 'no-user' };
      const { error } = await sb.from('mail').insert({
        target_user_id: targetUserId, title, rewards: rewards || {},
      });
      return error ? { ok: false, reason: error.message } : { ok: true };
    },

    // ── IAP 영수증 서버 검증 → Edge Function iap-verify 호출 ──
    async verifyPurchase({ platform, productId, token }) {
      if (!currentUser) return { ok: false, reason: 'no-user' };
      const { data, error } = await sb.functions.invoke('iap-verify', {
        body: { platform, productId, token },
      });
      if (error) return { ok: false, reason: error.message };
      return data; // { ok, productId, status }
    },
  };
}
