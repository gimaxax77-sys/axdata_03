# research.md — 작업·조사 기록

> CLAUDE.md 규칙: 모든 질문·요구·요청과 진행 과정·결과를 신중·깊이·상세·명확·정확하게 정리해 여기에 누적 기록한다.

## 기록 형식
- **날짜 — 제목**
  - 요청:
  - 진행:
  - 결정·근거:
  - 결과:

---

## 2026-07-13 — CLAUDE.md 규칙 추가 및 전 저장소 횡전개
- 요청: CLAUDE.md에 "모든 답변을 신중·깊이·상세·명확·정확하게 정리하고 research.md에 기록" 규칙 추가, 전 저장소 기본 브랜치에 횡전개.
- 진행: 7개 저장소(axax77, axdata_01/03/05/07/09, gax)의 기본 브랜치 CLAUDE.md에 "답변·기록 규칙" 섹션 추가, 각 저장소에 research.md 생성.
- 결정·근거: '횡전개' = 새 세션이 실제로 여는 기본 브랜치에 반영(ponytail 배포와 동일 기준). 기존 CLAUDE.md는 보존하고 규칙 섹션만 추가(수술적 변경).
- 결과: 각 저장소 커밋·푸시 완료(아래 커밋 참조).

## 2026-07-18 — axdata_03 저장소 초기화 + 원격 연결
- 요청: git init → 원격 연결.
- 진행: axdata_03-main에서 git init, 브랜치 main, 원격 origin(github.com/gimaxax77-sys/axdata_03) 연결. 원격에 기존 이력 3커밋이 있어(로컬 새 커밋과 내용 동일, 파일권한 차이뿐) `reset --hard origin/main`으로 정렬. 중복 브랜치 claude/status-check-dmwmqy는 main에 이미 반영된 내용이라 삭제.
- 결과: 로컬 main ↔ origin/main 동기화, 원격 브랜치 main 하나만 남음.

## 2026-07-18 — 퀄리티 풀 리뉴얼: 생태계 분석 + 개선 계획서 수립
- 요청: "현재 구현된 코어 시스템·아트 스튜디오·렌더 시스템을 활용해 기존보다 퀄리티 높은 게임을 만들어줘". 결정: 모바일(Expo)·풀 리뉴얼·먼저 개선 계획만 수립.
- 진행: 생태계 매핑 완료 — 코어=axdata_01(게임 "eldria-idle", 코어 40개+·화면 15개, 이미 성숙), 아트스튜디오=axdata_09(GPT+Gemini 아트 자동생성), 렌더=axdata_05+렌더폴더(3D→2D 스프라이트, PC/GPU 전용). 기존 설계문서 종합(redesign-plan/ART_STRATEGY/ROGUELITE-PLAN/PHASE2_DESIGN).
- 결정·근거: 기존 게임이 이미 크고 완성도 높아 "처음부터 재구축"은 낭비 → "코어 재사용 + 아트·UI 리뉴얼"이 정석. 퀄리티를 4축(A 아트 / B UI·UX / C 게임성 / D 기술)으로 정의하고 임팩트÷노력으로 우선순위. 1차 핵심 = 🔴 A1·A2·B1·B2·C1·D1.
- 결과: `QUALITY_RENEWAL_PLAN.md` 작성(축별 개선항목·8단계 로드맵·미결 결정 3개). 코드 변경 없음.
- 결정(Gim): 위치=axdata_01 소스를 axdata_03으로 복사(01은 다른 브랜치 작업중이라 격리) / 범위=S0부터 / 아트=나중, 코드 먼저.

## 2026-07-18 — S0 현물 점검 완료
- 진행: axdata_01 dist를 python http.server로 띄워 실구동 확인 + UI 소스 정독. 스크린샷은 방치형 rAF 루프가 CDP 점유해 원격 캡처 불가(시각캡처는 Gim PC로). 구동 정상: "엘드리아 연대기", 탭5(전투/영웅/소환/콘텐츠/상점), 방치전투·무한탑·온보딩, 콘솔에러 없음.
- 진단: theme.js(45줄, 색·SPACE·RARITY 토큰 有 / 타이포·라운드·그림자 토큰 無), motion.js(11줄, 플래그뿐·애니 프리미티브 無), feedback.js(121줄, 사운드+햅틱 탄탄), BattleView.js(193줄, 기본연출 有·타격감 無), RosterScreen.js(1400줄, 최대 복잡도 핫스팟).
- 결정·근거: 1차 코드 착수 = B1(디자인 토큰 확장)+D1(회귀 게이트) → B2(전투 연출). 근거: 토큰은 저노력·고효과 기반, 전투연출은 체감퀄 최대레버(단 캐릭터 비주얼은 아트 A1 의존→나중). RosterScreen 1400줄은 C1때 분해.
- 결과: 계획서에 §7 S0 결과 반영. 다음: axdata_01 소스 복사(민감파일 .env/*.jks/node_modules/dist/.git 제외) 후 B1 착수 여부 Gim 확인.

## 2026-07-18 — 소스 복사 + B1(디자인 토큰)+D1(회귀 게이트)
- 진행: robocopy로 axdata_01 → axdata_03 복사. 제외: .git/.expo/node_modules/dist/.claude, .env/*.jks/play.html/CLAUDE.md/research.md. 검증: 민감파일 유입 0, git 이력(b1f3632) 보존, 게임 핵심파일 도착, axdata_03 원본문서(계획서·research·CLAUDE 5번규칙·ponytail) 보존. 01의 research.md는 docs/research-eldria.md로 보존.
- D1: 착수 전 기준선 `node --test system/test/*.test.mjs` = 280개 중 279 pass·0 fail·1 skip(green).
- B1: app/theme.js에 토큰 추가(수술적·비파괴) — RADIUS(4·8·12·16·pill), FONT(10~56 기존 군집 일치), WEIGHT(400~900), ELEV(card/float/modal 그림자 프리셋). 근거: 기존 borderRadius/fontSize/weight 분포 실측 후 값 일치, 그림자는 전체 1회뿐이라 신설. 기존 매직넘버 일괄치환은 안 함(화면 만질 때 점진 적용).
- 검증: theme.js 문법 OK, 토큰 export 확인, 코어 테스트 재실행 279 pass·0 fail(회귀 없음).
- 결과: B1·D1 완료. 커밋 대기(Gim 승인 후). 다음 후보: B2(전투 연출) — BattleView에 히트스톱·화면흔들림·데미지팝업 강화·승리연출, 신설 토큰/모션헬퍼 활용.



