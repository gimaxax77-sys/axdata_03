// ─────────────────────────────────────────────────────────────
// 캐릭터 아트 레지스트리 — 진짜 일러스트를 붙이는 단일 지점.
//
// 규격: 512×512 투명 PNG(얼굴~상반신 중앙). 파일 위치:
//   assets/char/<conceptId>/<characterId>.png   (예: assets/char/fantasy/kael.png)
//
// Metro는 "정적" require만 번들한다(동적 경로 불가). 그래서 이미지를 넣은 뒤
// 아래 맵에 한 줄만 추가하면 로스터·파티·소환·도감 전역에 자동 반영된다.
// 등록 안 된 캐릭터는 이모지로 자연스럽게 폴백 → 점진 도입 가능.
//
//       'scifi:kael':   require('../assets/char/scifi/kael.png'),
// ─────────────────────────────────────────────────────────────

// 초상 등록 — scripts/gen-portraits.mjs로 생성한 플레이스홀더(속성색+등급링+이모지).
// 실제 일러스트가 오면 같은 경로(assets/char/<concept>/<id>.png)로 덮어쓰면 자동 반영.
export const CHAR_IMAGES = {
  // fantasy
  'fantasy:knight': require('../assets/char/fantasy/knight.png'),
  'fantasy:paladin': require('../assets/char/fantasy/paladin.png'),
  'fantasy:paladin_with_helmet': require('../assets/char/fantasy/paladin_with_helmet.png'),
  'fantasy:skeleton_golem': require('../assets/char/fantasy/skeleton_golem.png'),
  'fantasy:barbarian': require('../assets/char/fantasy/barbarian.png'),
  'fantasy:barbarian_large': require('../assets/char/fantasy/barbarian_large.png'),
  'fantasy:werewolf_man': require('../assets/char/fantasy/werewolf_man.png'),
  'fantasy:werewolf_wolf': require('../assets/char/fantasy/werewolf_wolf.png'),
  'fantasy:skeleton_warrior': require('../assets/char/fantasy/skeleton_warrior.png'),
  'fantasy:skeleton_minion': require('../assets/char/fantasy/skeleton_minion.png'),
  'fantasy:druid': require('../assets/char/fantasy/druid.png'),
  'fantasy:animatronic_normal': require('../assets/char/fantasy/animatronic_normal.png'),
  'fantasy:rogue': require('../assets/char/fantasy/rogue.png'),
  'fantasy:rogue_hooded': require('../assets/char/fantasy/rogue_hooded.png'),
  'fantasy:skeleton_rogue': require('../assets/char/fantasy/skeleton_rogue.png'),
  'fantasy:animatronic_creepy': require('../assets/char/fantasy/animatronic_creepy.png'),
  'fantasy:ranger': require('../assets/char/fantasy/ranger.png'),
  'fantasy:engineer': require('../assets/char/fantasy/engineer.png'),
  'fantasy:mage': require('../assets/char/fantasy/mage.png'),
  'fantasy:necromancer': require('../assets/char/fantasy/necromancer.png'),
  'fantasy:skeleton_mage': require('../assets/char/fantasy/skeleton_mage.png'),
  // scifi
  'scifi:kael': require('../assets/char/scifi/kael.png'),
  'scifi:luna': require('../assets/char/scifi/luna.png'),
  'scifi:gwen': require('../assets/char/scifi/gwen.png'),
  'scifi:ciel': require('../assets/char/scifi/ciel.png'),
  'scifi:bran': require('../assets/char/scifi/bran.png'),
  'scifi:ael': require('../assets/char/scifi/ael.png'),
  'scifi:ara': require('../assets/char/scifi/ara.png'),
  'scifi:mir': require('../assets/char/scifi/mir.png'),
  'scifi:pyra': require('../assets/char/scifi/pyra.png'),
  'scifi:frost': require('../assets/char/scifi/frost.png'),
  'scifi:marina': require('../assets/char/scifi/marina.png'),
  'scifi:signe': require('../assets/char/scifi/signe.png'),
  'scifi:aurel': require('../assets/char/scifi/aurel.png'),
  'scifi:nyx': require('../assets/char/scifi/nyx.png'),
};

// conceptId + characterId → 이미지 소스(require 결과) 또는 null(폴백).
export function charImage(conceptId, characterId) {
  if (!conceptId || !characterId) return null;
  return CHAR_IMAGES[`${conceptId}:${characterId}`] || null;
}
