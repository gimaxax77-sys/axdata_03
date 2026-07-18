// UI 아이콘 레지스트리 — 상단 자원바 등에서 이모지 대신 KayKit 3D 렌더 아이콘 사용.
//   규격: 128×128 투명 PNG. 위치: assets/ui/<key>.png
//   미등록 키는 null → 호출부가 이모지로 폴백.

const RES_ICONS = {
  currency: require('../assets/ui/currency.png'),
  growth: require('../assets/ui/growth.png'),
  summon: require('../assets/ui/summon.png'),
  gem: require('../assets/ui/gem.png'),
};

// 자원 키 → 아이콘 소스 또는 null(이모지 폴백).
export function resIcon(key) {
  return (key && RES_ICONS[key]) || null;
}

// 장비(무기·방패) 3D 아이콘 — 블루프린트별. 모델 없는 방어구·장신구는 미등록 → 이모지 폴백.
const GEAR_IMG = {
  sword: require('../assets/ui/gear/sword.png'),
  dagger: require('../assets/ui/gear/dagger.png'),
  bow: require('../assets/ui/gear/bow.png'),
  axe: require('../assets/ui/gear/axe.png'),
  greatsword: require('../assets/ui/gear/greatsword.png'),
  shield: require('../assets/ui/gear/shield.png'),
  tome: require('../assets/ui/gear/tome.png'),
};
// 장비 블루프린트 → 아이콘 종류.
const BLUEPRINT_ICON = {
  IRON_SWORD: 'sword', RUNE_BLADE: 'sword', VOID_EDGE: 'sword', DRAGON_FANG: 'sword', RAGE_BLADE: 'sword',
  DAGGER: 'dagger', BOW: 'bow', AXE: 'axe', GREATSWORD: 'greatsword',
  TOWER_SHIELD: 'shield', GUARDIAN_WALL: 'shield', BASTION_WALL: 'shield', ARCANE_TOME: 'tome',
};
// 장비 블루프린트 → 아이콘 소스 또는 null(이모지 폴백).
export function gearIcon(blueprint) {
  const kind = blueprint && BLUEPRINT_ICON[blueprint];
  return (kind && GEAR_IMG[kind]) || null;
}

// 난이도 마커 3D(보석 색상별). 🟢🟡🔴🟣 대체.
const DIFF_IMG = {
  normal: require('../assets/ui/diff/normal.png'),
  hard: require('../assets/ui/diff/hard.png'),
  hell: require('../assets/ui/diff/hell.png'),
  abyss: require('../assets/ui/diff/abyss.png'),
};
export function diffIcon(id) {
  return (id && DIFF_IMG[id]) || null;
}
