// 판타지 컨셉 기반 앱 테마 (라이트 퍼플 + 골드 게임 UI) — 밝은 톤 개편.
export const T = {
  bg: '#241a40',
  bgGrad: ['#2f2158', '#241a40', '#1c1434'], // 화면 배경 그라데이션
  surface: '#3b2d66',
  surfaceGrad: ['#453573', '#372a5e'], // 카드 그라데이션
  surface2: '#4b3b7d',
  line: '#63519e',
  primary: '#a186ec',
  primaryGrad: ['#b298f5', '#8266d6'],
  accent: '#ffd257',
  accentGrad: ['#ffe27a', '#f0b52e'],
  text: '#f9f6ff',
  muted: '#c3b7e2',
  good: '#7fe3a0',
  danger: '#ff5f7e',
  shadow: '#000',
  // 자원 색
  currency: '#ffd257',
  growth: '#71dcec',
  summon: '#d4a5ff',
};

// 여백 스케일 — 화면마다 제각각이던 padding/margin 매직넘버를 한 곳에서
// 조정하기 위한 공용 토큰. 미니멀 정리 1단계: 카드 패딩·카드간 간격을
// 여기 값으로 통일해 전역에서 한 번에 조율한다.
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 };

// 라운드(모서리) 스케일 — 기존 분포(4·8·10·12·16·pill)를 토큰화. 화면 적용은 점진.
export const RADIUS = { sm: 4, md: 8, lg: 12, xl: 16, pill: 999 };

// 타이포 스케일 — 기존 fontSize 군집을 그대로 토큰화(본문 12, 라벨 15, 제목 18, 강조 22/28, 초대형 56).
// 값은 기존과 일치시켜, 토큰으로 바꿔도 룩이 변하지 않게 한다(수술적).
export const FONT = { micro: 10, caption: 11, body: 12, sub: 13, label: 15, title: 18, head: 22, hero: 28, giant: 56 };
export const WEIGHT = { regular: '400', medium: '600', bold: '700', heavy: '800', black: '900' };

// 고도(그림자) 프리셋 — RN 스타일(iOS shadow* + Android elevation)을 한 곳에서 관리.
// 지금까지 그림자 사용이 사실상 없어(카드가 평평) 깊이감이 약했다 → 카드·떠있는 요소·모달 3단계.
export const ELEV = {
  card:  { shadowColor: T.shadow, shadowOpacity: 0.18, shadowRadius: 6,  shadowOffset: { width: 0, height: 2 },  elevation: 2 },
  float: { shadowColor: T.shadow, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },  elevation: 6 },
  modal: { shadowColor: T.shadow, shadowOpacity: 0.40, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
};

// 등급별 스타일 — 색·글로우·그라데이션. 초상/결과/도감 전역에서 공유.
export const RARITY_META = {
  N: { label: '노멀', color: '#9aa0b5', grad: ['#8891a8', '#5c6480'], glow: 'rgba(154,160,181,0.0)' },
  R: { label: '레어', color: '#5aa9e6', grad: ['#6cbcf5', '#3a7fc4'], glow: 'rgba(90,169,230,0.45)' },
  SR: { label: '에픽', color: '#c98bff', grad: ['#d9a0ff', '#9b5fe0'], glow: 'rgba(201,139,255,0.5)' },
  SSR: { label: '전설', color: '#f5c542', grad: ['#ffe27a', '#e8a91f'], glow: 'rgba(245,197,66,0.6)' },
  UR: { label: '신화', color: '#ff5e8a', grad: ['#ff9ec4', '#e0407a'], glow: 'rgba(255,94,138,0.7)' },
};
export function rarityMeta(r) {
  return RARITY_META[r] || RARITY_META.N;
}

export const RES_META = {
  currency: { color: T.currency },
  growth: { color: T.growth },
  summon: { color: T.summon },
};
