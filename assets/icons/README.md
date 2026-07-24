# GUI 아이콘 세트 — 투톤 회색 + 골드(토킷)

인앱 GUI/UI 아이콘 소스. **단색 실루엣 + 색은 토큰 주입** 철학. 컨셉이 바뀌면 회색 2톤만 갈아끼우고, 골드는 보상·선택 의미색으로 고정한다.

## 파일 (14종)

| 그룹 | 파일 |
|---|---|
| 하단 탭 6 | `battle`(전투) `hero`(영웅) `summon`(소환) `expedition`(원정) `content`(콘텐츠) `shop`(상점) |
| 액션 8 | `gear`(설정) `mail`(우편) `auto`(자동) `fast`(배속) `quest`(퀘스트) `dungeon`(던전) `arena`(아레나) `gift`(수령=보상, 골드) |

- 규격: `viewBox 0 0 24 24`, 2px 스트로크, round cap. 벡터라 해상도 무한.
- 상태: 아이콘 자체는 항상 회색 실루엣. **활성/선택 표시는 컨테이너에 골드 테두리 프레임**을 두른다(아이콘 SVG는 안 바뀜). `gift`만 예외로 아이콘 자체가 골드.

## 색 토큰 (팔레트)

CSS 변수로 주입한다. 각 SVG에 폴백값이 내장돼 단독으로도 렌더된다.

| 토큰 | 폴백 | 용도 |
|---|---|---|
| `--icon-fill` | `#7b818e` | 실루엣 채움(어두운 회색) |
| `--icon-line` | `#c3c8d2` | 디테일 라인(밝은 회색) |
| `--icon-gold` | `#e8b84b` | 보상·선택(골드) |
| `--icon-gold-soft` | `#f6d488` | 골드 하이라이트 |

컨셉별 스왑 예: SF=차가운 회색(`#8b93a3`/`#d0d6e0`), 다크=따뜻한 회색(`#857f78`/`#c9c3ba`). 골드는 유지.

## 나중 배선 (RN)

`react-native-svg` 미설치 상태라 현재는 소스만. 배선 시:

1. `npx expo install react-native-svg`
2. path 데이터를 JS 컴포넌트로 옮기고, `fill`/`stroke`를 **prop으로 주입**(RN은 `<style>` CSS 변수를 안 읽음).
3. App.js `ALL_TABS`의 이모지(`icon:'🏰'`)를 `<GuiIcon name="battle" active={...}/>`로 교체. 활성 탭 컨테이너에 골드 border.

생성기: `assets/icons/_generate.mjs`(path 데이터 원본). 재생성: `node assets/icons/_generate.mjs assets/icons`.
