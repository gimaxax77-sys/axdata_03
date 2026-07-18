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

## 2026-07-13 밤 — 아트 브릿지 확인 + 캐릭터 매핑 초안
- 확인: 게임팩에 이미 브릿지 존재(gen-art-csv.mjs → docs/art_assets.csv). 캐릭터 33명, 초상 14완료/19필요, 전투 스프라이트(4종) 33 전원 필요.
- 추가: gen-character-map.mjs → docs/character_map.csv 자동 초안(로스터 원형/속성 기반).
  - 원형→몸: STRIKER/VANGUARD→Knight, SUPPORT→Mage, ROGUE→Rogue, ARCHER→Ranger.
  - 속성→색: FIRE빨강/WATER파랑/WOOD초록/LIGHT금흰/DARK보라.
  - 배정: Knight 12·Mage 11·Rogue 5·Ranger 5. (Gim 검토·수정용, Barbarian/Rogue_Hooded 다양화 여지)
- 남은 통합: 렌더 도구가 이 매핑대로 게임 규격 이름·경로로 출력 → charImages.js 자동 반영.

---

## QoL 배치 4종 (피로도 제로 보강) — 완료

Gim이 선택박스로 4가지를 모두 고르셔서 순서대로 구현·커밋·검증했습니다.

### ① 전체 던전 일괄 소탕
- `ContentScreen.doSweepAll` — 해금·입장 남은 모든 던전을 한 번에 소탕.
- '🧹 모두 소탕' 버튼을 던전 타일 아래 배치.

### ② 우편함 '읽은 우편 비우기'
- 코어: `mailbox.clearClaimedMail(state)` — 수령 완료 우편만 제거, 미수령 보존. 테스트 3건.
- `MailboxModal`에 읽은 우편이 있을 때만 노출되는 비우기 버튼.

### ③ 재화 낭비 알림
- 코어: `nudges.spendNudges(state)` — 소환 재화가 10연 1회분(100) 이상 쌓이면 알림. 테스트 3건.
- 근거: 자원 상한이 없어 "가득"은 없음 → 소환 재화는 소환 외 용처가 없어 쌓아두면 곧 낭비. 홈에 안내 라인.

### ④ 낮은 등급 장비 자동 분해
- 코어: `gearsalvage.autoSalvage(state, maxRarity)` — 인벤토리 하급 드롭(임계 이하·레벨1·인챈트 없음)을 재화로 정리. 강화/인챈트 투자분은 보호. 테스트 5건.
- 설정: `settings.autoSalvage`(null/끄기·'N'·'R'), 기본 끄기(save.mjs 마이그레이션).
- `ContentScreen`에 토글 3단(끄기/노멀↓/레어↓) + 소탕·던전 드롭 직후 자동 실행, 결과 문구에 '♻️분해 N개 🪙…' 병기.

### 검증
- `node --test system/test/*.test.mjs` → 267 pass / 0 fail.
- `npm run build:play` 성공(7668KB), mock 유출 0. play.html 전송 완료.
- 각 기능 개별 커밋(의미 단위), `claude/git-connection-status-rkjuko` 푸시.

## 2026-07-16 — 게임 단순화 재설계 착수 (최소 코어 + 선택 모듈 옵션화)
- 요청(Gim): 게임을 최소 코어 + 나머지 모듈 옵션화 구조로 진짜 재설계. 삭제가 아니라 기능 플래그로 on/off. 캐릭터는 이름+원형만(등급·속성 제거).
- 배경: 로스터를 21명으로 교체 시도 → 등급(rarity)·속성(element)이 14개+ 시스템(가챠·장비·펫·룬·유물·엠블럼·가디언·전투상성 등)의 뼈대라 커버리지·패리티 테스트 3종이 깨짐. 되돌림.
- 결정: 옵션화(플래그) 방식이 안전. 기본=풀 모드(비파괴), simplePreset로 선택 모듈 off.
- 진행(Phase1 스캐폴드, 비파괴): docs/redesign-plan.md 작성 + system/core/features.mjs(FEATURES/isOn/simplePreset) 추가. 아직 어느 모듈도 안 물림 → 테스트 그대로 통과.
- 자산: 21종 KayKit 캐릭터 초상(axdata_05/out_portrait21) + 16동작 스프라이트 2688장(out_roster_full). render_sprites env(SPRITE_CHARDIR/ANIM_PATH/FRAMES/DIR/OUT)로 재렌더 자동화.
- 다음: Phase2 element 옵션화 → Phase3 rarity 옵션화 → Phase4 부가모듈 → Phase5 21로스터 연결 → 검증. 각 단계 테스트 통과 유지.

