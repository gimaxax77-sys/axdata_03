import { useRef, useState, useEffect, useCallback } from 'react';
import { createGameState } from '../system/core/gameState.mjs';
import { createUnit } from '../system/core/units.mjs';
import { earn } from '../system/core/economy.mjs';
import { computePower } from '../system/core/stats.mjs';
import { accountMods } from '../system/core/balance.mjs';
import { idleGenre } from '../system/genres/idle.mjs';
import { serialize, deserialize, exportCode, importCode } from '../system/core/save.mjs';
import { applyOverrides } from '../system/core/admin.mjs';
import { hasPremium } from '../system/core/cosmetics.mjs';
import { cloudAvailable, cloudUser, cloudRole, cloudSignIn, cloudSignUp, cloudSignInWithEmail, cloudSignOut, cloudPull, cloudPush, cloudFetchConfig, cloudSetConfig, cloudDeleteConfig, cloudFetchMail, cloudSendMail } from './backend/cloud';
import { addMail } from '../system/core/mailbox.mjs';
import { chooseSave, makeEnvelope, saveProgress } from './backend/sync.mjs';
import { loadRemoteConfig } from './backend/remoteConfig.mjs';
import { SAVE_VERSION } from '../system/core/save.mjs';
import { fantasyConcept } from '../system/concepts/fantasy.mjs';
import { CONCEPTS } from '../system/concepts/index.mjs';
import { loadRawSync, loadRawAsync, saveRaw, clearSave, saveBackup, loadBackupSync, loadBackupAsync } from './storage';

// 게임 상태 훅. 저장/복원 + 오프라인 보상 정산 + 방치 틱.
const TICK_MS = 1000;
const TICK_GAME_SEC = 24; // 실제 1초 = 게임 24초 (숫자가 눈에 보이게)

// 운영 컨셉 선택 — 빌드/초기화 시점의 운영자 결정.
//   · 웹    : HTML 셸이 globalThis.__ELDRIA_CONCEPT__ 주입(build-play.mjs scifi)
//   · 네이티브 : app.config.js가 APP_VARIANT로 extra.concept 설정
// 같은 코어를 판타지/SF 두 제품으로 배포함을 실증. 기본은 판타지.
function activeConcept() {
  let id = (typeof globalThis !== 'undefined' && globalThis.__ELDRIA_CONCEPT__) || null;
  if (!id) {
    try { id = require('expo-constants').default?.expoConfig?.extra?.concept; } catch { id = null; }
  }
  return CONCEPTS[id || 'fantasy'] || fantasyConcept;
}
const CONCEPT = activeConcept();

// 로스터 변경 마이그레이션 — 세이브 유닛의 characterId가 현재 로스터에 없으면
// 같은 원형의 로스터 캐릭터로 안정적으로 재매핑(스프라이트/초상 정상화).
// 예전(클라우드) 세이브가 옛 캐릭터 id를 갖고 있어 전투에서 이모지로만 나오던 문제 해결.
const ROSTER_IDS = new Set(CONCEPT.roster.map((c) => c.id));
const ROSTER_BY_ARCH = CONCEPT.roster.reduce((m, c) => { (m[c.archetype] = m[c.archetype] || []).push(c.id); return m; }, {});
function normalizeRoster(state) {
  if (!state || !Array.isArray(state.units)) return state;
  for (const u of state.units) {
    if (u && (!u.characterId || !ROSTER_IDS.has(u.characterId))) {
      const pool = ROSTER_BY_ARCH[u.archetype];
      if (pool && pool.length) {
        let h = 0; const key = String(u.uid || u.characterId || '');
        for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
        u.characterId = pool[h % pool.length];
      }
    }
  }
  return state;
}

function createFresh() {
  const starter = CONCEPT.roster.find((c) => c.id === 'mir') || CONCEPT.roster.find((c) => c.rarity === 'N') || CONCEPT.roster[0];
  const hero = createUnit(starter.archetype, {
    // R2 시작(레벨 상한 40) — 솔로 온보딩 구간을 넉넉히 주고 소환 해금(8층)까지
    // 레벨업만으로 도달하게 한다.
    level: 1, rank: 2, characterId: starter.id, signature: starter.signature, element: starter.element,
  });
  hero.rarity = starter.rarity;
  const s = createGameState({ units: [hero], party: [hero.uid] });
  earn(s.wallet, { currency: 800, growth: 600, summon: 130, gem: 120 });
  return s;
}

