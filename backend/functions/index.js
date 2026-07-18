// ─────────────────────────────────────────────────────────────
// Cloud Functions (Firebase) — Phase 1 서버 검증 골격.
//   · iapVerify   : 인앱결제 영수증(구글/애플) 검증 후 보상 승인
//   · validateSave: 세이브 업로드 시 상한/합리성 검증(안티치트 1차)
//
// 배포: `cd backend/functions && npm i && firebase deploy --only functions`
// 실 검증 로직(스토어 API 호출)은 TODO 주석 위치에 채운다.
// ─────────────────────────────────────────────────────────────
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Phase 2 PvP/리더보드 함수 재노출.
Object.assign(exports, require('./pvp'));

// ── IAP 영수증 검증 ──────────────────────────────────────────
// 클라이언트는 결제 성공 후 { platform, productId, token } 를 보낸다.
// 서버가 스토어에 검증 요청 → 유효하면 지급 승인 토큰을 돌려준다.
exports.iapVerify = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인 필요');
  const { platform, productId, token } = data || {};
  if (!platform || !productId || !token) {
    throw new functions.https.HttpsError('invalid-argument', '필수 값 누락');
  }
  // TODO: 실제 검증
  //  - Android: Google Play Developer API purchases.products.get
  //  - iOS: App Store Server API / verifyReceipt
  // 검증 실패 시 throw. 성공 시 결제 기록을 남겨 중복 지급 방지.
  const ledger = admin.firestore().collection('purchases').doc(`${context.auth.uid}_${token}`);
  const seen = await ledger.get();
  if (seen.exists) return { ok: false, reason: 'already-granted' };
  await ledger.set({ uid: context.auth.uid, productId, platform, at: Date.now() });
  // 클라는 이 응답을 받고 shop.purchase(state, productId) 로 보상 지급.
  return { ok: true, productId };
});

// ── 세이브 검증(안티치트 1차) ────────────────────────────────
// Firestore users/{uid} 쓰기 트리거. 불가능한 상태면 플래그만 남긴다(차단은 운영 판단).
exports.validateSave = functions.firestore
  .document('users/{uid}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after || !after.blob) return null;
    let state;
    try { state = JSON.parse(after.blob).state; } catch { return null; }
    const flags = [];
    // 예시 상한: 재화가 진행도 대비 비상식적으로 큰지 등(정책은 조정)
    const gem = (state.wallet && state.wallet.gem) || 0;
    if (gem > 1e9) flags.push('gem-overflow');
    const peak = state.peakStage || 1;
    if (peak > 100000) flags.push('stage-overflow');
    if (flags.length) {
      await admin.firestore().collection('flags').doc(context.params.uid).set(
        { flags, at: Date.now() }, { merge: true }
      );
    }
    // 정밀 검증이 필요하면 여기서 dependency-free 코어(system/core)를 require 해
    // resolve()로 재-시뮬레이션할 수 있다(전투력/진행 정합성 확인).
    return null;
  });