## 2026-07-16 — 재설계 Phase2·3 (속성·등급 옵션화)
- Phase2 속성: elements.affinity + synergy 속성블록을 isOn('elements')로 가드 → off면 전투 스탯 전용, 속성 시너지 없음.
- Phase3 등급: seed.rarityBaseMult를 isOn('rarity')로 가드 → off면 전투력 등급 무관. 등급 커버리지 테스트(newArchetypes)를 등급 off 시 skip 처리.
- 검증: system/test/features.test.mjs (속성·등급 on/off 5케이스). 전체 테스트 0 실패(기본 풀모드 비파괴).
- 남음: Phase4 부가모듈(펫·룬·유물·엠블럼·가디언·코스튬·가챠·장비·아레나·길드) 옵션화 → Phase5 21로스터(fantasy+scifi 동시 축소) 연결 → Phase6 단순모드 구동검증.

## 2026-07-16 — 컨트롤 판넬 + Phase4 (UI 게이팅·단순모드 검증)
- 컨트롤 판넬: control-panel.bat + scripts/control-panel.mjs. features.mjs를 MODULE_META(그룹별)+FEATURES로 재구성 → 번호 토글·프리셋(단순/풀)·저장. 모듈 추가는 META+FEATURES 한 줄씩.
- Phase4: App.js TABS를 isOn(feat)로 필터(가챠·상점 탭이 off면 숨음). 코어 탭(전투·영웅·콘텐츠)은 항상.
- 검증: features.test에 '단순모드 코어 유닛·전투력·시너지 정상' 스모크 추가. createUnit(archetype,opts)는 element 옵션(null 기본)·rarity 인자 없음 → 코어가 원형만으로 유닛 생성 이미 지원. 전체 273/0 통과.
- 남음: Phase4 잔여(각 화면 내부의 off 기능 숨김: 펫/룬/유물/엠블럼/가디언/코스튬/아레나/길드 UI) · Phase5(21 로스터 fantasy+scifi 동시 축소+KayKit 초상, 커버리지 test는 등급 off시 skip) · Phase6(단순모드 실제 구동).

## 2026-07-16 — 코어 캐릭터 정의 일반화 (어떤 장르·형태 캐릭터도 로스터 허용)
- 요청: Phase4는 인앱 토글 없이 컨트롤 판넬에서만 조작(현행 그대로). 코어 캐릭터 정의를 수정해 어떤 장르·형태 캐릭터도 로스터 적용 가능하게.
- 변경: content.test 유효성 검증을 '이름+원형 필수, 나머지(속성·시그니처·코스튬·대사)는 있을 때만/모듈 켜졌을 때만 검증'으로 완화. 패리티는 두 스킨 캐릭터 수가 같을 때만 확인(단일/유연 로스터 허용).
- 검증: features.test에 '이름+원형만 있는 임의 형태 캐릭터(로봇 등) 로스터 유효' 추가. 전체 274/0 통과.
- 의미: createUnit(archetype, opts)가 이미 element/rarity 없이 동작 + 유효성 완화 → 21 KayKit(기사·스켈레톤·늑대인간·로봇곰 등) 및 미래 임의 캐릭터를 로스터에 바로 넣을 수 있음.

