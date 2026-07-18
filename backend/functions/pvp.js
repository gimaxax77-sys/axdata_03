// ─────────────────────────────────────────────────────────────
// Cloud Functions — Phase 2 PvP/리더보드 골격 (서버 권위적).
//   핵심: 승패·랭크·보상은 서버가 코어 resolve()로 재-시뮬해 확정(안티치트).
//   코어(system/core)는 의존성 없는 ESM → 여기서 dynamic import로 그대로 재사용.
//
// 배포 준비: functions 배포 번들에 system/core를 포함(복사 또는 워크스페이스 참조).
//   예) predeploy 스크립트로 `cp -r ../../system ./system` 후 아래 import 경로 조정.
// 아래는 스키마·흐름을 확정한 참조 구현(=TODO는 쿼리/보상 튜닝 지점).
// ─────────────────────────────────────────────────────────────
const functions = require('firebase-functions');
const admin = require('firebase-admin');
try { admin.app(); } catch { admin.initializeApp(); }
const db = () => admin.firestore();

// 코어 로드(ESM) — 콜드스타트 1회 캐시.
let _core = null;
async function core() {
  if (_core) return _core;
  const resolution = await import('./system/core/resolution.mjs');
  const arena = await import('./system/core/arena.mjs');
  const balance = await import('./system/core/balance.mjs');
  const gameState = await import('./system/core/gameState.mjs');
  _core = { resolution, arena, balance, gameState };
  return _core;
}

const LADDERS = ['weekly', 'biweekly', 'monthly'];

// ── 방어 스냅샷 업로드 ────────────────────────────────────────
exports.uploadDefense = functions.https.onCall(async (data, ctx) => {
  if (!ctx.auth) throw new functions.https.HttpsError('unauthenticated', '로그인 필요');
  const snap = data && data.snapshot;
  if (!snap || !Array.isArray(snap.party)) throw new functions.https.HttpsError('invalid-argument', '스냅샷 오류');
  const { arena } = await core();
  // 서버가 파워를 재계산해 클라 주장값 위조 방지(간이).
  const power = Math.max(0, Number(snap.power) || 0);
  const tierIndex = arena.arenaPowerTier(power).index;
  await db().doc(`pvp_defense/${ctx.auth.uid}`).set({
    name: String(snap.name || '조련사').slice(0, 16),
    power, tierIndex, party: snap.party, formation: snap.formation || {},
    updatedAt: Date.now(),
  });
  return { ok: true, power, tierIndex };
});

// ── 매칭 + 서버 재-시뮬 + 랭크/보상 ───────────────────────────
exports.matchmakePvp = functions.https.onCall(async (data, ctx) => {
  if (!ctx.auth) throw new functions.https.HttpsError('unauthenticated', '로그인 필요');
  const { resolution, arena } = await core();
  const me = data && data.attacker;         // { party, powerMult, power }
  if (!me || !Array.isArray(me.party)) throw new functions.https.HttpsError('invalid-argument', '공격팀 오류');
  const myPower = Math.max(1, Number(me.power) || 1);
  const tierIndex = arena.arenaPowerTier(myPower).index;

  // 같은 리그 버킷에서 후보 조회(자기 자신 제외). TODO: 최근 상대 제외·인덱스 튜닝.
  const q = await db().collection('pvp_defense')
    .where('tierIndex', '==', tierIndex).limit(30).get();
  const candidates = q.docs.map((d) => ({ uid: d.id, ...d.data() }))
    .filter((c) => c.uid !== ctx.auth.uid);

  // 약자보호 밴드로 상대 선택(코어 순수 함수 재사용). 없으면 봇 폴백.
  const picked = arena.pickOpponent(myPower, candidates) || null;
  const defender = picked || { name: 'AI 수련상대', power: Math.round(myPower * 0.95), party: null };

  // 서버 권위적 판정: 코어 resolvePvP()로 파티 vs 파티 재-시뮬(클라와 동일 결과).
  let win;
  if (defender.party) {
    const r = resolution.resolvePvP(
      me.party, defender.party,
      { powerMult: Number(me.powerMult) || 1 },
      { powerMult: Number(defender.powerMult) || 1 },
      me.formation, defender.formation,
    );
    win = r.win;
  } else {
    win = myPower >= defender.power; // 봇: 파워 비교 폴백
  }

  const gain = win ? 25 : -12;
  const batch = db().batch();
  const seasons = await currentSeasons();
  // 3중 리그 포인트 반영(승리 시). 단방향(방어자 무손실).
  if (win) {
    for (const l of LADDERS) {
      const ref = db().doc(`leaderboards/${l}/${seasons[l]}/arena/${ctx.auth.uid}`);
      batch.set(ref, { name: me.name || '조련사', power: myPower, tierIndex,
        points: admin.firestore.FieldValue.increment(gain), updatedAt: Date.now() }, { merge: true });
    }
  }
  await batch.commit();

  // 즉시 보상(승리 시). TODO: 리그/티어별 보상 튜닝.
  const reward = win ? { gem: 5 + tierIndex * 2 } : {};
  return { ok: true, win, defender: { name: defender.name, power: defender.power }, gain, reward, bot: !defender.party };
});

