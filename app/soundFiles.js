// ─────────────────────────────────────────────────────────────
// 실오디오 레지스트리 — mp3/wav 파일을 넣고 한 줄 등록하면 신스 대신 재생.
//
// 파일 위치: assets/sfx/<name>.mp3   (name = 아래 사운드 키)
// 사운드 키: click tap success coin levelup summon sr ssr win error
//
// Metro는 정적 require만 번들하므로 명시적으로 등록한다. 등록 안 된 키는
// Web Audio 신스로 자동 폴백(캐릭터 아트 파이프라인과 동일 패턴).
//
//   예) ssr: require('../assets/sfx/ssr.mp3'),
//       coin: require('../assets/sfx/coin.mp3'),
// ─────────────────────────────────────────────────────────────

export const SOUND_FILES = {
  // ↓ 여기에 등록. (비어 있으면 전부 신스 폴백)
};

export function soundFile(name) {
  return SOUND_FILES[name] || null;
}