## 2026-07-16 — Phase5 21 KayKit 로스터 실제 적용
- fantasy 로스터를 21종(이름+원형만)으로 교체: 기사/팔라딘/황금기사/해골골렘/바바리안/대전사/늑대인간/광랑/해골전사/해골졸개/드루이드/곰인형/도적/암살자/해골도적/괴이곰/궁수/기공사/흑마법사/강령술사/해골법사. 원형분포 V4·S6·Sup2·R4·A2·M3(6원형 전부).
- 초상: axdata_05/out_portrait21 → 01/assets/char/fantasy/<id>.png 복사. charImages.js fantasy 21 갱신. 코스튬 비움(옵션).
- 등급 커버리지 테스트: 컨셉이 등급 안 쓰면(일반 로스터) 생략하도록 수정 → fantasy(21,등급없음) 스킵, scifi(33,등급있음) 검사. 전체 274/0 통과.
- scifi는 33 유지(패리티 유연화로 무관). 다음: Phase6 실제 빌드 구동.

## 2026-07-16 — 전투 화면 캐릭터 아트 표시(이모지→전신 렌더)
- 증상: 전투 화면에 이모지만 나오고 연결한 21종 캐릭터 아트가 안 보임(Gim 확인: "이모지만 나옴").
- 원인: BattleView가 identity().emoji만 렌더. 3D 스프라이트 등록부(unitSprites.js SHEETS)는 비어 있고, charImages(초상)는 로스터 화면 전용이라 전투엔 미사용.
- 조치: axdata_05/out_front21의 정면 전신 대기 포즈 21종을 assets/char/battle/<id>.png로 복사(초상=얼굴컷이라 전투 부적합, 전신 포즈 사용). app/battleImages.js 등록부 추가. IdleScreen.heroFormation을 {emoji,img}로 확장(battleImage(concept.id,characterId)). BattleView에 Fighter 컴포넌트 추가 — img 있으면 Image, 없으면 이모지 폴백(scifi 등 무등록은 자연 폴백).
- 검증: 로컬 웹 빌드 DOM에서 char/battle/knight.png 배경이미지 렌더 확인. 테스트 274/0.

## 2026-07-16 — 전투 애니메이션 스프라이트 적용 + 스케일 확대
- 요청: 전투 화면에 정지 이미지가 아니라 애니 스프라이트 적용, 캐릭터 크기 확대.
- 스트립 조립: out_roster_full 개별 프레임 → 가로 8프레임 스트립(128px). 상태 idle(순환)·attack(1회, 원형별 클립: VANGUARD=slice_diagonal, STRIKER=2h_chop, ROGUE=stab, ARCHER=bow_release, MAGE=magic_shoot, SUPPORT=spellcasting). hit 스트립도 생성했으나 용량 위해 미등록.
- 배치: assets/units/fantasy/<id>/<id>_{idle,attack,hit}.png. unitSprites.js에 21종 등록(frames 반환 추가).
- BattleView: SpriteFighter 추가 — idle 순환, 공격 틱(atk 카운터)마다 attack 1회 재생 후 idle 복귀. 우리 파티는 좌→우 향하도록 scaleX(-1) 반전. 스프라이트 없으면 전신이미지→이모지 폴백(scifi 등).
- 스케일: 전열 96px·후중열 76px(기존 이모지 22px/이미지 46px 대비 확대). arena 높이 132→220.
- 검증: 로컬 웹 빌드 DOM 확인 — 96px 프레임 창(overflow hidden)이 768px 스트립을 한 프레임만 표시, scaleX(-1) 반전, attack 스트립 로드 확인. 테스트 274/0.
- 용량: play.html 16MB로 증가(스프라이트 다수). 단일 웹보다 Expo/네이티브 빌드가 적합.

