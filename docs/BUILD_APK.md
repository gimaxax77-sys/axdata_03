# APK/AAB 빌드 가이드 (PC 실행용)

이 문서는 **PC에서 실기기용 APK(또는 스토어용 AAB)를 만드는 전 과정**입니다.
그대로 따라 하면 됩니다. 빌드는 **EAS Build(Expo 클라우드)** 로 수행됩니다 —
Android SDK를 로컬에 깔 필요가 없습니다.

> 이미 설정된 것: EAS 프로젝트(`projectId f95f8fe3-…`), 소유자 `gimax77`,
> 앱 아이콘/스플래시, 키스토어(EAS 관리). **추가 설정 없이 로그인만 하면 빌드됩니다.**

---

## 0. 사전 준비 (최초 1회)

```bash
# Node 18+ 설치되어 있어야 함 (node -v 로 확인)
npm install -g eas-cli      # EAS CLI 전역 설치
eas --version               # 정상 출력 확인 (>= 5.9.0)
```

---

## 1. 최신 코드 받기

```bash
# 이미 클론돼 있으면 최신 브랜치만 pull
git pull origin claude/git-connection-status-rkjuko

# 처음이라면 클론부터
# git clone <repo-url> && cd axdata_01
# git checkout claude/git-connection-status-rkjuko

npm install                 # 의존성 설치
```

---

## 2. 빌드 전 검증 (권장)

```bash
npm test                    # 유닛 188 / 장르 17 / 캐릭터 37 통과 확인
npm run build:play          # 웹 빌드 → docs/play.html (브라우저로 기능 미리 확인 가능)
```

`npm test`가 초록이면 로직은 안전합니다. 실기기 전에 `docs/play.html`을
브라우저로 열어 이번 버전 신기능(DPS 미터·분해 환급·주간이벤트·시즌던전·
덱복사·본진발전·가챠 스킵)을 먼저 만져볼 수 있습니다.

---

## 3. Expo 로그인

```bash
eas login                   # gimax77 계정으로 로그인
eas whoami                  # gimax77 출력 확인
```

> 계정 비밀번호 대신 토큰을 쓰려면 `export EXPO_TOKEN=...` 후 로그인 생략 가능.

---

## 4. APK 빌드 (실기기 내부 테스트용)

```bash
# 판타지 "엘드리아 연대기"
npm run build:apk           # = eas build -p android --profile preview

# SF "오비탈 프로토콜"을 빌드하려면
npm run build:apk:scifi
```

- 빌드는 클라우드에서 5~15분 소요. 진행 링크가 터미널에 출력됩니다.
- 완료되면 **`.apk` 다운로드 URL**이 나옵니다 → 기기에서 열어 설치
  (또는 QR 스캔). "출처를 알 수 없는 앱 설치 허용"이 필요할 수 있습니다.

### 설치 후 육안 확인 체크리스트
- [ ] 소환 탭: **연출 스킵** 토글 → 대량 소환 즉시 결과
- [ ] 캐릭터 탭: **DPS 미터**(딜 비중 바) · **♻️ 분해**(100% 환급) · **덱 복사/적용**
- [ ] 콘텐츠 탭: **주간 테마 이벤트** · **시즌 던전** · **스토리 정주행 도감** · **SSR 보호 합성**
- [ ] 방치(픽셀) 화면: **본진 발전 단계**(야영지~수도) 표시
- [ ] 기존 기능: 장비 11슬롯 · 소환레벨 · 아레나 리그 · 엠블럼/정령 · 인챈트

---

## 5. AAB 빌드 (구글 플레이 스토어 제출용)

```bash
npm run build:aab           # = eas build -p android --profile production (app-bundle)
```

- production 프로필은 `versionCode`를 **자동 증가**(`autoIncrement`)합니다.
- 스토어 제출은 `eas submit -p android` (별도 구글 플레이 서비스 계정 필요).

---

## 6. 버전 정보 (이번 빌드 기준)

`app.json`에 반영됨:
- `version`: **1.1.0** (기능 릴리스)
- `android.versionCode`: **2**, `ios.buildNumber`: **2**

> 기기에 1.0.0(versionCode 1)이 이미 깔려 있어도 **덮어쓰기 업데이트**로 설치됩니다.
> 다음 빌드 때는 preview APK의 경우 `versionCode`를 손으로 +1 해주세요
> (production AAB는 자동 증가).

---

## 7. 문제 해결

| 증상 | 원인·해결 |
|---|---|
| `expo-doctor` 3개 실패(Host…) | Expo API 네트워크 이슈. **PC 정상 네트워크에서는 통과.** 원격 컨테이너 한정 현상 |
| `eas build` 인증 오류 | `eas login` 재시도 / `eas whoami`로 `gimax77` 확인 |
| 의존성 버전 경고 | `npx expo install --check` 로 SDK 51 호환 버전 정렬 |
| 키스토어 물어봄 | 최초 1회 EAS가 자동 생성·관리하도록 `Yes` 선택 |
| OTA로 갱신 안 됨 | 네이티브 의존(expo-font 등) 변경 시 OTA 불가 → **APK 리빌드 필요** |

---

## 요약 (한 줄 실행)

```bash
git pull origin claude/git-connection-status-rkjuko && npm install && npm test && eas login && npm run build:apk
```
