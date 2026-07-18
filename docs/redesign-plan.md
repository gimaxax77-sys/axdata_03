<!-- 단순 코어 + 선택 모듈(옵션화) 재설계 계획 -->
# 재설계 계획 — 단순 코어 + 선택 모듈

## 목표 (Gim, 2026-07-16)
게임을 **최소 코어 + 나머지 모듈 옵션화** 구조로 재설계한다. 삭제가 아니라 **기능 플래그로 켜고 끄기**. 단순 모드(플래그 off)와 풀 모드(현재) 둘 다 가능.

## 최소 코어 (항상 켜짐 — 플래그 없음)
- 캐릭터: **이름 + 원형(archetype)** 만 (등급·속성 없이도 동작)
- 전투: **순수 스탯**(공/방/체/속) + 원형 역할. (속성 상성은 옵션)
- 파티/편성 · 캠페인(방치) · 캐릭터 성장(레벨)
- 인프라: gameState · save · rng · seed · economy · stats · resolution · formation · units · modifiers · roles · progression · enhance · skills · spriteAnim

## 선택 모듈 (기능 플래그로 on/off)
elements(속성 상성·시너지) · rarity(등급 N~UR) · gacha · gear(+carry/salvage) · pets · runes · relics · emblems · guardians · costumes/cosmetics · arena · guild · season · events · tower · summon(+mastery) · sigweapon · intimacy · shop(+compshop) · lootbox · rentals · materials · difficulty · village

## 아키텍처
- `system/core/features.mjs` — 중앙 플래그 `FEATURES` + `isOn(key)`. 기본값 = 전부 on(기존 동작 보존).
- `simplePreset()` — 최소 코어 외 전부 off.
- 각 선택 모듈은 진입점에서 `isOn('key')` 확인 → off면 no-op/스킵. UI 화면도 플래그로 노출 제어.
- 테스트: 등급/속성 커버리지·패리티 검증은 해당 플래그 on일 때만 실행하도록 가드.

## 단계 (각 단계 = 테스트 통과 + 실제 구동 확인)
1. **스캐폴드**(비파괴): features.mjs + isOn. 기본 풀 모드라 아무것도 안 바뀜. ← 현재
2. **속성(element) 옵션화**: 전투/시너지/진영/캠페인이 element 없이 스탯 전용으로 동작. 관련 테스트 플래그 가드.
3. **등급(rarity) 옵션화**: 가챠/장비/펫/룬/유물이 rarity 없이 동작 or 스킵. 커버리지 테스트 가드.
4. **부가 모듈 옵션화**: pets·runes·relics·emblems·guardians·costumes·arena·guild 등 순차. 각 화면/상태 플래그 가드.
5. **21 캐릭터 로스터**(이름+원형) 연결 + KayKit 초상/스프라이트. 단순 모드에서 유효.
6. **검증**: 단순 모드 end-to-end 구동 + 풀 모드 회귀 테스트.

## 자산 (준비됨)
- 21종 KayKit 캐릭터: 초상(out_portrait21) + 16동작 스프라이트(axdata_05/out_roster_full, 2688장).
- 렌더 자동화: axdata_05 render_sprites.py (SPRITE_CHARDIR/ANIM_PATH/FRAMES/DIR/OUT env).

## 원칙
- 각 단계 비파괴·가역. 풀 모드 회귀는 항상 통과 유지.
- 큰 삭제 금지 — 플래그로 끄기. 되돌리기 쉽게.