## 2026-07-16 — 첫 APK 클라우드 빌드 성공
- 전투 스프라이트 방향 버그 수정(scaleX 반전 제거) 후 EAS 빌드.
- git 로컬 shallow clone(file://) 실패 → EAS_NO_VCS=1로 작업 디렉터리 직접 압축 업로드(25MB)로 우회.
- eas build -p android --profile preview --non-interactive --no-wait. 원격 키스토어 자동(Build Credentials wP_IdursVd). SDK 51, v1.1.0, 버전코드 2.
- 결과: finished. APK = https://expo.dev/artifacts/eas/NOSpmcDujwEltgGopCN1n0gKI36piLTVXZWr5aV-dMA.apk
- 빌드 페이지: https://expo.dev/accounts/gimax77/projects/eldria-idle/builds/5177c725-41b8-453a-bb67-f18c503edd22
- 소요: 큐 ~14분 + 빌드 ~6분. 향후 빌드도 EAS_NO_VCS=1 필요(로컬 git clone 이슈).

## 2026-07-16 — 전투 애니 16프레임 재렌더(부드럽게)
- 요청: 프레임 늘려 애니 더 부드럽게(Gim). 8→16프레임.
- 방식: axdata_05에서 Blender로 idle+attack 재렌더(SPRITE_FRAMES=16). 각 동작 타임라인 16 균등 샘플 = 진짜 3D 중간동작(보간 아님). 카메라 SPRITE_DIR="1,0,0"(오른쪽 측면, 기존과 동일 검증).
- 조립: scripts/assemble_strips.py (SRC=out_battle16, NFR=16, idle+attack) → assets/units/fantasy/<id>/<id>_{idle,attack}.png (가로 16프레임, 2048×128).
- 코드: unitSprites.js frames 8→16(21종). spriteAnim.mjs fps 상향(idle 10→20, attack 14→28, hit 24, death 20, spawn 24) — 재생시간 동일·부드러움 2배.
- 검증: DOM에서 knight_attack 스트립 img폭 1536(=16×96), 창 96 한 프레임. 테스트 274/0.
- 렌더 매핑·드라이버: axdata_05/battle_render_map.tsv, axdata_05/render-battle16.sh(커밋). 재렌더 재현 가능.
- 용량: play.html 16→18MB(프레임 2배). 스프라이트 게임은 APK 권장.

## 2026-07-16 — APK 재빌드(16프레임 최종본)
- 16프레임·정방향·확대 반영한 새 APK. EAS_NO_VCS=1, preview 프로파일.
- 결과: finished. APK = https://expo.dev/artifacts/eas/7iYy_4f-W1l2EsmqyKfpLAFMC8yRVrKJXFBFzMPQIkc.apk
- 빌드 페이지: https://expo.dev/accounts/gimax77/projects/eldria-idle/builds/c254f8ad-aff3-4584-bccd-9fd876b51091
- 웹(play.html)은 18MB로 아티팩트 16MB 한도 초과 → 웹 링크 갱신 불가, APK가 정식 배포 경로.

## 2026-07-16 — 앱 크래시 대응(레벨업 Max / 내보내기)
- 증상(Gim, APK): 레벨업 Max → 에러화면(ErrorBoundary), 세이브 내보내기 → 앱 종료. 웹·node에선 재현 안 됨(계산·직렬화 정상).
- 가설: 네이티브(Yoga)는 width:"NaN%" 등 비유한 스타일값에서 크래시(웹은 무시) → 웹만 정상.
- 조치(방어+진단):
  1) components.js pctW(n) 추가(0~100 클램프, 비유한→0). 전 화면 진행바 너비에 적용(Roster·Arena·Gacha·Idle·Content·Meta·PixelIdle).
  2) Settings.doExport try/catch — 내보내기 실패가 앱을 죽이지 않게(원인 메시지 노출).
  3) ErrorBoundary가 에러 메시지+컴포넌트 위치를 화면에 항상 표시(테스트 단계 진단용, __DEV__ 가드 제거).
- 목적: 이 빌드로 실제 에러 텍스트를 확보해 정확히 수정. 테스트 274/0, 웹 컴파일 정상.

## 2026-07-17 — 레벨업 Max 크래시 원인 확정 + 로그인 이모지 수정
- 진단 빌드로 실제 에러 확보: "Attempting to run JS driven animation on animated node that has been moved to native earlier (useNativeDriver:true)" @ PowerBadge.
- 원인: PowerBadge가 같은 Animated.View에 scale(transform, native)과 glowRadius→shadowRadius(JS)를 동시 애니. shadowRadius는 네이티브 드라이버 불가 → 네이티브에서 드라이버 혼용 크래시(웹은 무시). 레벨업 Max로 전투력 상승 시 발동.
- 수정: PowerBadge scale 애니를 useNativeDriver:false로 통일(작은 뱃지라 성능 무관). ResCell/StarBadge는 노드 분리/transform-only라 정상.
- 두번째 증상(로그인 후 캐릭 이모지): 클라우드/예전 세이브 유닛의 characterId가 현재 21로스터에 없어 스프라이트 폴백→이모지.
  수정: useGame.normalizeRoster — 로드 시 미등록 characterId를 같은 원형 로스터 캐릭터로 uid해시 안정 재매핑. applyLoad·importSave·cloud pull 세 경로 모두 적용.