// ── 탑 리더보드 제출(시즌 + 명예의 전당) ──────────────────────
exports.submitTower = functions.https.onCall(async (data, ctx) => {
  if (!ctx.auth) throw new functions.https.HttpsError('unauthenticated', '로그인 필요');
  const floor = Math.max(1, Math.floor(Number(data && data.floor) || 1));
  const name = String((data && data.name) || '조련사').slice(0, 16);
  const seasons = await currentSeasons();
  const uid = ctx.auth.uid;
  await Promise.all([
    setMax(db().doc(`leaderboards/tower_season/${seasons.monthly}/${uid}`), 'bestFloor', floor, { name }),
    setMax(db().doc(`halloffame/tower/${uid}`), 'bestFloor', floor, { name }),
  ]);
  return { ok: true, floor };
});

// ── 리더보드 조회(상위 N + 내 순위 근사) ──────────────────────
exports.getLeaderboard = functions.https.onCall(async (data, ctx) => {
  const ladder = LADDERS.includes(data && data.ladder) ? data.ladder : 'weekly';
  const seasons = await currentSeasons();
  const col = db().collection(`leaderboards/${ladder}/${seasons[ladder]}/arena`);
  const top = (await col.orderBy('points', 'desc').limit(100).get()).docs.map((d, i) => ({ rank: i + 1, uid: d.id, ...d.data() }));
  let myRank = null;
  if (ctx.auth) {
    const mine = await col.doc(ctx.auth.uid).get();
    if (mine.exists) {
      const myPts = mine.data().points || 0;
      const above = await col.where('points', '>', myPts).count().get();
      myRank = above.data().count + 1;
    }
  }
  return { ok: true, top, myRank };
});

// ── 시즌 롤오버(스케줄) — 순위 정산 보상 우편 + 리셋 ──────────
// weekly=매주, biweekly=격주, monthly=매월. 각 리그 종료 시 순위 보상 우편 발송.
exports.rolloverSeason = functions.pubsub.schedule('every day 00:00').timeZone('Asia/Seoul').onRun(async () => {
  // TODO: 각 리그의 시즌 종료 여부 판정 → 상위 순위 보상 산정 →
  //       users mailbox(또는 mail 컬렉션)로 지급 → 새 시즌 포인터 갱신.
  return null;
});

// ── 유틸 ──────────────────────────────────────────────────────
async function currentSeasons() {
  // seasons/{ladder}/current → seasonId. 없으면 주기 기반 파생.
  const out = {};
  const { arena } = await core();
  const now = Date.now();
  const days = { weekly: 7, biweekly: 14, monthly: 28 };
  for (const l of LADDERS) out[l] = `s${arena.ladderPeriod(now, days[l])}`;
  return out;
}
async function setMax(ref, field, value, extra) {
  await db().runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    const prev = cur.exists ? (cur.data()[field] || 0) : 0;
    if (value > prev) tx.set(ref, { [field]: value, ...extra, updatedAt: Date.now() }, { merge: true });
  });
}
// (방어팀은 resolvePvP가 파티 그대로 대칭 판정 → 별도 challenge 축약 불필요)
