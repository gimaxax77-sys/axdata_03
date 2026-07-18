# 안드로이드 빌드 & 배포 가이드

이 프로젝트는 **Expo 관리형(managed) 워크플로**입니다. 커스텀 네이티브 코드가
없고 전부 JS/자산이라, 배포·업데이트 전략에서 큰 이점이 있습니다.

---

## 권장안: EAS 클라우드 빌드 + EAS Update(OTA)

사용자 기준별 판단:

| 기준 | EAS 클라우드 (권장) | 로컬 빌드 |
|---|---|---|
| **안정성** | 깨끗한 재현 가능 클라우드 환경에서 빌드. "내 PC에선 됨" 문제 없음 | PC의 Android SDK/Gradle/JDK 버전에 좌우됨 |
| **백업** | **서명 키스토어를 Expo가 자동 생성·보관**. 분실 위험 0 (분실 시 앱 영구 업데이트 불가) | 키스토어를 직접 보관·백업해야 함 (분실 = 치명적) |
| **업데이트** | **EAS Update(OTA)로 JS·자산·밸런스·아트를 스토어 심사 없이 즉시 배포**. 이 게임은 거의 모든 변경이 OTA 대상 | 매 변경마다 재빌드·재업로드 필요 |
| **모바일 원격** | expo.dev 대시보드(웹)에서 폰으로 빌드 트리거·모니터·OTA 채널 관리 가능 | PC 필수 |

> 핵심: 이 게임은 순수 JS이므로 **밸런스·콘텐츠·아트·버그픽스를 OTA로 초 단위 배포**할 수 있습니다.
> 전체 재빌드는 **네이티브 의존성(expo 패키지)이 바뀔 때만** 필요합니다.

**로컬 빌드는 언제?** 커스텀 네이티브 모듈이 필요하거나, Expo 계정 없이 완전 오프라인으로
빌드해야 할 때만. 그 외엔 EAS가 안정성·백업·업데이트·원격 모두에서 우위입니다.

---

## ✅ 사전 배선 완료 (리포에 이미 반영됨)

계정이 필요 없는 정적 구성은 전부 끝나 있습니다:
- `app.json`: `runtimeVersion(appVersion)` + `updates`(OTA, ON_LOAD) 활성
- `eas.json`: 빌드 프로필별 채널(`development`/`preview`/`production`)
- `package.json`: `expo-updates` 의존성 + 빌드/OTA 스크립트, SDK 51 버전 정렬(@expo/metro-runtime)

남은 것은 **계정 연결 3단계**뿐입니다(아래).

## 사전 준비 (PC, 최초 1회)

```bash
node -v                    # Node 18+ 확인
npm install                # 의존성 설치(expo-updates 포함)
npx expo install --check   # 버전 정합성 최종 확인(대부분 이미 정렬됨)

npm i -g eas-cli
eas login                  # 무료 Expo 계정
eas init                   # projectId 발급 → app.json extra.eas.projectId 자동 주입
eas update:configure       # updates.url(=u.expo.dev/<projectId>) 자동 주입
```
> `eas init`·`eas update:configure`가 계정 종속 값(projectId·url)만 채웁니다.
> 나머지 updates/채널/런타임버전 설정은 이미 리포에 있습니다.

---

## A. EAS 클라우드 빌드

```bash
# 프로젝트를 EAS에 연결(최초 1회) — projectId 발급
eas init

# ── 테스트용 APK (사이드로드/내부 배포) ──
npm run build:apk          # = eas build -p android --profile preview
#   → 완료되면 다운로드 URL 제공. 폰에 바로 설치 가능.

# ── 프로덕션 AAB (Play 스토어 제출용) ──
npm run build:aab          # = eas build -p android --profile production
```

`eas.json`에 프로필이 이미 정의돼 있습니다:
- `preview` → **APK** (설치·테스트 편함)
- `production` → **AAB** (Play 스토어 필수 포맷) · `autoIncrement`로 versionCode 자동 증가

### 듀얼 변형 빌드 (판타지 / SF)
```bash
# 판타지 "엘드리아 연대기" (기본)
eas build -p android --profile production

# SF "오비탈 프로토콜"
APP_VARIANT=scifi eas build -p android --profile production
```
`app.config.js`가 `APP_VARIANT`로 이름·아이콘·번들ID·컨셉을 자동 전환합니다.

---

## B. EAS Update (OTA) — 업데이트의 핵심

> 설정은 이미 완료(`expo-updates` 의존성 + `app.json` updates + `eas.json` 채널).
> `eas init`/`eas update:configure`로 projectId·url만 연결하면 바로 사용 가능.

```bash
# 변경사항을 즉시 배포 (재빌드·심사 불필요)
npm run ota -- --message "밸런스 조정·아트 교체"     # = eas update --branch production
# 또는 프리뷰 채널로 먼저 테스트
npm run ota:preview -- --message "테스트 배포"
```

- 설치된 앱이 다음 실행 시 최신 JS/자산을 자동 다운로드.
- 밸런스(BALANCE 상수), 콘텐츠, **캐릭터 아트 교체**, 버그픽스 → 전부 OTA로 처리.
- 스토어 재심사가 필요한 경우: 네이티브 의존성 추가, 앱 아이콘/권한 변경, SDK 업그레이드.

---

## C. Play 스토어 제출

```bash
# EAS가 업로드까지 대행 (Google 서비스 계정 키 필요 — 최초 1회 설정)
eas submit -p android --profile production
```
또는 `eas build` 산출 AAB를 Play Console에 수동 업로드.

---

## D. 모바일 원격 지원

- **빌드 트리거·모니터**: 폰 브라우저에서 `expo.dev` 로그인 → 프로젝트 → Builds에서 상태 확인, 재빌드 트리거.
- **OTA 배포**: `eas update`는 CLI가 있는 아무 기기에서나 실행(맥/윈/리눅스). 폰 단독 배포는 어렵지만,
  PC에 SSH/원격데스크톱으로 접속해 한 줄 실행하면 됨.
- **테스터 배포**: `preview` APK 링크를 공유하거나, EAS Update 채널로 설치본에 최신 반영.

---

## E. 버전 관리 · 백업 체크리스트

- [ ] **소스**: git(현재 브랜치)에 커밋·푸시 — 이미 됨.
- [ ] **키스토어**: EAS 자동 관리 사용 시 Expo 클라우드에 안전 보관. `eas credentials`로 백업 다운로드 가능 — **반드시 별도 보관**.
- [ ] **versionCode/버전**: `production` 프로필의 `autoIncrement`가 처리. 수동 시 `app.json`의 `android.versionCode` 증가.
- [ ] **runtimeVersion**: OTA 호환성 경계. 네이티브 변경 시에만 올림.

---

## 현재 상태 (검증 완료)

- ✅ 안드로이드 네이티브 번들 컴파일 성공 (634 모듈 → 1.93MB Hermes)
- ✅ EAS 프로필(preview APK / production AAB) 구성 완료
- ✅ 듀얼 변형(판타지/SF) 아이콘·스플래시·번들ID 완비
- ✅ 캐릭터 초상 28종 번들 (실아트 교체는 같은 파일명 덮어쓰기)
- ✅ OTA(expo-updates) 사전 배선: app.json updates + eas.json 채널 + 의존성/스크립트
- ✅ SDK 51 버전 정렬(@expo/metro-runtime ~3.2.3), 패키지명 정정
- ▶ PC에서 남은 것: `npm install` → `eas login` → `eas init` → `eas update:configure` → `npm run build:apk`