- ErrorBoundary는 원인 표시 유지(테스트 단계). 테스트 274/0.

## 2026-07-17 — 등급(rarity) 모듈 끄기(Gim 요청)
- Gim: 등급 아예 적용 말 것 → 등급 모듈 off + 표시 제거.
- features.mjs: rarity false(기본 off).
- 표시 게이팅(isOn('rarity')): components.Portrait(링 글로우·배지 → 중립 N), RosterScreen(이름 옆 등급 알약·씨앗 등급문구), GachaScreen(RevealCell 등급 라벨·색테두리·확률 안내문). 전투력은 rarityBaseMult=1로 이미 등급 무관.
- 주의: 등급 off로 기존 UR·SSR 유닛 전투력이 등급배수만큼 하락(설계상 정상, Gim 동의).
- 테스트: 등급 검증 테스트(core-mechanics·economy)는 FEATURES.rarity=true 명시+복구로 격리. features 기본값 테스트 rarity=false로 갱신. 273 pass/0 fail(등급 커버리지 1 skip).

## 2026-07-17 — 등급 표시 잔여 제거(장비·펫·정령·유물·엠블럼)
- 이전엔 캐릭터·뽑기만 가림. 아이템류 등급 배지 남아 있던 것 발견(Gim 스샷).
- GrowthPanel: Tile(펫·정령·유물·엠블럼 공용) 등급 테두리·라벨 isOn('rarity') 게이팅 + 상세 인라인.
- RosterScreen: rarityColor()→중립(T.line), rarityText()→display:none 로 등급 off 시 전 장비/룬/코스튬 표시 일괄 숨김(사이트 10곳+ 한번에).
- ContentScreen: 드롭 토스트의 [등급] 표기 게이팅.
- MetaScreen(도감): 로스터 등급 데이터 없음 + Portrait 게이팅으로 이미 정상.
- 테스트 273/0.

## 2026-07-17 — 전투 4상태 애니 배선(hit·walk 추가)
- unitSprites.js: 21종 idle/attack/hit/walk 등록(16프레임). spriteAnim.mjs: walk 규약 추가(1회, 20fps).
- BattleView: hitTok(적 반격 t%6), walkTok(적 처치→다음 웨이브) 추가. SpriteFighter가 attack/hit/walk 토큰 감시, 소스순 마지막 우선(피격이 공격 끊음). onEnd→idle.
- 검증: 로컬 웹 DOM에서 attack·hit·walk 상태 전환 확인(에러 0). 테스트 273/0.

## 2026-07-17 — 자원바 아이콘 인앱 배선(UI 1단계)
- app/uiIcons.js: 자원키→assets/ui 아이콘 레지스트리(resIcon). components ResCell이 아이콘 있으면 Image, 없으면 이모지 폴백. ResourceBar가 iconKey 전달. resIcon 스타일 22px.
- 범위: 상단 자원바만(다른 화면 자원 이모지는 유지). 검증: 웹 DOM에 ui 아이콘 4개 렌더 확인. 273/0.

## 2026-07-17 — 전투 배경 인앱 적용(UI 2단계)
- IdleScreen 전투 무대(Card)에 bg-battle.png 절대배치(콘텐츠 뒤, 둥근모서리 클립, opacity 0.9). stage overflow:hidden.
- 검증: 웹 DOM에 bg-battle 렌더 확인(에러 0). 목업으로 파티+던전바닥 확인. 273/0.

