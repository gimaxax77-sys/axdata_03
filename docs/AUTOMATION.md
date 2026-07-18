# 빌드·배포 자동화 (터미널 없이)

최초 셋업(로그인·init·키스토어)은 끝났습니다. 이제 반복되는 **빌드**와 **OTA 배포**를
GitHub에서 버튼 한 번으로 실행합니다. **PC 터미널 불필요**(폰의 GitHub 앱에서도 가능).

---

## 1회 준비: EXPO_TOKEN 등록 (딱 한 번)

1. https://expo.dev → 우측 상단 계정 → **Account settings → Access tokens**
2. **Create token** → 이름 아무거나(예: `github-ci`) → 생성된 토큰 **복사**
3. GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `EXPO_TOKEN`
   - Secret: 복사한 토큰 붙여넣기 → **Add secret**

> 이 토큰이 CI에게 "네 Expo 계정으로 빌드해도 돼"라고 허락하는 열쇠입니다. 한 번만 넣으면 됩니다.

---

## 사용법

GitHub 저장소 → **Actions** 탭 → 좌측에서 워크플로 선택 → **Run workflow**.

### 🔨 Android Build (EAS)
APK/AAB를 클라우드에서 빌드.
- `profile`: **preview**(APK·테스트) 또는 **production**(AAB·스토어)
- `variant`: **fantasy**(엘드리아) 또는 **scifi**(오비탈)
- 실행하면 빌드가 큐에 올라가고, 결과 APK/AAB는 **expo.dev → Builds**에서 받습니다.

### 🚀 OTA Update (EAS Update)
재빌드 없이 코드/밸런스/아트를 **설치된 앱에 즉시** 반영.
- `branch`: **preview** 또는 **production** (설치된 앱의 채널과 일치해야 함)
- `message`: 변경 메모
- 앱을 **재실행**하면 최신본이 자동 적용됩니다.

---

## 어디까지 자동화되나 (요약)

| 단계 | 자동화 |
|---|---|
| 로그인 / init / 키스토어 | ✅ 끝남(1회). CI는 EXPO_TOKEN·저장된 키 재사용 |
| APK/AAB 빌드 | ✅ Actions 버튼 (또는 push 트리거) |
| OTA 배포(대부분의 변경) | ✅ Actions 버튼 (또는 push 트리거) |
| Play 스토어 업로드 | ⚙️ `eas submit` 추가 가능(서비스계정 키 1회 설정) |
| 폰에 APK 설치 | 🙋 수동(단, OTA는 설치 불필요 — 자동 반영) |

> **핵심**: 일단 한 번 스토어에 올리고 나면, 이후 변경은 대부분 **OTA 버튼 한 번**으로
> 스토어 심사도 재설치도 없이 유저에게 도달합니다. 재빌드는 네이티브 의존성이
> 바뀔 때만 필요합니다.

## 완전 무인화(선택)

- **push 자동 배포**: `.github/workflows/ota.yml`의 `push:` 트리거 주석을 해제하면,
  지정 브랜치에 push할 때마다 OTA가 자동 실행됩니다.
- **태그 릴리스 빌드**: build.yml에 `on: push: tags: ['v*']`를 추가하면 버전 태그 시 자동 빌드.
- **EAS 대시보드 Git 연동**: expo.dev → 프로젝트 → GitHub 연결로 YAML 없이 push→build도 가능.

## 로컬에서 직접 하고 싶을 때 (대안)

CI 없이 PC 터미널에서:
```bash
npm run build:apk       # APK
npm run build:aab       # AAB(스토어)
npm run ota -- -m "메모" # OTA(production 채널)
npm run ota:preview -- -m "메모"
```
