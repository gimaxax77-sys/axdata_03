// 기능 플래그 — 선택 모듈 on/off (단순 코어 + 옵션 모듈 구조)
// 최소 코어(캐릭터·전투·파티·캠페인·성장)는 항상 켜짐(여기 없음).
// 각 선택 모듈은 진입점에서 isOn('key') 로 확인해 off면 스킵한다.
//
// ▶ 모듈 추가법: (1) MODULE_META 에 {key:{label,group,desc}} 추가
//                (2) FEATURES 에 key: true 한 줄 추가
//                (3) 해당 모듈 코드 진입점에 isOn('key') 가드
//                컨트롤 판넬(control-panel.bat)이 자동으로 인식한다.

// 모듈 메타 — 컨트롤 판넬 표시용(그룹별 구분). 순수 정보, 로직 없음.
export const MODULE_META = {
  elements:  { label: '속성 상성',   group: '전투',      desc: '속성 유불리·속성 시너지' },
  rarity:    { label: '등급(N~UR)',  group: '전투',      desc: '캐릭터/장비/펫 품질 등급·전투력 배수' },
  gacha:     { label: '가챠 소환',   group: '수집·소환', desc: '캐릭터/장비 뽑기(천장 포함)' },
  summon:    { label: '소환 숙련',   group: '수집·소환', desc: '소환 누적 보상' },
  sigweapon: { label: '시그니처 무기', group: '수집·소환', desc: '캐릭터 전용 무기' },
  gear:      { label: '장비',        group: '장비·강화', desc: '장비 착용·강화·분해' },
  runes:     { label: '룬',          group: '장비·강화', desc: '룬 세팅' },
  relics:    { label: '유물',        group: '장비·강화', desc: '유물 강화' },
  emblems:   { label: '엠블럼(문장)', group: '장비·강화', desc: '계정 공유 버프' },
  pets:      { label: '펫',          group: '동료',      desc: '펫 보유·장착' },
  guardians: { label: '가디언(정령)', group: '동료',      desc: '가디언 보유·장착' },
  costumes:  { label: '코스튬',      group: '외형',      desc: '캐릭터 외형·소량 보너스' },
  arena:     { label: '아레나',      group: '콘텐츠',    desc: '경쟁 전투' },
  guild:     { label: '길드',        group: '콘텐츠',    desc: '길드 시스템' },
  tower:     { label: '무한의 탑',   group: '콘텐츠',    desc: '층 등반 콘텐츠' },
  season:    { label: '시즌',        group: '콘텐츠',    desc: '시즌 패스·보상' },
  events:    { label: '이벤트',      group: '콘텐츠',    desc: '한정 이벤트' },
  intimacy:  { label: '친밀도',      group: '관계',      desc: '캐릭터 호감도' },
  shop:      { label: '상점',        group: '상점',      desc: '상점·교환' },
};

// 플래그 값 — 컨트롤 판넬이 이 블록의 true/false 만 토글한다(한 줄=한 모듈).
export const FEATURES = {
  elements: false,
  rarity: false,
  gacha: true,
  summon: true,
  sigweapon: true,
  gear: true,
  runes: true,
  relics: true,
  emblems: true,
  pets: true,
  guardians: true,
  costumes: true,
  arena: true,
  guild: true,
  tower: true,
  season: true,
  events: true,
  intimacy: true,
  shop: true,
};

// 선택 모듈이 켜져 있는지. 코어(플래그 없는 키)는 항상 true.
export function isOn(key) {
  return FEATURES[key] !== false;
}

// 단순 코어 프리셋 — 최소 코어 외 선택 모듈을 전부 끈 값 묶음.
export function simplePreset() {
  const f = {};
  for (const k of Object.keys(FEATURES)) f[k] = false;
  return f;
}