## 2026-07-17 — 전투 무대 레이아웃 재설계(Gim 피드백: 위치 어색·스케일)
- 문제: 파티가 무대 중앙에 떠 있고 텍스트와 겹침, 캐릭터 작음.
- BattleView: 파티/적 바닥 정렬(arena flex:1, alignItems flex-end). 스케일 확대(FRONT 96→120, BACK 76→96, enemy 72→104). 편성 열 겹쳐쌓기(formCol gap -8)로 7인도 그룹으로 뭉침.
- IdleScreen: 층·구역 = 상단 배너(절대, 그림자). 적HP·속성·시너지 = 카드 밖 아래 스트립. 구역바 = 무대 하단 절대. 무대 padding 0으로 배경 꽉 채움.
- 검증: 웹 컴파일·273/0. 목업으로 파티 바닥정렬·확대 확인.

## 2026-07-17 — 전투 2열 표시 + 배경 층/난이도 적용
- BattleView: 전투 화면에 중열+전열(1·2열)만 표시, 후열 숨김(Gim 요청, 로직 무관).
- IdleScreen: BATTLE_BGS 배열 층÷10 순환 + DIFF_TINT 난이도 색조 오버레이(stageTint). 구 bg-battle.png 제거.
- 273/0.

## 2026-07-17 — 전투 배경 8종으로 확장(Gim 요청)
- 던전 변형 4종 추가(bg4 가시바닥+게이트창, bg5 대형격자, bg6 격자+아치, bg7 파운데이션+슬로프T). 총 bg-battle-0..7.
- 숲 팩은 gltf가 풀뿐이라 던전 변형으로 확장. IdleScreen BATTLE_BGS 8종, 층÷10 순환.

## 2026-07-17 — 속성(element) 모듈 끄기(Gim 요청, 등급과 동일)
- features.mjs: elements false(기본 off). affinity/synergy는 이미 isOn 게이팅됨(=1, 결속 없음).
- 표시 게이팅: IdleScreen 구역 속성·적 속성/상성 숨김. RosterScreen 장비 속성부여 버튼 숨김. ContentScreen 보스 속성 숨김. (21로스터는 element 없어 대부분 이미 공백.)
- 테스트 격리: elements 검증 테스트(core-mechanics·pvp-resolve·features)는 FEATURES.elements=true 명시+false 복구. 기본값 테스트 갱신. 273/0.

## 2026-07-17 — 무기·방패 장비 아이콘(3D)
- render_icons.py로 7종 렌더: sword(sword_D)·dagger·bow·axe·greatsword(sword_B)·shield(round)·tome(staff_A). → assets/ui/gear/.
- uiIcons.gearIcon(blueprint): 블루프린트→아이콘 매핑(검류 다수→sword, 방패류→shield, ARCANE_TOME→tome). 모델 없는 방어구·장신구는 null→이모지 폴백.
- RosterScreen 장비 타일: 장착 아이템이 gearIcon 있으면 Image, 없으면 슬롯 이모지. 273/0.

## 2026-07-17 — 적 몬스터 스프라이트(이모지→몬스터)
- 적 5종(skeleton_warrior/minion/mage/golem, werewolf_wolf) idle+hit 렌더(왼쪽 향함 SPRITE_DIR=-1,0,0, 16프레임, General/Idle_A·Hit_A). axdata_05 body는 battle_render_map.tsv 경로 재사용.
- 조립 → assets/units/enemy/<id>/<id>_{idle,hit}.png. unitSprites 'enemy:<id>' 5종 등록.
- BattleView EnemyFighter: idle 순환, 히어로 공격(atk)마다 hit 재생. enemyKey 없거나 미등록이면 이모지 폴백.
- IdleScreen ENEMY_KEYS 층÷10 순환(배경과 함께 변화). 273/0.

## 2026-07-17 — UI/아트: 무덤 배경 2종 + 뽑기 장비 아이콘
- 할로윈 팩으로 무덤 배경 렌더(bg8 흙바닥+철제울타리+해골묘비, bg9 파손울타리+무덤). render_scene.py 재사용(Halloween gltf). → bg-battle-8/9. BATTLE_BGS 10종.
- GachaScreen 장비 뽑기 결과 셀에 gearIcon(무기·방패 3D 아이콘) 적용, 그 외 이모지 폴백.
- 273/0.

