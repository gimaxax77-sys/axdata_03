# PC 첫 빌드 진행 가이드 (실전 워크스루)

EAS 클라우드로 **안드로이드 APK를 처음 뽑아 폰에 설치**하기까지, 각 단계에서
무엇을 입력/선택하는지까지 순서대로 정리했습니다. **Android Studio·SDK 불필요**
(빌드는 Expo 클라우드에서 수행).

---

## 0. 준비물

- **Node.js 18 이상** — https://nodejs.org (LTS 설치) → 확인: `node -v`
- **Git** — 리포 받기용
- **Expo 계정** (무료) — https://expo.dev 에서 가입 (이메일만)
- **안드로이드 폰** — APK 설치 테스트용

---

## 1. 코드 받기

```bash
git clone <이 리포 URL>
cd axdata_01
git checkout claude/git-connection-status-rkjuko
```
> 작업 브랜치에 최신 설정(EAS·OTA·아트)이 들어 있습니다.
> main에 병합했다면 main에서 진행해도 됩니다.

## 2. 의존성 설치

```bash
npm install
npx expo install --check      # 버전 정합성 확인 (제안 뜨면 y)
```
- 몇 분 소요. `expo-updates` 등 네이티브 패키지가 함께 설치됩니다.
- `--check`는 대부분 "up to date"로 통과합니다(이미 SDK 51에 정렬).

## 3. EAS CLI 설치 + 로그인

```bash
npm i -g eas-cli
eas login
```
- **묻는 것**: Expo 이메일(또는 username)·비밀번호. 입력하면 로그인 완료.
- 확인: `eas whoami` → 계정명 출력.

## 4. 프로젝트 연결 (projectId 발급)

```bash
eas init
```
- **묻는 것**: `Would you like to create a project for @계정/eldria-idle?` → **Y**
- 결과: `app.json`의 `extra.eas.projectId`가 자동으로 채워집니다(커밋 권장).

## 5. OTA 연결

```bash
eas update:configure
```
- `updates.url`(= `https://u.expo.dev/<projectId>`)을 자동 주입.
- runtimeVersion·채널은 이미 설정돼 있어 그대로 통과.

## 6. 첫 APK 빌드 (테스트용)

```bash
npm run build:apk           # = eas build -p android --profile preview
```
- **묻는 것 (최초 1회)**: `Generate a new Android Keystore?` → **Y (EAS가 관리)**
  - ⚠️ 이 키스토어가 앱 서명의 핵심입니다. EAS가 클라우드에 안전 보관하니
    **Y로 맡기는 것을 권장**. (분실 시 같은 앱으로 업데이트 불가)
- 이후 **클라우드에서 빌드** (약 10~20분). 진행 로그 URL이 표시됩니다.
- 완료되면 **APK 다운로드 링크** + QR 제공.

## 7. 폰에 설치

- 폰 브라우저로 다운로드 링크 열기 → APK 내려받기.
- 설치 시 `출처를 알 수 없는 앱` 허용(해당 브라우저/파일앱에 1회 허용).
- 설치 후 실행 → 게임 구동 확인. 🎉

## 8. (선택) 첫 OTA 배포 테스트

코드/밸런스/아트를 바꾼 뒤:
```bash
npm run ota -- --message "첫 OTA 테스트"
```
- 설치된 앱을 **재실행**하면 최신 번들을 자동 반영(스토어 심사·재빌드 불필요).

## 9. Play 스토어 준비 (나중에)

```bash
npm run build:aab           # 프로덕션 AAB (스토어 필수 포맷)
eas submit -p android --profile production   # Google 서비스계정 키 최초 1회 설정
```

---

## 자주 겪는 문제

| 증상 | 해결 |
|---|---|
| `eas: command not found` | `npm i -g eas-cli` 재실행, 터미널 새로 열기 |
| 로그인 브라우저가 안 뜸 | `eas login`에서 이메일/비번 직접 입력 |
| 빌드 중 버전 경고 | `npx expo install --check` 후 재시도 |
| 빌드가 오래 걸림 | 무료 큐 대기일 수 있음(피크 시간 회피). expo.dev에서 진행 확인 |
| Keystore 관련 재질문 | 최초 1회만 생성. 이후 자동 재사용. `eas credentials`로 조회/백업 |
| APK 설치 차단 | 폰 설정 → 앱 → 해당 브라우저 → "알 수 없는 앱 설치 허용" |

## 백업 체크리스트 (중요)

- [ ] `eas init` 후 바뀐 `app.json`(projectId) **커밋·푸시**
- [ ] `eas credentials` → Android → 키스토어 **다운로드 백업**(별도 안전 보관)
- [ ] 소스는 git에 항상 푸시

---

## 듀얼 변형(SF "오비탈 프로토콜")도 낼 때

```bash
npm run build:apk:scifi     # 테스트
npm run build:aab:scifi     # 스토어용
```
`app.config.js`가 `APP_VARIANT=scifi`로 이름·아이콘·번들ID(com.orbital.protocol)를 자동 전환합니다.
