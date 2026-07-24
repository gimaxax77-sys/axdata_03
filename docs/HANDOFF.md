<!-- 다음 세션 인수인계 프롬프트 (2026-07-24 기준) -->
# 인수인계 프롬프트 — axdata_03 (엘드리아 파생)

> 아래 블록을 새 세션에 그대로 붙여넣으면 맥락을 이어받는다. 기준일 2026-07-24.

---

## 📋 붙여넣기용 프롬프트

```
[인수인계] axdata_03 게임팩 작업을 이어간다. 먼저 아래를 숙지하고, "무엇을 할지"만 물어라.

■ 저장소 위치 (중요)
- 실제 경로: D:\.CODE\AXdata\axdata_03_엘드리아 파생\axdata_03-main  (폴더명에 공백)
- 주의: 세션 기본 cwd는 옛 D:\.CODE\AXdata\axdata_03 (지금 빈 폴더)로 뜬다. 위 신규 경로로 작업.
- git remote: github.com/gimaxax77-sys/axdata_03 (main, origin과 동기화됨).
- RN/Expo 프로젝트("eldria-idle"). 코어 순수 ESM(system/core/*.mjs), 앱 app/screens/*.js.

■ 진짜 목표 (프레이밍)
- 이 게임 = "범용 모듈 토킷". 기본 요소 외 전부 on/off 모듈(feature 플래그, system/core/features.mjs).
  컨셉·장르·진행 시점에 각개 적용. GUI도 조립식(위젯 슬롯).
- off인 elements/rarity, SF/판타지, 캐릭터 데이터 = 버려질 테스트 스캐폴딩. "빈약"으로 지적 말 것.
- 3트랙: 엘드리아(여기, RN) · 엘로그(axdata_11 RN 라이브) · 겜3(axdata_engine_엘로그2_cocos, Cocos 백지).
  설계상 겜3 먼저 → 검증 → RN 역이식. (단 이번 세션 작업은 여기 axdata_03에서 진행해 왔다.)

■ 현재 진행 상태 (2026-07-24)
- P0 "모듈 게이팅" 15/18 완료 (feature 플래그로 모듈 실제 on/off — 4게이트: 로직·효과·상태·UI).
  완료: relics·emblems·guardians·pets(계정파워), arena·guild·tower·season·events(콘텐츠),
        summon·intimacy·shop·costumes(독립), elements·rarity(기존).
  남음 3개: runes·sigweapon·gear (유닛 파워축). sigweapon off=씨앗 oath 연쇄, gear=핵심축 신중.
  패턴/체크리스트: docs/MODULE_GATING.md. 게이팅 테스트: system/test/module-gating.test.mjs.
- 문서(docs/): SYSTEM_AUDIT(냉정 감사) · GUI_REVIEW · UI_SKELETON_SPEC(세븐나이츠 최종본 기준 골격)
  · UI_ART_SPEC(아트 사이즈+골격 매핑) · ART_A1_STATUS(스프라이트 배선-이미 완료) · MODULE_GATING.
- 누적 로그: research.md (매 작업 기록됨). 상위 아키텍처: axdata_engine_엘로그2_cocos/UI_ARCHITECTURE.md.

■ 다음 후보 (Gim이 고름)
1) P0 마무리: runes·sigweapon·gear 게이팅(3개). gear는 밸런스 영향 커 신중.
2) 조립식 UI 착수: registry/ 폴더(tabs.js 이관=무동작 리팩터) → dockActions → left/right rail 슬롯.
3) 아트 생성: pixellab MCP로 UI 아이콘·등급프레임·데미지폰트(UI_ART_SPEC 규격 @2x/@3x). 즉시 가능.
   캐릭터/초상/배경은 PC(axdata_05 Blender)·API(axdata_09) 작업.

■ 작업 규칙 (CLAUDE.md 요약)
- 존댓말·초보자 눈높이·결론 먼저. 의사결정은 항상 선택형(체크박스) 질문.
- 코드 만지면 완료 전 테스트: node --test system/test/*.test.mjs (JSX는 esbuild로 문법검증).
  실앱 검증: EXPO_OFFLINE=1 npx expo export --platform web → python http.server → 브라우저.
  ※ 방치형 rAF 루프로 스크린샷은 원격서 안 잡힘 → read_page/JS로 확인.
- 의미 단위 커밋. Gim 파일(CLAUDE.md 등)은 내 커밋에 섞지 말 것.
- 호출 명령: "서브"=서브에이전트(승인게이트 2줄 노티 후), "롣/ㄹㄷ"=클로드 직접, "멤 ㅇㅇㅇ"=mem 검색.
- Gim 가용: 평일 08~21시 모바일만(PC작업은 밤10시+/주말). PC필요(Blender·Cocos에디터·설치)는 그때로.

■ 첫 행동
git -C "D:\.CODE\AXdata\axdata_03_엘드리아 파생\axdata_03-main" log --oneline -8 로 최신 확인 후,
docs/MODULE_GATING.md·UI_SKELETON_SPEC.md 훑고, Gim에게 위 "다음 후보" 중 무엇을 할지 선택형으로 물어라.
```

---

## 참고 (프롬프트 밖 메모)
- 미커밋 없음(2026-07-24 기준 origin 동기화). CLAUDE.md는 Gim이 수정한 채 uncommitted일 수 있음 — 건드리지 말 것.
- 메모리: `D:\.CODE\.Claude\projects\D---CODE-AXdata-axdata-03\memory\` 에 repo개명·토킷목표·GUI목업URL 저장됨.
