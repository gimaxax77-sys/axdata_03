# 효과음 (실오디오 연동 규약)

효과음 파일을 넣으면 신스 대신 재생됩니다. 없으면 Web Audio 신스로 폴백.

## 규격
- 짧은 UI 효과음: `mp3`(권장) 또는 `wav`, 모노, ~44.1kHz, 0.1~1.5초.
- 파일: `assets/sfx/<name>.mp3`
- 사운드 키(name): `click` `tap` `success` `coin` `levelup` `summon` `sr` `ssr` `win` `error`

## 등록 (한 줄)
`app/soundFiles.js`:
```js
export const SOUND_FILES = {
  ssr:  require('../assets/sfx/ssr.mp3'),
  coin: require('../assets/sfx/coin.mp3'),
  // …
};
```
등록 안 된 키는 신스로 자동 폴백 → 있는 것부터 점진 도입.

## 라이선스
효과음 팩·생성물 모두 **상업 배포 라이선스**를 확인하세요.
