import { spend } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 전용무기 — 캐릭터(고유 스킬 보유자)만의 무기. 일반 장비와 "별도 슬롯"이라
// 무기/방어구/장신구와 경쟁하지 않는다(순수 추가 성장).
//   · 스탯 프로필은 원형(archetype)을 따른다 → 캐릭터 성격에 맞게.
//   · 레벨(강화)로 성장하고, 5레벨마다 시그니처 스킬을 증폭한다.
//     "정체성(시그니처)이 곧 성장한다"는 IP 원칙의 심화.
//   · Concept가 이름/외형을, Core가 수치를 담당.
// ─────────────────────────────────────────────────────────────

// 원형별 무기 스탯 프로필 (Lv.1 기준). 강화 시 flat이 비례 성장.
const PROFILE = {
  STRIKER: { flat: { atk: 200 }, effect: { critDamage: 0.4 } },
  VANGUARD: { flat: { hp: 1200, def: 100 }, effect: {} },
  SUPPORT: { flat: { atk: 120, spd: 40 }, effect: {} },
  ROGUE: { flat: { atk: 180, spd: 30 }, effect: { critChance: 0.12 } },
  ARCHER: { flat: { atk: 170, spd: 20 }, effect: { critDamage: 0.2 } },
  MAGE: { flat: { atk: 230 }, effect: { critDamage: 0.3 } },
};

const WEAPON_ENH_PER = 0.15; // 강화 레벨당 flat +15%
export const SIGWEAPON_MAX = 15;
const SIG_BOOST_PER_TIER = 0.1; // 5레벨마다 시그니처 강도 +10%

export function hasSigWeapon(unit) {
  return !!(unit.sigWeapon && unit.sigWeapon.level > 0);
}

// 전용무기를 가질 수 있는가 (고유 스킬 보유 = 정체성 있는 캐릭터).
export function canOwnSigWeapon(unit) {
  return !!unit.signature;
}

export function sigWeaponUnlockCost() { return { gem: 40 }; }
export function sigWeaponEnhanceCost(level) {
  return { currency: Math.round(300 * Math.pow(1.28, level)) };
}

function findUnit(state, uid) {
  const u = state.units.find((x) => x.uid === uid);
  if (!u) throw new Error(`유닛 없음: ${uid}`);
  return u;
}

// 전용무기 획득(1회). 프리미엄 재화 소모.
export function unlockSigWeapon(state, uid) {
  const u = findUnit(state, uid);
  if (!canOwnSigWeapon(u)) return { ok: false, reason: '전용무기 없음 (고유 스킬 미보유)' };
  if (hasSigWeapon(u)) return { ok: false, reason: '이미 획득' };
  if (!spend(state.wallet, sigWeaponUnlockCost())) return { ok: false, reason: '재화 부족', cost: sigWeaponUnlockCost() };
  u.sigWeapon = { level: 1 };
  return { ok: true, level: 1 };
}

// 전용무기 강화.
export function enhanceSigWeapon(state, uid) {
  const u = findUnit(state, uid);
  if (!hasSigWeapon(u)) return { ok: false, reason: '미획득' };
  if (u.sigWeapon.level >= SIGWEAPON_MAX) return { ok: false, reason: `강화 상한 ${SIGWEAPON_MAX}` };
  const cost = sigWeaponEnhanceCost(u.sigWeapon.level);
  if (!spend(state.wallet, cost)) return { ok: false, reason: '강화 재화 부족', cost };
  u.sigWeapon.level += 1;
  return { ok: true, level: u.sigWeapon.level, cost };
}

// 시그니처 증폭 계수 (모디파이어에서 시그니처 scale에 곱함).
export function sigWeaponBoost(unit) {
  if (!hasSigWeapon(unit)) return 0;
  return Math.floor(unit.sigWeapon.level / 5) * SIG_BOOST_PER_TIER;
}

// 모디파이어 기여 (flat 스탯 + 전투 효과). 강화 레벨 반영.
export function sigWeaponContribution(unit) {
  if (!hasSigWeapon(unit)) return null;
  const p = PROFILE[unit.archetype] || PROFILE.STRIKER;
  const scale = 1 + WEAPON_ENH_PER * (unit.sigWeapon.level - 1);
  const flat = {};
  for (const [k, v] of Object.entries(p.flat)) flat[k] = v * scale;
  return { flat, effect: { ...p.effect } };
}
