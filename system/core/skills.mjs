// ─────────────────────────────────────────────────────────────
// 스킬 시스템 — 장착(선택)으로 같은 유닛을 다른 빌드로 만든다.
// 스킬은 시스템 레벨의 "효과 ID"다. 표시 이름은 컨셉이 붙일 수 있다.
//
// 스킬이 줄 수 있는 것:
//   statPct  : 자기 스탯 % 증가 (atk/hp/def/spd)
//   effect   : 전투 효과 (치명타/흡혈/방어관통) → 판정 엔진이 읽음
//   teamBuff : 팀 전체 버프 (예: 공격력 %)
//   level    : 스킬 레벨(강화 가능) → 효과가 레벨에 비례
// ─────────────────────────────────────────────────────────────

export const SKILL_CATALOG = {
  BERSERK: {
    id: 'BERSERK', label: '광폭', desc: '공격력 대폭 상승',
    statPct: { atk: 0.30 },
  },
  FORTRESS: {
    id: 'FORTRESS', label: '요새', desc: '체력·방어 상승',
    statPct: { hp: 0.25, def: 0.20 },
  },
  PRECISION: {
    id: 'PRECISION', label: '정밀', desc: '치명타 확률/피해',
    effect: { critChance: 0.25, critDamage: 0.5 },
  },
  VAMPIRIC: {
    id: 'VAMPIRIC', label: '흡혈', desc: '가한 피해로 생존력 확보',
    effect: { lifesteal: 0.30 },
  },
  PIERCE: {
    id: 'PIERCE', label: '관통', desc: '적 방어 무시',
    effect: { defPierce: 0.40 },
  },
  RALLY: {
    id: 'RALLY', label: '지휘', desc: '팀 전체 공격력 상승',
    teamBuff: { atk: 0.20 },
  },
  SWIFT: {
    id: 'SWIFT', label: '신속', desc: '속도 상승(공격 빈도)',
    statPct: { spd: 0.40 },
  },
  RUIN: {
    id: 'RUIN', label: '파멸', desc: '방어 무시 + 치명 피해 (글래스캐논)',
    effect: { defPierce: 0.30, critDamage: 0.50 },
  },
  UNDYING: {
    id: 'UNDYING', label: '불굴', desc: '체력 + 흡혈 (브루저 생존)',
    statPct: { hp: 0.30 }, effect: { lifesteal: 0.25 },
  },
  ONSLAUGHT: {
    id: 'ONSLAUGHT', label: '맹공', desc: '공격 + 속도 (연속 압박)',
    statPct: { atk: 0.20, spd: 0.30 },
  },
  BULWARK: {
    id: 'BULWARK', label: '철벽', desc: '방어 + 체력 대폭 (순수 탱커)',
    statPct: { def: 0.30, hp: 0.35 },
  },
  PERFECT: {
    id: 'PERFECT', label: '완성', desc: '전 스탯 균형 상승',
    statPct: { atk: 0.12, hp: 0.12, def: 0.12, spd: 0.12 },
  },
  GUARDING: {
    id: 'GUARDING', label: '철옹', desc: '받는 피해 감소 (생존 특화)',
    effect: { dmgReduce: 0.18 },
  },

  // ── 전용(시그니처) 스킬 ─────────────────────────────────────
  // 캐릭터 고유 능력. 일반 슬롯에 장착하는 게 아니라 항상 발동하며,
  // 랭크가 오를수록 강해진다(정체성 = 성장). signature:true 로 표시.
  // awaken: 각성(sigAwaken 레벨) 당 추가되는 2차 효과.
  SIG_FLAME_EDGE: { id: 'SIG_FLAME_EDGE', label: '불꽃검', desc: '공격+치명 특화', signature: true, statPct: { atk: 0.15 }, effect: { critChance: 0.2, critDamage: 0.6 }, awaken: { effect: { defPierce: 0.1 } } },
  SIG_MOON_BLESSING: { id: 'SIG_MOON_BLESSING', label: '달의 축복', desc: '팀 공격+흡혈', signature: true, teamBuff: { atk: 0.25 }, effect: { lifesteal: 0.15 }, awaken: { teamBuff: { atk: 0.06 } } },
  SIG_FROST_GUARD: { id: 'SIG_FROST_GUARD', label: '서리방벽', desc: '체력·방어 특화', signature: true, statPct: { hp: 0.30, def: 0.25 }, awaken: { effect: { lifesteal: 0.06 } } },
  SIG_WIND_DANCE: { id: 'SIG_WIND_DANCE', label: '바람춤', desc: '속도·공격', signature: true, statPct: { spd: 0.5, atk: 0.1 }, awaken: { statPct: { atk: 0.06 } } },
  SIG_EARTH_AEGIS: { id: 'SIG_EARTH_AEGIS', label: '대지수호', desc: '체력·흡혈', signature: true, statPct: { hp: 0.2 }, effect: { lifesteal: 0.2 }, awaken: { statPct: { def: 0.08 } } },
  SIG_LIGHT_ORACLE: { id: 'SIG_LIGHT_ORACLE', label: '빛의 신탁', desc: '팀 공격+팀 치명', signature: true, teamBuff: { atk: 0.1, critChance: 0.12 }, effect: { critChance: 0.15 }, awaken: { teamBuff: { critChance: 0.04 } } },
  SIG_STORM_BLADE: { id: 'SIG_STORM_BLADE', label: '폭풍검', desc: '공격·관통', signature: true, statPct: { atk: 0.2 }, effect: { defPierce: 0.2 }, awaken: { effect: { critChance: 0.03 } } },
  SIG_NOVICE: { id: 'SIG_NOVICE', label: '견습 일격', desc: '기본 공격 강화', signature: true, statPct: { atk: 0.12 }, awaken: { statPct: { atk: 0.05 } } },

  // ── P1 신규 캐릭터 전용 스킬 ────────────────────────────────
  SIG_EMBER_WALL: { id: 'SIG_EMBER_WALL', label: '잉걸 방벽', desc: '체력·방어+흡혈(불굴 수호)', signature: true, statPct: { hp: 0.25, def: 0.20 }, effect: { lifesteal: 0.12 }, awaken: { statPct: { def: 0.08 } } },
  SIG_GLACIER_EDGE: { id: 'SIG_GLACIER_EDGE', label: '빙하검', desc: '공격+관통·치명피해(처형)', signature: true, statPct: { atk: 0.18 }, effect: { defPierce: 0.15, critDamage: 0.4 }, awaken: { effect: { critChance: 0.05 } } },
  SIG_TIDE_HYMN: { id: 'SIG_TIDE_HYMN', label: '조수 성가', desc: '팀 피해경감+강한 흡혈(수호 치유)', signature: true, teamBuff: { def: 0.15 }, effect: { lifesteal: 0.25 }, awaken: { teamBuff: { def: 0.05 } } },
  SIG_WAR_CHANT: { id: 'SIG_WAR_CHANT', label: '전열 함성', desc: '팀 공격+자신 속도(지휘)', signature: true, teamBuff: { atk: 0.20 }, statPct: { spd: 0.2 }, awaken: { teamBuff: { atk: 0.05 } } },

  // ── P3 신화(UR) 전용 스킬 — 최상위, 복합 강력 ────────────────
  SIG_DAWNBREAKER: { id: 'SIG_DAWNBREAKER', label: '여명검', desc: '공격+치명+관통+팀치명(초월 딜러)', signature: true, statPct: { atk: 0.25 }, effect: { critChance: 0.25, critDamage: 0.6, defPierce: 0.15 }, teamBuff: { critChance: 0.08 }, awaken: { effect: { critDamage: 0.2 } } },
  SIG_ABYSS_ORACLE: { id: 'SIG_ABYSS_ORACLE', label: '심연 계시', desc: '팀 공격+피해경감+치명(만능 지원)', signature: true, teamBuff: { atk: 0.18, def: 0.12, critChance: 0.1 }, effect: { lifesteal: 0.1 }, awaken: { teamBuff: { atk: 0.05, def: 0.03 } } },

  // ── 신규 원형(도적·궁수·법사) 전용 스킬 ───────────────────────
  SIG_ROGUE_NOVICE: { id: 'SIG_ROGUE_NOVICE', label: '재빠른 손놀림', desc: '속도 강화(도적 입문)', signature: true, statPct: { spd: 0.15 }, awaken: { effect: { critChance: 0.04 } } },
  SIG_NIGHT_FANG: { id: 'SIG_NIGHT_FANG', label: '야습의 송곳니', desc: '속도+공격+치명 특화(암습)', signature: true, statPct: { spd: 0.3, atk: 0.12 }, effect: { critChance: 0.25, critDamage: 0.5 }, awaken: { effect: { defPierce: 0.1 } } },
  SIG_FOREST_ARROW: { id: 'SIG_FOREST_ARROW', label: '숲의 화살', desc: '공격+치명(정밀 사격)', signature: true, statPct: { atk: 0.15 }, effect: { critChance: 0.15 }, awaken: { statPct: { spd: 0.05 } } },
  SIG_LIGHT_ARROW: { id: 'SIG_LIGHT_ARROW', label: '광명의 화살', desc: '공격+치명+관통+팀치명(저격)', signature: true, statPct: { atk: 0.18 }, effect: { critChance: 0.2, defPierce: 0.15 }, teamBuff: { critChance: 0.06 }, awaken: { effect: { critDamage: 0.15 } } },
  SIG_INFERNO_BOLT: { id: 'SIG_INFERNO_BOLT', label: '화염 마탄', desc: '공격+치명피해(마법 폭발)', signature: true, statPct: { atk: 0.18 }, effect: { critDamage: 0.3 }, awaken: { effect: { critChance: 0.05 } } },
  SIG_CHAOS_NOVA: { id: 'SIG_CHAOS_NOVA', label: '혼돈의 신성', desc: '공격+치명+관통+팀공격(초월 캐스터)', signature: true, statPct: { atk: 0.28 }, effect: { critChance: 0.22, critDamage: 0.55, defPierce: 0.12 }, teamBuff: { atk: 0.1 }, awaken: { effect: { critDamage: 0.2 } } },

  // ── 원형별 등급 공백 보강(N/R/SR/SSR/UR 전 등급 커버) ─────────
  SIG_VANGUARD_NOVICE: { id: 'SIG_VANGUARD_NOVICE', label: '풋내기 방벽', desc: '체력 강화(수호 입문)', signature: true, statPct: { hp: 0.15 }, awaken: { statPct: { def: 0.05 } } },
  SIG_FLAME_BASTION: { id: 'SIG_FLAME_BASTION', label: '화염 요새', desc: '체력·방어+피해감소(불굴 수호)', signature: true, statPct: { hp: 0.22, def: 0.18 }, effect: { dmgReduce: 0.15 }, awaken: { effect: { lifesteal: 0.06 } } },
  SIG_GLACIAL_TITAN: { id: 'SIG_GLACIAL_TITAN', label: '빙하 거인', desc: '체력·방어+피해감소+팀방어(초월 수호)', signature: true, statPct: { hp: 0.3, def: 0.25 }, effect: { dmgReduce: 0.2, lifesteal: 0.1 }, teamBuff: { def: 0.1 }, awaken: { effect: { dmgReduce: 0.08 } } },
  SIG_SUPPORT_NOVICE: { id: 'SIG_SUPPORT_NOVICE', label: '견습 축복', desc: '팀 공격 소폭(지원 입문)', signature: true, teamBuff: { atk: 0.08 }, awaken: { teamBuff: { atk: 0.03 } } },
  SIG_ALLEY_BLADE: { id: 'SIG_ALLEY_BLADE', label: '뒷골목 칼솜씨', desc: '속도+치명(거리의 칼잡이)', signature: true, statPct: { spd: 0.2 }, effect: { critChance: 0.15 }, awaken: { effect: { critDamage: 0.1 } } },
  SIG_MIST_STRIKE: { id: 'SIG_MIST_STRIKE', label: '안개 일격', desc: '속도+공격+회피(안개 속 기습)', signature: true, statPct: { spd: 0.35, atk: 0.1 }, effect: { evasion: 0.15 }, awaken: { effect: { critChance: 0.05 } } },
  SIG_ABYSS_SHADOW: { id: 'SIG_ABYSS_SHADOW', label: '심연의 그림자', desc: '속도+공격+치명+회피+팀공격(초월 암살)', signature: true, statPct: { spd: 0.4, atk: 0.15 }, effect: { critChance: 0.28, critDamage: 0.5, evasion: 0.15 }, teamBuff: { atk: 0.08 }, awaken: { effect: { defPierce: 0.1 } } },
  SIG_ARCHER_NOVICE: { id: 'SIG_ARCHER_NOVICE', label: '견습 사냥술', desc: '공격 강화(궁수 입문)', signature: true, statPct: { atk: 0.12 }, awaken: { effect: { critChance: 0.03 } } },
  SIG_MOONLIGHT_SHOT: { id: 'SIG_MOONLIGHT_SHOT', label: '달빛 사격', desc: '공격+치명+명중(정조준)', signature: true, statPct: { atk: 0.16 }, effect: { critChance: 0.18, accuracy: 0.1 }, awaken: { effect: { critDamage: 0.1 } } },
  SIG_CELESTIAL_ARROW: { id: 'SIG_CELESTIAL_ARROW', label: '천공의 화살', desc: '공격+치명+관통+명중+팀치명(초월 저격)', signature: true, statPct: { atk: 0.22 }, effect: { critChance: 0.25, defPierce: 0.18, accuracy: 0.15 }, teamBuff: { critChance: 0.08 }, awaken: { effect: { critDamage: 0.18 } } },
  SIG_MAGE_NOVICE: { id: 'SIG_MAGE_NOVICE', label: '견습 마법', desc: '공격 강화(법사 입문)', signature: true, statPct: { atk: 0.14 }, awaken: { effect: { critDamage: 0.05 } } },
  SIG_FROST_NOVA: { id: 'SIG_FROST_NOVA', label: '서리 폭발', desc: '공격+치명피해+절대공격(빙결 마법)', signature: true, statPct: { atk: 0.17 }, effect: { critDamage: 0.35, trueDamage: 0.08 }, awaken: { effect: { critChance: 0.05 } } },
  SIG_VOID_SURGE: { id: 'SIG_VOID_SURGE', label: '공허의 쇄도', desc: '공격+치명+절대공격(금단 마법)', signature: true, statPct: { atk: 0.2 }, effect: { critChance: 0.22, critDamage: 0.5, trueDamage: 0.1 }, awaken: { effect: { defPierce: 0.1 } } },
};

// 시그니처 각성 상한 + 비용 (같은 캐릭터 조각=소환 재화 + 프리미엄).
export const AWAKEN_MAX = 3;
export function awakenCost(level) {
  return { summon: 30 * (level + 1), gem: 10 * (level + 1) };
}

export function getSkill(id) {
  const s = SKILL_CATALOG[id];
  if (!s) throw new Error(`알 수 없는 스킬: ${id}`);
  return s;
}

// 일반 슬롯에 장착 가능한 스킬(시그니처 제외).
export function equippableSkills() {
  return Object.values(SKILL_CATALOG).filter((s) => !s.signature);
}

// 스킬 슬롯 수 = 랭크에 비례 (랭크가 곧 빌드 자유도). 최대 3.
export function skillSlots(unit) {
  return Math.min(3, unit.rank + 1);
}

// 스킬 레벨당 효과 배수. Lv1=1.0, Lv2=1.15 ...
export function skillPower(skillLevel) {
  return 1 + (skillLevel - 1) * 0.15;
}

// 스킬 레벨업(강화) 비용 — 소환 재화와 성장 재화 소모.
export function skillUpCost(skillLevel) {
  return { growth: Math.round(30 * Math.pow(1.3, skillLevel - 1)) };
}
