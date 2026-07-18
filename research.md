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
- 결과: B1·D1 완료. 커밋 2개(6e24d2f 소스임포트, 0ae6ae3 B1).

## 2026-07-18 — "전부 진행": B2(전투 연출)·C2(원정 UI)
- 요청: "전부 진행"(로드맵 코드 작업 이어서). 아트 A1~A3·서버 C3는 PC/GPU·백엔드 필요라 제외.
- B2: BattleView에 크리티컬 타격 충격(화면 펀치 scale 1.025 + 임팩트 플래시 오버레이) 추가. 기존 setState+setTimeout 패턴 유지, noMotion이면 미적용. 승리연출은 무한웨이브 방치뷰에 안 맞아 제외. 커밋 100f12b.
- C2: run.mjs(코어 완성·테스트됨) 확인 후 UI만 신설. RunScreen.js 작성(노드맵·생명바·보상3택·정산), features.mjs에 expedition 플래그, App.js '원정' 탭 등록. 신설 토큰 사용. 커밋 29fa3df.
- 검증도구: JSX는 node로 문법검증 불가 → esbuild(scratchpad)로 문법 게이트. npm install 완료 후 `expo export --platform web`로 실빌드 → python http.server로 띄워 브라우저 a11y트리/JS로 구동 확인.
- 실구동 검증 결과: 앱 부팅·콘솔에러0, '원정' 탭 노출, RunScreen 렌더("파티를 이끌고 10개 노드…"), '원정 시작' 클릭 시 노드맵(⚔️×5·🔶엘리트@6·⚔️×3·💀보스@10)·생명100%·전투버튼 정상, 탭 전환에도 state.run 유지(저장·복원 OK). 코어 테스트 279 pass·0 fail 유지.
- 미해결/후속: 스크린샷은 방치 rAF 루프가 CDP 점유해 캡처 불가(시각 미세조정은 Gim PC). BattleView 애니를 RunScreen 전투에 결합은 후속. 아직 push 안 함(로컬 5커밋 ahead).
- 결과: B1·B2·C1(기존완성 확인)·C2·D1 완료. 남은 코드후보: B1 토큰 화면 적용확대, B4 온보딩 리디자인, RosterScreen 분해. 아트/서버는 Gim 환경.
- push 완료: b1f3632..3381abb (5커밋).

## 2026-07-18 — RosterScreen 분해정리(순수 리팩터)
- 요청: "분해정리 진행". RosterScreen.js(1400줄)가 단일 최대 복잡도 핫스팟이라 표시 헬퍼를 분리.
- 진행: app/screens/roster/describe.js 신설 — 순수 표시 헬퍼(describeEffect/Skill/TeamBuff/Gear/GearItem/Subs/Awaken/Rune·statIcon·STAT_ICON·ov·DeltaText·costumeNeedText) + 표시 상수(SLOT_KO·GEAR_CATS·ROSTER_TABS·DETAIL_TABS) 이동. 상태 얽힌 하위패널은 위험/대공사라 이번 제외.
- 방법: 본체(224줄~) 사용횟수 실측으로 재-import 대상 13개 확정, 헬퍼전용 import(gearContribution·SOURCE_LABEL)만 제거. 삭제는 줄번호 기반 Node 스크립트(앵커 검증 포함)로 공백 불일치 위험 제거. 1400→1266줄(-138). 유지: RARITY_RANK·rarityColor/Text·powerWithGearItem/RuneItem/NextStar.
- 검증: esbuild 문법 OK(양파일), import 삽입·잔존 import 0·중복정의 0 확인. expo export 재빌드→실구동: 영웅 화면 정상(상세탭 육성/장비/스킬/꾸미기=DETAIL_TABS, 로스터탭=ROSTER_TABS, 스탯아이콘=statIcon, "전투력375→420 ▲+45"=DeltaText 모두 정상), 콘솔에러 0. 코어테스트 279 pass·0 fail.
- 결과: 커밋 17b01aa. 동작 불변 순수 정리 완료. 후속 분해 후보: 상태 얽힌 하위패널(장비/룬/스킬)은 프롭 스레딩 필요해 별도 신중 작업.

