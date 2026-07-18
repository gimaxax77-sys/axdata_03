// ─────────────────────────────────────────────────────────────
// 클라우드 어댑터 — 공급자 무관 파사드.
//   실제 구현(Firebase 등)은 네이티브 앱 진입에서 globalThis.__ELDRIA_CLOUD__ 에
//   "provider" 객체로 등록한다(backend/firebaseImpl.template.js 참고).
//   미등록이면 전부 no-op → 앱은 완전 로컬 전용으로 동작(오프라인 보장).
//
// provider 인터페이스:
//   available(): boolean
//   signIn(): Promise<{ ok, uid?, reason? }>      // 익명/계정 로그인
//   user(): { uid } | null
//   pull(): Promise<envelope | null>              // 원격 세이브 봉투
//   push(envelope): Promise<{ ok, reason? }>      // 원격 세이브 기록
//   signOut(): Promise<void>
// ─────────────────────────────────────────────────────────────

function provider() {
  return (typeof globalThis !== 'undefined' && globalThis.__ELDRIA_CLOUD__) || null;
}

export function cloudAvailable() {
  const p = provider();
  return !!(p && (typeof p.available !== 'function' || p.available()));
}

export function cloudUser() {
  const p = provider();
  try { return p && p.user ? p.user() : null; } catch { return null; }
}

// 현재 로그인 계정의 역할(user/manager/admin). 미로그인·로컬 전용이면 null.
export function cloudRole() {
  const p = provider();
  try {
    if (p && p.role) return p.role();
    const u = cloudUser();
    return u && u.role ? u.role : null;
  } catch { return null; }
}

// 이메일 회원가입. payload: { email, password }.
export async function cloudSignUp(payload) {
  const p = provider();
  if (!p || !p.signUp) return { ok: false, reason: 'cloud-off' };
  try { return await p.signUp(payload); } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
}

// 이메일 로그인. payload: { email, password }.
export async function cloudSignInWithEmail(payload) {
  const p = provider();
  if (!p || !p.signInWithEmail) return { ok: false, reason: 'cloud-off' };
  try { return await p.signInWithEmail(payload); } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
}

export async function cloudSignIn() {
  const p = provider();
  if (!p || !p.signIn) return { ok: false, reason: 'cloud-off' };
  try { return await p.signIn(); } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
}

export async function cloudSignOut() {
  const p = provider();
  if (p && p.signOut) { try { await p.signOut(); } catch { /* noop */ } }
}

export async function cloudPull() {
  const p = provider();
  if (!p || !p.pull) return null;
  try { return await p.pull(); } catch { return null; }
}

export async function cloudPush(envelope) {
  const p = provider();
  if (!p || !p.push) return { ok: false, reason: 'cloud-off' };
  try { return await p.push(envelope); } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
}

// 우편함: 서버 우편 조회 → [{ id, title, rewards, created_at }].
export async function cloudFetchMail() {
  const p = provider();
  if (!p || !p.fetchMail) return [];
  try { return await p.fetchMail(); } catch { return []; }
}

// 우편함: 발송(매니저·운영자). payload: { targetUserId?, title, rewards }.
export async function cloudSendMail(payload) {
  const p = provider();
  if (!p || !p.sendMail) return { ok: false, reason: 'cloud-off' };
  try { return await p.sendMail(payload); } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
}

// 인앱결제 영수증 서버 검증. payload: { platform, productId, token }.
export async function cloudVerifyPurchase(payload) {
  const p = provider();
  if (!p || !p.verifyPurchase) return { ok: false, reason: 'cloud-off' };
  try { return await p.verifyPurchase(payload); } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
}

// 원격 설정(Remote Config) 가져오기 → { key: value(문자열) } 또는 null.
export async function cloudFetchConfig() {
  const p = provider();
  if (!p || !p.fetchConfig) return null;
  try { return await p.fetchConfig(); } catch { return null; }
}

// 운영자 콘솔: 원격 설정 기록(공지/이벤트). 매니저·운영자만(서버 RLS가 강제).
export async function cloudSetConfig(key, value) {
  const p = provider();
  if (!p || !p.setConfig) return { ok: false, reason: 'cloud-off' };
  try { return await p.setConfig(key, value); } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
}

// 운영자 콘솔: 원격 설정 삭제(공지/이벤트 내리기).
export async function cloudDeleteConfig(key) {
  const p = provider();
  if (!p || !p.deleteConfig) return { ok: false, reason: 'cloud-off' };
  try { return await p.deleteConfig(key); } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
}