## 2026-07-17 — 적 공격 애니 + 정리(픽셀모드·미사용초상)
- 적 공격 5종 렌더(왼쪽향함, 근접4=slice/chop/kick, 마법1=magic_shoot, 16프레임) → enemy/<id>_attack.png. unitSprites 'enemy:<id>'에 attack 추가.
- BattleView EnemyFighter: 적 반격(t%6)에 attack 재생(setEnemyAtk), 파티 공격 시 hit. idle 순환.
- 정리: 픽셀 모드 제거(App.js pixelMode/showPixel/togglePixel, ShopScreen 픽셀버튼, PixelIdleScreen.js 삭제, 옛 픽셀자산 bg-sanctum/hero-fire/enemy-guardian 삭제). 미사용 옛 초상 24종 삭제. 273/0.

## 2026-07-17 — 난이도 마커 3D + 장비 선택창 아이콘
- 난이도 마커: Gem_Large 4색 틴트(normal 초록/hard 노랑/hell 빨강/abyss 보라) → assets/ui/diff/. uiIcons.diffIcon. IdleScreen 난이도 버튼에 아이콘+라벨.
- 장비 선택창(picker): 제작·보유 목록에 gearIcon 표시(무기·방패), 없으면 텍스트만.
- 273/0.

## 2026-07-17 — 전체 코드 재점검(이슈 수정)
- [회귀 수정] npm test에 포함된 verify-character.mjs 3건 실패(등급·속성 off 전제 미반영) → 해당 블록만 FEATURES.rarity/elements=true로 켜고 복구. 이제 npm test 전체 통과(273/0 + 17/0 + 37/0).
- [데드코드 제거] battleImage/assets/char/battle(3.8MB): 21종 전부 스프라이트 보유 → 폴백이 영구 미실행. BattleView img 분기·Image import·miniImg 스타일까지 정리.
- [잔재 제거] charImages 'fantasy:kael'(로스터에 없음) + kael.png.
- [주석 정정] village.mjs의 PixelIdleScreen 참조, BattleView 헤더.
- 자산 32M→28M. 판넬/플래그 일관성 OK(OFF: elements·rarity), 적 자산·ENEMY_KEYS 일치 OK.
- [미해결·보고] village.mjs(본진 발전)가 픽셀 화면 제거로 UI 연결이 끊긴 고아 모듈(기능 손실). 삭제/재노출 결정 필요.

## 2026-07-18 — village(본진 발전) 전투 화면 되살리기
- 픽셀 화면 제거로 고아가 됐던 village를 IdleScreen 배너에 복구: '⛺ 본진: 야영지 → 전초기지 XX%' 한 줄(peakStage 기반, 순수 표시). villageTier import + village/villageDim 스타일.
- npm test 273/0 + 17/0 + 37/0, 웹 빌드 정상.

---

## [2026-07-18] 원정(로그라이트) 모드 기획

- **컨셉 확정**: 하이브리드 방치형 오토배틀러 로그라이트. 시장조사 결론 = 방치형+수집+오토배틀러 시너지+로그라이트 런.
- **재사용 판단**: 코어(resolve·synergy·formation·economy·성장·save·아트) 그대로 재사용. 상태/전투/캠페인이 이미 "장르 중립" 설계라 로그라이트는 얇은 run 레이어만 추가.
- **신규**: run.mjs / runBoons.mjs / RunScreen.js / state.run 필드 / '원정' 탭.
- **핵심 결정**: 전투는 resolve() 재사용, 소모전은 margin 기반 runHP 소모로 근사, boon은 모디파이어 파이프라인 주입, 통합은 App.js 탭 추가.
- 상세: `docs/ROGUELITE-PLAN.md`.
- **미결**: 통합/공유 범위(로스터·재화 공유 vs 분리 vs 새 앱) → Gim 확인 대기.

## [2026-07-18] 원정 P1 — run.mjs 코어 완성
- system/core/run.mjs 신규: startRun/currentNode/fightNode/pickBoon/endRun + BOONS 카탈로그.
- 전투는 resolve() 재사용, 소모전은 margin 기반 runHP 소모(attritionCost), boon은 accountMods.powerMult 주입.
- gameState에 run:null 필드 추가(세이브 자동 왕복).
- system/test/run.test.mjs 6/6 통과. 전체 279 통과/0 실패.
- 다음: P0(원정 탭 껍데기) → P3(RunScreen UI).
