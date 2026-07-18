// ─────────────────────────────────────────────────────────────
// 모의(mock) 클라우드 제공자 — Supabase 키 없이 로컬에서 계정·역할을 시험.
//   실제 서버 대신 메모리에 계정을 저장한다(앱 재시작 시 초기화).
//   개발용으로만 켠다. 앱 진입에서:  import './app/backend/mockCloud';
//
//   미리 심어둔 시험 계정:
//     admin@test    / 1234  → 역할 admin(운영자)
//     manager@test  / 1234  → 역할 manager(매니저)
//     그 외 아무 이메일        → 가입 시 역할 user(일반)
//
//   ⚠ 실서비스에는 절대 포함하지 말 것. supabaseImpl 로 교체하면 됩니다.
// ─────────────────────────────────────────────────────────────

const ROLE_BY_EMAIL = { 'admin@test': 'admin', 'manager@test': 'manager' };

const accounts = new Map(); // email → { uid, email, password, role }
let current = null;
let saveBlob = null;        // 메모리 세이브 봉투
const configStore = {};     // 원격 설정(공지·이벤트) 메모리 저장
const mailStore = [];       // 우편 메모리 저장
let mailSeq = 0;

function mkUser(email, password) {
  const role = ROLE_BY_EMAIL[email] || 'user';
  const u = { uid: 'mock-' + email, email, password, role };
  accounts.set(email, u);
  return u;
}
// 시험 계정 미리 생성.
mkUser('admin@test', '1234');
mkUser('manager@test', '1234');

globalThis.__ELDRIA_CLOUD__ = {
  available: () => true,
  user: () => (current ? { uid: current.uid, email: current.email, role: current.role } : null),
  role: () => (current ? current.role : null),

  async signUp({ email, password }) {
    if (accounts.has(email)) return { ok: false, reason: '이미 가입된 이메일입니다' };
    current = mkUser(email, password);
    return { ok: true, uid: current.uid, role: current.role };
  },
  async signInWithEmail({ email, password }) {
    const u = accounts.get(email);
    if (!u || u.password !== password) return { ok: false, reason: '이메일 또는 비밀번호가 올바르지 않습니다' };
    current = u;
    return { ok: true, uid: u.uid, role: u.role };
  },
  async signIn() {
    return current ? { ok: true, uid: current.uid, role: current.role } : { ok: false, reason: 'no-session' };
  },
  async signOut() { current = null; },

  async pull() { return saveBlob; },
  async push(envelope) { saveBlob = envelope; return { ok: true }; },

  // 원격 설정(공지·이벤트) — 메모리 저장(운영자 콘솔 시험용).
  async fetchConfig() { return { ...configStore }; },
  async setConfig(key, value) { configStore[key] = value; return { ok: true }; },
  async deleteConfig(key) { delete configStore[key]; return { ok: true }; },

  // 우편함 — 메모리 저장(전체 우편 = target null).
  async fetchMail() {
    if (!current) return [];
    return mailStore.filter((m) => m.target_user_id == null || m.target_user_id === current.uid);
  },
  async sendMail({ targetUserId = null, title, rewards }) {
    mailStore.push({ id: 'mail-' + (++mailSeq), target_user_id: targetUserId, title, rewards: rewards || {}, created_at: new Date().toISOString() });
    return { ok: true };
  },
};
