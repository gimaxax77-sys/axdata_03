# backend/ — Phase 1 클라우드 백엔드 (활성화 가이드)

앱은 **클라우드 미설정 시 완전 로컬 전용**으로 동작합니다(오프라인 보장).
아래 단계를 마치면 클라우드 세이브·로그인·결제검증이 "켜집니다".

## 구성 파일
- `firebaseImpl.template.js` — Firebase 클라우드 제공자(앱에 등록). `app/backend/firebaseImpl.js`로 복사해 사용.
- `firestore.rules` — Firestore 보안 규칙(본인 문서만 접근).
- `functions/` — Cloud Functions(IAP 영수증 검증 · 세이브 검증) 골격.

## 클라이언트 측 이미 구현됨 (코드 변경 불필요)
- `app/backend/cloud.js` — 공급자 파사드(미등록 시 no-op).
- `app/backend/sync.mjs` — 충돌 해결(버전→진행도→시각). 테스트: `system/test/cloud-sync.test.mjs`.
- `app/backend/purchaseFlow.mjs` — 결제 지급 게이팅(스토어→검증→지급).
- `app/backend/remoteConfig.mjs` — 원격 설정 로더(balance는 admin.applyOverrides 재사용).
- `app/useGame.js` — 로그인 후 자동 pull/충돌해결/push(60초 주기), 수동 동기화, 원격설정 1회 로드.
- `app/screens/Settings.js` — 설정에 "☁️ 클라우드 세이브" 섹션(로그인/동기화/로그아웃).
- `App.js` — 원격 공지/이벤트 배너(1회 닫기).

## Remote Config 키 (Firebase 콘솔에서 설정)
Firebase 콘솔 → Remote Config에 아래 파라미터를 문자열(JSON)로 등록하면 앱 재배포 없이 반영됨:
- `balance` : 밸런스 오버라이드. 예) `{"powerWeights.hp":0.09,"rewardGrowth":1.15}`
  - 허용 경로는 `system/core/admin.mjs`의 ADMIN_FIELDS(미등록 경로는 무시 → 안전)
- `notice`  : 공지 배너. 예) `{"text":"오늘 20시 점검 예정"}`
- `event`   : 이벤트 배너. 예) `{"text":"주말 2배 이벤트!"}`

## 활성화 단계
1. **Firebase 프로젝트 생성** (콘솔) → Authentication(익명 로그인 ON), Firestore 생성.
2. 앱에 SDK 설치: `npm i firebase expo-constants`
3. `app.json`의 `expo.extra`에 설정 추가:
   ```json
   "extra": {
     "firebase": {
       "apiKey": "…", "authDomain": "…",
       "projectId": "…", "appId": "…"
     }
   }
   ```
4. `backend/firebaseImpl.template.js` → `app/backend/firebaseImpl.js`로 복사.
5. `App.js` 최상단에 한 줄 추가: `import './app/backend/firebaseImpl';`
   → `globalThis.__ELDRIA_CLOUD__` 등록 → 클라우드 세이브 자동 활성.
6. 보안 규칙 배포: Firestore 규칙에 `firestore.rules` 내용 반영.
7. (결제) 함수 배포: `cd backend/functions && npm i && firebase deploy --only functions`
   → 결제 성공 시 `iapVerify` 호출 → 승인되면 `shop.purchase`로 지급.

## 동작 요약
- 로그인(익명) → 원격 세이브 pull → **충돌 해결**(스키마 버전↑ → 진행도↑ → 최신 시각) → 채택 또는 push.
- 진행 손실 방지: 오래된 기기가 더 진행된 세이브를 덮지 않도록 `progress(peakStage)` 우선.
- 비용: 60초 주기 + 종료 시 저빈도 쓰기 → 무료 티어 안(문서 하나/유저).

## Phase 2 — PvP·리더보드 (골격 제공, 배포는 PC)
- 클라: `app/backend/pvp.js`(파사드, 미설정 시 로컬 시뮬 폴백), `system/core/arena.mjs`(3중 리그·순수 매칭), `system/core/mailbox.mjs`(우편함).
- 서버: `backend/functions/pvp.js` — `uploadDefense`/`matchmakePvp`/`submitTower`/`getLeaderboard`/`rolloverSeason`.
  - **서버가 코어 `resolve()`로 재-시뮬**해 승패·랭크 확정(안티치트). 배포 번들에 `system/core` 포함 필요(predeploy 복사).
- 규칙: `firestore.rules`에 pvp_defense/leaderboards/halloffame 추가(리더보드 공개 읽기, 쓰기는 함수만).
- 설계 상세·확정 사항: `docs/PHASE2_DESIGN.md`.

## 다음(Phase 3)
- Nakama로 실 길드·채팅·실시간 협동. 계획은 `docs/BACKEND.md` 참고.