// 재접속 오프라인 정산을 상태에 반영해 로드된 세이브를 반환.
function applyLoad(loaded, offlineRef) {
  normalizeRoster(loaded); // 예전 로스터 세이브 → 현재 21종 재매핑
  const rew = idleGenre.collectOffline(loaded, Date.now());
  if (rew.gained && (rew.gained.currency > 0 || rew.gained.growth > 0)) {
    // 광고제거 패스: 오프라인 2배를 광고 없이 자동 지급.
    let doubled = false;
    if (hasPremium(loaded)) {
      const b = idleGenre.applyOfflineBonus(loaded, rew.gained, 1);
      doubled = !!b.ok;
    }
    offlineRef.current = {
      ...rew, seconds: rew.seconds, doubled,
      gained: doubled
        ? { currency: (rew.gained.currency || 0) * 2, growth: (rew.gained.growth || 0) * 2 }
        : rew.gained,
    };
  }
  return loaded;
}

export function useGame() {
  const ref = useRef(null);
  const offlineRef = useRef(null);
  // 웹: 동기 로드로 첫 렌더에 세이브 반영. 네이티브: null → 아래 async 하이드레이트.
  const bootRaw = useRef(loadRawSync());
  if (!ref.current) {
    let loaded = bootRaw.current ? deserialize(bootRaw.current) : null;
    // 메인 세이브가 있었는데 파싱 실패(손상) → 마지막 정상 백업으로 복구.
    if (!loaded && bootRaw.current) {
      const bk = loadBackupSync();
      loaded = bk ? deserialize(bk) : null;
    }
    ref.current = loaded ? applyLoad(loaded, offlineRef) : createFresh();
    applyOverrides(ref.current.admin && ref.current.admin.overrides); // 운영자 오버라이드 재적용
  }
  // rev = "사용자 액션" 리렌더 신호. 방치 틱은 rev를 올리지 않아(아래) 비활성
  // 화면이 초당 리렌더되지 않는다(React.memo와 결합해 탭 렉 제거).
  const [rev, setRev] = useState(0);
  const bump = useCallback(() => setRev((v) => (v + 1) % 1e9), []);
  const [offline, setOffline] = useState(offlineRef.current);
  const [lastGain, setLastGain] = useState({ currency: 0, growth: 0 });
  // 웹은 이미 로드 완료. 네이티브는 AsyncStorage 하이드레이트 전까지 틱/저장 보류.
  const [hydrated, setHydrated] = useState(bootRaw.current !== null);

  const save = useCallback(() => saveRaw(serialize(ref.current)), []);
  const tickCount = useRef(0);
  const gainAcc = useRef({ currency: 0, growth: 0 }); // 절전 모드: 표시 갱신 사이 누적

  // 네이티브 비동기 하이드레이트 — 로드 완료 전까지 저장하지 않아 덮어쓰기 방지.
  useEffect(() => {
    if (hydrated) return;
    let alive = true;
    (async () => {
      const raw = await loadRawAsync();
      if (!alive) return;
      if (raw) {
        let loaded = deserialize(raw);
        if (!loaded) { const bk = await loadBackupAsync(); loaded = bk ? deserialize(bk) : null; }
        if (loaded) {
          ref.current = applyLoad(loaded, offlineRef);
          applyOverrides(ref.current.admin && ref.current.admin.overrides);
          if (offlineRef.current) setOffline(offlineRef.current);
        }
      }
      setHydrated(true);
      bump();
    })();
    return () => { alive = false; };
  }, [hydrated, bump]);

  // 방치 틱 + 주기 저장 (하이드레이트 완료 후에만)
  useEffect(() => {
    if (!hydrated) return;
    const id = setInterval(() => {
      const before = { ...ref.current.wallet };
      // 방치 누적은 매 틱 수행(경과시간 기반) → 절전 모드여도 진행 손실 없음.
      idleGenre.tick(ref.current, TICK_GAME_SEC);
      gainAcc.current.currency += ref.current.wallet.currency - before.currency;
      gainAcc.current.growth += ref.current.wallet.growth - before.growth;
      tickCount.current += 1;
      // 절전 모드: 화면 갱신·저장을 stride마다만(리렌더/쓰기 5배↓ → 발열·배터리↓).
      const eco = !!(ref.current.settings && ref.current.settings.ecoMode);
      const stride = eco ? 5 : 1;
      if (tickCount.current % stride === 0) {
        setLastGain({
          currency: Math.round(gainAcc.current.currency),
          growth: Math.round(gainAcc.current.growth),
        });
        gainAcc.current = { currency: 0, growth: 0 };
        save();
      }
      // 약 30초마다 정상본 백업(손상 복구용) — 매 틱 쓰기 부담 회피.
      if (tickCount.current % 30 === 0) saveBackup(serialize(ref.current));
      // rev를 올리지 않는다 → 비활성 화면은 리렌더 안 됨. setLastGain이 App만
      // 리렌더시켜 상단 자원바/방치 화면만 실시간 갱신.
    }, TICK_MS);
    return () => clearInterval(id);
  }, [hydrated, bump, save]);

  // 창 닫힘/숨김 시 저장 (웹)
  useEffect(() => {
    const w = typeof globalThis !== 'undefined' ? globalThis : null;
    if (!w || !w.addEventListener) return;
    const onHide = () => { save(); saveBackup(serialize(ref.current)); };
    w.addEventListener('beforeunload', onHide);
    w.addEventListener('visibilitychange', onHide);
    return () => {
      w.removeEventListener('beforeunload', onHide);
      w.removeEventListener('visibilitychange', onHide);
    };
  }, [save]);

  const dismissOffline = useCallback(() => setOffline(null), []);
  // 오프라인 2배 수령 (광고 시청 등). 원본 gained 기준으로 1배 추가 지급 → 총 2배.
  const claimOfflineBonus = useCallback(() => {
    const off = offlineRef.current;
    if (!off || off.doubled) return;
    const base = { currency: (off.gained.currency || 0), growth: (off.gained.growth || 0) };
    const b = idleGenre.applyOfflineBonus(ref.current, base, 1);
    if (b.ok) {
      offlineRef.current = { ...off, doubled: true, gained: { currency: base.currency * 2, growth: base.growth * 2 } };
      setOffline(offlineRef.current);
      save();
    }
  }, [save]);
  const reset = useCallback(() => {
    clearSave();
    ref.current = createFresh();
    save();
    setOffline(null);
    bump();
  }, [bump, save]);

  // 이관 코드 — 내보내기(현재 세이브 → 코드), 불러오기(코드 → 세이브 교체).
  const exportSave = useCallback(() => exportCode(ref.current), []);
  const importSave = useCallback((code) => {
    const loaded = importCode(code);
    if (!loaded) return false;
    ref.current = normalizeRoster(loaded);
    save();
    saveBackup(serialize(ref.current));
    setOffline(null);
    bump();
    return true;
  }, [bump, save]);

  // ── 클라우드 세이브(Phase 1) — 미설정이면 전부 no-op(로컬 전용) ──
  const [cloud, setCloud] = useState({ available: cloudAvailable(), user: cloudUser(), role: cloudRole(), status: 'idle', msg: null });
  const envOf = useCallback(() => makeEnvelope({
    blob: serialize(ref.current), version: SAVE_VERSION, progress: saveProgress(ref.current),
  }), []);
  // 수동/자동 동기화: 로그인 → 원격 pull → 충돌 해결 → 채택 또는 push.
  const syncNow = useCallback(async () => {
    if (!cloudAvailable()) { setCloud((c) => ({ ...c, available: false, msg: '클라우드 미설정' })); return { ok: false }; }
    setCloud((c) => ({ ...c, status: 'syncing', msg: null }));
    let u = cloudUser();
    if (!u) { const r = await cloudSignIn(); if (!r.ok) { setCloud((c) => ({ ...c, status: 'error', msg: r.reason || '로그인 실패' })); return { ok: false }; } u = cloudUser(); }
    const remote = await cloudPull();
    const local = envOf();
    const pick = chooseSave(local, remote);
    if (pick.pick === 'remote') {
      const loaded = deserialize(remote.blob);
      if (loaded) { ref.current = normalizeRoster(loaded); applyOverrides(ref.current.admin && ref.current.admin.overrides); save(); saveBackup(remote.blob); bump(); }
      setCloud((c) => ({ ...c, status: 'ok', user: u, role: cloudRole(), msg: '원격 진행 불러옴' }));
    } else {
      await cloudPush(local);
      setCloud((c) => ({ ...c, status: 'ok', user: u, role: cloudRole(), msg: '클라우드 저장됨' }));
    }
    return { ok: true, pick: pick.pick };
  }, [envOf, save, bump]);
  const signOutCloud = useCallback(async () => { await cloudSignOut(); setCloud((c) => ({ ...c, user: null, role: null, status: 'idle', msg: '로그아웃' })); }, []);

  // 이메일 회원가입/로그인 → 성공 시 역할 반영 + 즉시 동기화.
  const signUpEmail = useCallback(async ({ email, password }) => {
    if (!cloudAvailable()) return { ok: false, reason: '클라우드 미설정' };
    setCloud((c) => ({ ...c, status: 'syncing', msg: null }));
    const r = await cloudSignUp({ email, password });
    if (!r.ok) { setCloud((c) => ({ ...c, status: 'error', msg: r.reason || '가입 실패' })); return r; }
    setCloud((c) => ({ ...c, user: cloudUser(), role: cloudRole() }));
    await syncNow();
    return r;
  }, [syncNow]);
  const signInEmail = useCallback(async ({ email, password }) => {
    if (!cloudAvailable()) return { ok: false, reason: '클라우드 미설정' };
    setCloud((c) => ({ ...c, status: 'syncing', msg: null }));
    const r = await cloudSignInWithEmail({ email, password });
    if (!r.ok) { setCloud((c) => ({ ...c, status: 'error', msg: r.reason || '로그인 실패' })); return r; }
    setCloud((c) => ({ ...c, user: cloudUser(), role: cloudRole() }));
    await syncNow();
    return r;
  }, [syncNow]);

  // 하이드레이트 완료 후 1회 자동 동기화(설정된 경우만).
  const didSync = useRef(false);
  useEffect(() => {
    if (!hydrated || didSync.current || !cloudAvailable()) return;
    didSync.current = true;
    syncNow();
  }, [hydrated, syncNow]);

  // 주기적 원격 백업(60초) — 로그인된 경우만. 비용·쿼터를 위해 저빈도.
  useEffect(() => {
    if (!cloudAvailable()) return;
    const id = setInterval(() => { if (cloudUser()) cloudPush(envOf()); }, 60000);
    return () => clearInterval(id);
  }, [envOf]);

  // 원격 설정(Remote Config) — 밸런스 핫픽스 반영 + 공지/이벤트 표시.
  const [remote, setRemote] = useState({ notice: null, event: null });
  const refreshRemote = useCallback(async () => {
    if (!cloudAvailable()) return;
    const raw = await cloudFetchConfig();
    const r = loadRemoteConfig(raw || {}); // balance는 BALANCE에 반영됨
    setRemote({ notice: r.notice, event: r.event });
    bump(); // 밸런스/공지 변경 반영 리렌더
  }, [bump]);
  const didConfig = useRef(false);
  useEffect(() => {
    if (didConfig.current || !cloudAvailable()) return;
    didConfig.current = true;
    refreshRemote();
  }, [refreshRemote]);

  // 운영자 콘솔: 공지/이벤트 기록·삭제 → 성공 시 즉시 로컬 반영.
  const setRemoteConfig = useCallback(async (key, value) => {
    const r = await cloudSetConfig(key, value);
    if (r.ok) await refreshRemote();
    return r;
  }, [refreshRemote]);
  const clearRemoteConfig = useCallback(async (key) => {
    const r = await cloudDeleteConfig(key);
    if (r.ok) await refreshRemote();
    return r;
  }, [refreshRemote]);

  // 우편함 — 서버 우편을 로컬 우편함(state.mail)으로 흡수(중복 방지: mailSeen).
  const ingestMail = useCallback((serverMails) => {
    if (!serverMails || !serverMails.length) return 0;
    const st = ref.current;
    st.mailSeen = st.mailSeen || [];
    const seen = new Set(st.mailSeen);
    let added = 0;
    for (const m of serverMails) {
      if (!m || seen.has(m.id)) continue;
      addMail(st, { title: m.title || '운영자 우편', reward: m.rewards || {}, ts: m.created_at ? new Date(m.created_at).getTime() : Date.now() });
      st.mailSeen.push(m.id); seen.add(m.id); added++;
    }
    if (added) { save(); bump(); }
    return added;
  }, [save, bump]);
  const refreshMail = useCallback(async () => {
    if (!cloudAvailable() || !cloudUser()) return 0;
    return ingestMail(await cloudFetchMail());
  }, [ingestMail]);
  // 운영자 콘솔: 우편 발송 → 성공 시 즉시 흡수(전체 발송이면 발송자도 수신).
  const sendMailCloud = useCallback(async (payload) => {
    const r = await cloudSendMail(payload);
    if (r.ok) await refreshMail();
    return r;
  }, [refreshMail]);
  // 로그인(또는 자동 로그인) 시 서버 우편 흡수.
  useEffect(() => { if (cloud.user) refreshMail(); }, [cloud.user, refreshMail]);

  return {
    state: ref.current, rev, bump, lastGain, offline, dismissOffline, claimOfflineBonus,
    reset, save, exportSave, importSave, concept: CONCEPT,
    cloud, syncNow, signOutCloud, signUpEmail, signInEmail, remote,
    setRemoteConfig, clearRemoteConfig, refreshRemote,
    sendMailCloud, refreshMail,
  };
}

// 파티 최고 유닛의 "실효 전투력"(환생 배수 포함)
export function effectivePower(state) {
  const mult = accountMods(state).powerMult;
  const byId = new Map(state.units.map((u) => [u.uid, u]));
  const party = state.party.map((id) => byId.get(id)).filter(Boolean);
  const best = party.length ? Math.max(...party.map(computePower)) : 0;
  return Math.round(best * mult);
}

export function powerMultOf(state) {
  return accountMods(state).powerMult;
}
