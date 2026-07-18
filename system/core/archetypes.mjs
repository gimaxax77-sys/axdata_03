// ─────────────────────────────────────────────────────────────
// 유닛 원형(Archetype) — 시스템 레벨의 "역할" 정의.
// 컨셉(판타지/SF)과 무관하게 시스템은 오직 이 역할 ID만 안다.
// 컨셉 레이어가 나중에 ID를 표시 이름으로 바꿔준다.
//   VANGUARD(방어형) · STRIKER(공격형) · SUPPORT(지원형)
//   ROGUE(도적형) · ARCHER(궁수형) · MAGE(법사형) — 세부 딜러 분화
// ─────────────────────────────────────────────────────────────

export const ARCHETYPES = {
  VANGUARD: {
    id: 'VANGUARD',
    role: '방어',
    roleLabel: '방어형',
    trait: '높은 체력·방어로 전열을 지키는 수호자',
    base: { hp: 1200, atk: 60, def: 80, spd: 90 },
    // 지원형이 아니므로 팀 버프 없음
    teamBuff: null,
  },
  STRIKER: {
    id: 'STRIKER',
    role: '공격',
    roleLabel: '공격형',
    trait: '높은 공격력·속도로 적을 제압하는 딜러',
    base: { hp: 600, atk: 150, def: 30, spd: 130 },
    teamBuff: null,
  },
  SUPPORT: {
    id: 'SUPPORT',
    role: '지원',
    roleLabel: '지원형',
    trait: '팀 전체 공격력을 끌어올리는 지원가',
    base: { hp: 700, atk: 50, def: 40, spd: 110 },
    // 팀 전체 공격력 +15% (지원형의 시스템적 정체성)
    teamBuff: { stat: 'atk', mult: 0.15 },
  },
  ROGUE: {
    id: 'ROGUE',
    role: '공격',
    roleLabel: '도적형',
    trait: '빠른 속도로 급습해 빈틈을 파고드는 근접 딜러',
    // STRIKER보다 더 빠르고 더 약함(글래스캐논) — 근접 딜러 축의 변주.
    base: { hp: 550, atk: 145, def: 25, spd: 150 },
    teamBuff: null,
  },
  ARCHER: {
    id: 'ARCHER',
    role: '공격',
    roleLabel: '궁수형',
    trait: '원거리에서 정밀 사격하는 딜러',
    // STRIKER보다 체력·방어는 조금 낫지만 공격은 낮은 균형형 원거리 딜러.
    base: { hp: 620, atk: 125, def: 35, spd: 125 },
    teamBuff: null,
  },
  MAGE: {
    id: 'MAGE',
    role: '공격',
    roleLabel: '법사형',
    trait: '강력한 주문으로 폭발적 피해를 주는 캐스터',
    // 전 원형 중 공격 최고·생존 최저인 극단적 글래스캐논.
    base: { hp: 500, atk: 165, def: 20, spd: 95 },
    teamBuff: null,
  },
};

export function getArchetype(id) {
  const a = ARCHETYPES[id];
  if (!a) throw new Error(`알 수 없는 원형: ${id}`);
  return a;
}
