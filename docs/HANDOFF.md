<!-- 다음 세션 인수인계 프롬프트 (2026-07-24 갱신) -->
# 인수인계 프롬프트 — axdata_03 (엘드리아 파생)

> 아래 블록을 새 세션에 그대로 붙여넣으면 맥락을 이어받는다. 최종 갱신 2026-07-24.

---

## 📋 붙여넣기용 프롬프트

```
[인수인계] axdata_03 게임팩 작업을 이어간다. 먼저 아래를 숙지하고, "무엇을 할지"만 물어라.

■ 저장소 위치 (중요)
- 실제 경로: D:\.CODE\AXdata\axdata_03_엘드리아 파생\axdata_03-main  (폴더명에 공백)
- 주의: 세션 기본 cwd는 옛 D:\.CODE\AXdata\axdata_03 (지금 빈 폴더). 위 신규 경로로 작업.
- git remote: github.com/gimaxax77-sys/axdata_03 (main, origin 동기화됨. CLAUDE.md만 Gim이 수정한 채 uncommitted — 건드리지 말 것).
- RN/Expo("eldria-idle"). 코어 순수 ESM(system/core/*.mjs), 앱 app/screens/*.js.

■ 진짜 목표
- 이 게임 = "범용 모듈 토킷". 기본 골격 외 전부 on/off 모듈(feature 플래그, system/core/features.mjs).
  컨셉·장르·진행 시점에 각개 적용. GUI도 조립식(위젯 슬롯). 색·테마도 컨셉별 토큰 스왑.
- off인 elements/rarity, SF/판타지, 캐릭터 데이터 = 버려질 테스트 스캐폴딩. "빈약"으로 지적 말 것.
- 3트랙: 엘드리아(여기 RN) · 엘로그(axdata_11 RN 라이브) · 겜3(axdata_engine_엘로그2_cocos, Cocos).
  설계상 겜3 먼저→역이식(단 이번 작업은 여기서 진행 중).

■ 완료된 것 (전부 커밋·푸시됨)
- P0 모듈 게이팅 15/18 (feature 플래그로 실제 on/off, 4게이트: 로직·효과·상태·UI).
  남음 3: runes·sigweapon·gear(유닛 파워축, gear는 밸런스 커 신중, sigweapon off=씨앗 oath 연쇄).
  패턴/체크리스트: docs/MODULE_GATING.md. 테스트: system/test/module-gating.test.mjs. 전체 286 pass·0 fail.
- 문서(docs/): SYSTEM_AUDIT · GUI_REVIEW · UI_SKELETON_SPEC(세븐나이츠 최종본 기준 골격 G1~G5)
  · UI_ART_SPEC(아트 사이즈+골격 매핑) · UI_LAYOUT_BENCHMARK(3 허브유형: 마을/현황판/램프)
  · ART_A1_STATUS(캐릭터 스프라이트 배선 이미 완료) · MODULE_GATING · HANDOFF.
- 누적 로그: research.md. 상위 아키텍처: axdata_engine_엘로그2_cocos/UI_ARCHITECTURE.md.

■ 지금 진행 중인 미결 스레드 — GUI/UI 아이콘 아트 방향
- 목표: 인앱 GUI/UI 아이콘 세트 제작(탭 6·기능·액션 아이콘). 캐릭터 아트는 별개.
- 확정: "기존 아이콘 무시하고 새로". 캐릭터=3D툰, 배경=픽셀(혼합).
- 제약: pixellab MCP는 트라이얼 잔액 3/40 → UI 패널 1건에 20~40 필요 = 지금 생성 불가(업그레이드 결제 필요, Gim).
- 조사 결론(웹): 토킷엔 "플랫 벡터 SVG + 색은 토큰 주입 + 골드=보상 의미색 고정"이 정석(재사용·확장·컨셉 스왑에 유리). 실물 참고: gameuidatabase.com.
- 진행: SVG 아이콘 샘플 1차 제시함(모양은 유효, 단 퍼플/골드는 옛 theme에서 온 것이라 팔레트는 미확정).
- 다음: Gim이 레퍼런스(Game UI Database 등) 보고 스타일/팔레트 방향 확정 → 그 방향으로 SVG 아이콘 세트 확정 생성(무료).

■ 다음 후보 (Gim이 고름)
1) GUI/UI 아이콘 세트 확정(팔레트 정한 뒤 SVG로 무료 제작 — 즉시 가능).
2) 조립식 UI 착수: app/registry/(tabs.js 이관=무동작 리팩터) → dockActions → left/right rail 슬롯.
3) P0 마무리: runes·sigweapon·gear 게이팅.

■ 작업 규칙 (CLAUDE.md 요약)
- 존댓말·초보자 눈높이·결론 먼저. 의사결정은 항상 선택형(체크박스). 문장은 마침표로.
- 코드 만지면 완료 전: node --test system/test/*.test.mjs (JSX는 esbuild 문법검증).
  실앱: EXPO_OFFLINE=1 npx expo export --platform web → python http.server → 브라우저(read_page/JS, 스크린샷은 방치 rAF로 안 잡힘).
- 의미 단위 커밋. Gim 파일(CLAUDE.md)은 내 커밋에 섞지 말 것.
- 호출: "서브"=서브에이전트(승인게이트 2줄 노티 후), "롣/ㄹㄷ"=클로드 직접, "멤 ㅇㅇㅇ"=mem 검색(node C:\Users\gimsf\mem-tool\mem.mjs ㅇㅇㅇ), "멤 기록"=memory 저장.
- Gim 가용: 평일 08~21시 모바일만(PC작업=Blender·Cocos·설치·결제는 밤10시+/주말). 결제·구매는 내가 직접 안 함(Gim에게 안내).

■ 첫 행동
git log --oneline -8 확인 → docs/HANDOFF·UI_SKELETON_SPEC·UI_ART_SPEC·MODULE_GATING 훑고,
Gim에게 위 "다음 후보" 중 무엇을 할지 선택형으로 물어라. 아이콘 스레드면 팔레트 확정부터.
```

---

## 참고 (프롬프트 밖)
- 메모리: `D:\.CODE\.Claude\projects\D---CODE-AXdata-axdata-03\memory\` (repo개명·토킷목표·GUI목업URL).
- pixellab 잔액 부족은 결제 전까지 유효 — UI 아이콘은 당분간 SVG(무료) 경로 권장.
