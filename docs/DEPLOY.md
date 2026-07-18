# 배포 가이드 (출시 준비)

하나의 코드베이스로 **두 제품**(판타지 「엘드리아 연대기」 / SF 「오비탈 프로토콜」)을
**웹·안드로이드·iOS**로 배포한다. 컨셉은 라벨/에셋만 다르고 코어는 동일하다.

## 1. 사전 준비
- Node 18+, `npm install`
- Expo 계정 + EAS CLI: `npm i -g eas-cli && eas login`
- (iOS 빌드) Apple Developer 계정 / (Android) Google Play 콘솔 계정

## 2. 브랜드 에셋
아이콘·스플래시·파비콘은 코드로 생성한다(별도 이미지 툴 불필요).
```bash
node scripts/gen-icon.mjs         # 판타지: assets/icon.png 등
node scripts/gen-icon.mjs scifi   # SF: assets/icon-scifi.png 등
```
- `icon*.png` 1024² (풀블리드), `adaptive-icon*.png` 1024²(안드로이드 전경, 안전영역),
  `splash-icon*.png` 1024²(스플래시), `favicon.png` 48²(웹).

## 3. 컨셉 선택(운영자 결정)
- **웹**: HTML 셸이 `globalThis.__ELDRIA_CONCEPT__`를 주입 → `build-play.mjs scifi`.
- **네이티브**: `app.config.js`가 `APP_VARIANT`로 `extra.concept`를 설정.
  `useGame`/`storage`가 이 값을 읽어 렌더/세이브 키를 분기(판타지=기존 키 유지).

## 4. 웹 배포 (정적 단일 HTML)
```bash
npm run build:play                    # docs/play.html (판타지)
node scripts/build-play.mjs scifi     # docs/play-scifi.html (SF)
```
`docs/play*.html`는 자립형 → 아무 정적 호스팅(예: GitHub Pages)에 올리면 끝.

## 5. 네이티브 빌드 (EAS)
`eas.json` 프로필: `development`(개발 클라이언트) / `preview`(내부 APK) / `production`(스토어).

### 판타지
```bash
eas build -p android --profile preview      # 설치용 APK
eas build -p android --profile production   # Play 업로드용 AAB
eas build -p ios     --profile production   # App Store용
```
### SF (같은 코드, 변형)
```bash
APP_VARIANT=scifi eas build -p android --profile production
APP_VARIANT=scifi eas build -p ios     --profile production
```

## 6. 스토어 제출
```bash
eas submit -p android --profile production
eas submit -p ios     --profile production
```

## 7. 버전 관리
- `app.json`의 `version`(표시), `ios.buildNumber`, `android.versionCode`를 올린다.
  (`production` 프로필은 `autoIncrement`로 빌드번호 자동 증가.)

## 8. 스토어 메타 체크리스트
- [ ] 앱 이름/짧은 설명/전체 설명 (판타지·SF 각각)
- [ ] 스크린샷(폰 6.5"/5.5", 태블릿) — `docs/play.html`을 모바일 뷰포트로 캡처
- [ ] 개인정보처리방침 URL (세이브는 로컬 저장만 — 서버 전송 없음 명시)
- [ ] 콘텐츠 등급 설문 (모의 결제 = 인앱결제 골격이므로 실제 결제 연동 전엔 미표기)
- [ ] 카테고리: 게임 > 롤플레잉 / 방치형

## 참고 — 아직 골격인 부분(실서비스 전 연동 필요)
- **결제**: 상점/패키지/시즌패스 프리미엄은 *모의 지급*. 실제로는 `expo-in-app-purchases`
  또는 RevenueCat 연동 필요.
- **영속 저장**: 로컬(localStorage/AsyncStorage)만. 계정/클라우드 세이브는 미구현.
- **광고**: 광고 보상은 즉시 지급 골격. 실제 리워드 광고 SDK 연동 필요.
