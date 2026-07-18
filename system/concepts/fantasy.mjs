// ─────────────────────────────────────────────────────────────
// 컨셉 스킨: 판타지
// 시스템의 추상 ID를 "표시 이름/테마"로만 매핑한다.
// 숫자/규칙은 하나도 건드리지 않는다.
// ─────────────────────────────────────────────────────────────

export const fantasyConcept = {
  id: 'fantasy',
  title: '엘드리아 연대기',
  palette: { primary: '#6b4fbb', accent: '#f5c542' },

  // 원형 ID → 컨셉상의 이름/이모지
  archetypes: {
    VANGUARD: { name: '수호기사', emoji: '🛡️' },
    STRIKER: { name: '검투사', emoji: '⚔️' },
    SUPPORT: { name: '성녀', emoji: '✨' },
    ROGUE: { name: '도적', emoji: '🗡️' },
    ARCHER: { name: '궁수', emoji: '🏹' },
    MAGE: { name: '법사', emoji: '🔮' },
  },

  // 자원 키 → 표시명
  resources: {
    currency: { name: '골드', emoji: '🪙' },
    growth: { name: '정수', emoji: '💠' },
    summon: { name: '소환석', emoji: '🔮' },
    gem: { name: '다이아', emoji: '💎' },
  },

  terms: { unit: '영웅', party: '원정대', stage: '층', energy: '기력' },

  // 속성 ID(Core) → 표시명/이모지
  elements: {
    FIRE: { name: '불', emoji: '🔥' },
    WATER: { name: '물', emoji: '💧' },
    WOOD: { name: '숲', emoji: '🌿' },
    LIGHT: { name: '빛', emoji: '✨' },
    DARK: { name: '어둠', emoji: '🌑' },
  },

  // 캐릭터 도감 — 정체성. Core는 여기 mechanical 필드(archetype/signature/rarity/element)만
  // 읽고 이름/성격 등 flavor는 표시에만 쓴다. 소환은 이 pool에서 개별 캐릭터를 뽑는다.
  roster: [
    { id: 'knight', name: '기사', emoji: '🛡️', archetype: 'VANGUARD' },
    { id: 'paladin', name: '팔라딘', emoji: '⚔️', archetype: 'VANGUARD' },
    { id: 'paladin_with_helmet', name: '황금기사', emoji: '🛡️', archetype: 'VANGUARD' },
    { id: 'skeleton_golem', name: '해골 골렘', emoji: '💀', archetype: 'VANGUARD' },
    { id: 'barbarian', name: '바바리안', emoji: '🪓', archetype: 'STRIKER' },
    { id: 'barbarian_large', name: '대전사', emoji: '🪓', archetype: 'STRIKER' },
    { id: 'werewolf_man', name: '늑대인간', emoji: '🐺', archetype: 'STRIKER' },
    { id: 'werewolf_wolf', name: '광랑', emoji: '🐺', archetype: 'STRIKER' },
    { id: 'skeleton_warrior', name: '해골 전사', emoji: '💀', archetype: 'STRIKER' },
    { id: 'skeleton_minion', name: '해골 졸개', emoji: '💀', archetype: 'STRIKER' },
    { id: 'druid', name: '드루이드', emoji: '🍃', archetype: 'SUPPORT' },
    { id: 'animatronic_normal', name: '곰인형', emoji: '🧸', archetype: 'SUPPORT' },
    { id: 'rogue', name: '도적', emoji: '🗡️', archetype: 'ROGUE' },
    { id: 'rogue_hooded', name: '암살자', emoji: '🗡️', archetype: 'ROGUE' },
    { id: 'skeleton_rogue', name: '해골 도적', emoji: '💀', archetype: 'ROGUE' },
    { id: 'animatronic_creepy', name: '괴이곰', emoji: '🧸', archetype: 'ROGUE' },
    { id: 'ranger', name: '궁수', emoji: '🏹', archetype: 'ARCHER' },
    { id: 'engineer', name: '기공사', emoji: '🔧', archetype: 'ARCHER' },
    { id: 'mage', name: '흑마법사', emoji: '🔮', archetype: 'MAGE' },
    { id: 'necromancer', name: '강령술사', emoji: '☠️', archetype: 'MAGE' },
    { id: 'skeleton_mage', name: '해골 법사', emoji: '💀', archetype: 'MAGE' },
  ],

  // 코스튬 — 캐릭터별 외형+소량 보너스. 친밀도 Lv로 해금.
  // (캐릭터 id로 키잉. 보너스는 장착 시 Core 모디파이어로 흘러간다.)
  costumes: {},

  // 스토리 캠페인 — 월드 서사(챕터별 보스 앞의 이야기). Core가 진행/전투를 담당.
  campaign: [
    { title: '균열의 조짐', story: '엘드리아의 하늘에 균열이 번진다. 첫 마수가 성문을 두드리고, 견습들이 검을 든다.' },
    { title: '잿빛 숲', story: '숲이 시들어간다. 나무마다 어둠이 스며 마수를 낳는다. 그 근원을 찾아 깊이 들어선다.' },
    { title: '서리 관문', story: '얼어붙은 관문의 수호자가 길을 막는다. 오래된 맹세를 지키는 냉혹한 거인이다.' },
    { title: '폭풍의 첨탑', story: '번개가 첨탑을 휘감는다. 폭풍을 다스리는 옛 마법사가 침입자를 시험한다.' },
    { title: '빛과 그림자', story: '신전의 빛이 흔들린다. 배신한 사제가 그림자와 계약해 성역을 더럽혔다.' },
    { title: '심연의 문', story: '대지 아래 잠든 문이 열린다. 균열의 진원, 심연에서 무언가가 올라온다.' },
    { title: '왕좌의 그림자', story: '무너진 왕성의 옥좌에 그림자 군주가 앉아 있다. 세계를 삼키려는 자와의 대치.' },
    { title: '연대기의 끝', story: '균열의 핵심에서 종말이 형상을 갖춘다. 모든 유대와 성장을 걸고 마지막 일격을.' },
    // ── 2부: 심연의 잔재 ──
    { title: '잔재의 부활', story: '끝낸 줄 알았던 균열의 잔재가 되살아난다. 세계의 상처는 아직 아물지 않았다.' },
    { title: '타락한 영웅', story: '어둠에 물든 옛 동료가 앞을 막는다. 검을 겨누는 손이 무겁다.' },
    { title: '공허의 여왕', story: '균열 너머 공허에서 온 지배자가 강림한다. 존재 자체가 세계를 갉아먹는다.' },
    { title: '새벽의 맹세', story: '심연의 근원과 마주선다. 모든 것을 건 마지막 맹세 — 엘드리아에 새벽이 온다.' },
  ],
};
