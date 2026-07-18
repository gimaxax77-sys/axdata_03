# 캐릭터 아트 (연동 규약)

캐릭터 일러스트를 여기에 넣으면 로스터·파티·소환·도감 전역에 자동 반영됩니다.

## 규격
- **초상**: `512×512` **투명 PNG**, 얼굴~상반신을 중앙에 배치(프레임에 `cover`로 채워짐).
- 파일 경로: `assets/char/<conceptId>/<characterId>.png`
  - conceptId: `fantasy` | `scifi`
  - characterId: 로스터의 `id` (예: kael, luna, gwen, ciel, bran, ael, ara, mir)
  - 예) `assets/char/fantasy/kael.png`, `assets/char/scifi/kael.png`

## 등록 (한 줄)
Metro는 정적 `require`만 번들하므로, PNG를 넣은 뒤 `app/charImages.js`에 한 줄 추가:

```js
export const CHAR_IMAGES = {
  'fantasy:kael': require('../assets/char/fantasy/kael.png'),
  'scifi:kael':   require('../assets/char/scifi/kael.png'),
  // …
};
```

등록되지 않은 캐릭터는 **이모지로 자동 폴백**되므로, 있는 것부터 점진적으로 넣으면 됩니다.

## 라이선스 주의
외주·AI 생성·에셋 스토어 어느 경로든 **상업 배포 라이선스**를 반드시 확인하세요.