## 2026-07-18 — B1 토큰 적용확대 + B4 온보딩 리스타일
- 요청: B1 토큰 화면 적용확대 + B4 온보딩 리디자인.
- B1: 공용 Card(app/components.js)가 iOS shadow만 있고 Android elevation 누락→모바일 카드 평평. ELEV.card 토큰(elevation 포함)으로 교체 + borderRadius→RADIUS.xl. 전 화면 카드 한 번에 깊이감. 커밋 d9e1e82.
- B4: Onboarding.js의 IntroModal/ObjectiveBanner 스타일을 토큰(FONT/RADIUS/WEIGHT/ELEV/SPACE)으로 통일 + 소개카드 ELEV.modal·배너 ELEV.card 깊이. 로직·슬라이드 불변(순수 스타일). 커밋 1a80dfc.
- 검증: esbuild 문법 OK, expo export 재빌드, 실구동—앱 부팅·콘솔에러0, 온보딩 모달 리스타일 렌더·뒤 카드 정상. 시각 깊이(그림자/elevation)는 기기/Gim화면에서 확인.
- 발견(제 변경 무관): 코어 테스트 1개가 플래키(무작위 의존)—간헐 실패. 4회 재실행 중 1회만 fail, 나머지 279 pass·0 fail. 지시 없이 수정 안 함, 발견만 기록.
- 결과: B1·B4 완료. 남은 코드후보: 화면별 토큰 추가적용(점진), B5 마이크로인터랙션, 로스터 2차분해. 아트(A1~3)·서버(C3)는 Gim 환경.

## 2026-07-18 — 플래키 테스트 수정 + B5 + B1 판단
- 플래키: 전체 스위트 120회 반복해 재현(run87). 범인=core-mechanics.test.mjs:251 '추천 빌드…' — craftGear를 Math.random(시드없음)으로 만들어 두 무기 전투력 근접 시 optimizeLoadout(슬롯별 그리디 휴리스틱)의 선택이 특정 uid 단언과 갈림(~1/100). 근본수정: 코드가 실제 보장하는 것만 단언(보유 무기 장착 + 빌드 전투력 향상), 특정 uid/최대전투력 단언 제거. 300회 반복 0실패 확인. 커밋 29862c6.
- B1 판단: 핵심(공용 Card ELEV 그림자=Android depth)은 이미 적용됨. 남은 "화면별 매직넘버→토큰"은 토큰값을 기존과 동일하게 맞춰둬 화면 불변인 순수 churn → 위험만 늘고 효과 없어 보류(ponytail). Gim에게 설명.
- B5: 온보딩 IntroModal 슬라이드 전환에 260ms 페이드 인(useNativeDriver, reducedMotion시 off). 웹 실구동: 4슬라이드 전환·시작하기 정상, 콘솔에러0. 커밋 2479851.
- 결과: 플래키 수정·B5 완료. B1 추가 churn 보류. 남은 코드후보: 로스터 2차분해, D2 성능점검, 추가 실동작 애니(기기 검증 권장). 아트(A1~3)·서버(C3)는 Gim 환경.

## 2026-07-18 — D2 성능 점검 + 로스터 2차 분해 판단
- D2: 실측(30유닛·인벤60·23.6KB 상태). serialize=0.058ms/회, computePower=0.0028ms/회 → 매초 저장해도 무시할 수준. 틱 루프는 bump() 미호출로 비활성 화면 초당 리렌더 안 함(React.memo 결합)—방치형 렉 이미 제거됨. 세이브도 SAVE_VERSION·백업·normalizeRoster 마이그레이션으로 견고. 결론: 최적화 불필요, 코드 무변경(빠른 걸 안 고침).
- 로스터 2차 분해: RosterScreen 본문 분석 결과 useState 13개+애니 useEffect+파생데이터+클로저 6개가 얽혀, 패널 추출은 prop 십수개 스레딩 필요·전수 검증 불가. D2에서 성능이유도 없음 → 고위험·저보상. Gim과 협의해 **패스** 결정. 1차(순수함수) 안전분리로 이미 충분.
- 결과: D2·2차분해 판단 완료(둘 다 코드 무변경). 남은 실작업 대부분이 Gim 환경(아트 A1~3 GPU·서버 C3) 또는 저가치. 다음: 아트 배선/가이드 준비가 최대 레버.

## 2026-07-18 — A1 아트 배선 점검: 이미 완료
- 점검: unitSprites.js에 fantasy 21키(idle/attack/hit/walk) 등록, assets/units/fantasy 21폴더×4PNG=84개 완비. IdleScreen이 {cid:concept.id, key:u.characterId}로 파이터 생성 → 로스터 21 id와 스프라이트 키 정확히 일치. 간극 0.
- 결론: **A1(판타지 3D 스프라이트 게임 반영)은 이미 100% 완료.** 새로 배선할 렌더 없음. SF(scifi)만 유닛 스프라이트 없어 이모지 폴백(SF 출시 시에만 필요).
- 배선 계약: assets/units/<concept>/<key>/<key>_<state>.png(가로16프레임 128²). 재렌더를 같은 경로에 덮어쓰면 코드 무수정 반영(Metro 정적 require라 목록은 명시적). 새 캐릭터 추가 시에만 unitSprites.js에 1줄.
- 결과: docs/ART_A1_STATUS.md 작성(현황표+자동배선계약+A2 재렌더 흐름+SF 간극). A2/A3는 Gim PC 렌더(코드 무관, 에셋 덮어쓰기+재빌드). 헛작업 안 만들고 정직 보고.



