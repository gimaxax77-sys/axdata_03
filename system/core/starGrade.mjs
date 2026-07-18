import { spend } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 성급(Star Grade) — 동일 영웅 "중복"을 합쳐 별을 올려 능력치를 끌어올린다.
//   · 방치·수집형 표준(세나키우기식 "합성/성급"): 뽑을수록 쌓이는 중복이
//     사장되지 않고 성장 축으로 환원된다.
//   · 성급은 모든 스탯에 곱연산 배수(+12%/성급). 레벨/랭크와 독립 축.
//   · 상승 비용 = 같은 캐릭터 중복 인스턴스 N개(+골드). 파티/대상은 보호.
//   · 소모되는 중복의 장비·룬은 인벤토리로 회수(손실 없음).
//
// 저장 필드: unit.star (1~STAR_MAX). 누락 시 1로 간주(하위호환).
// ─────────────────────────────────────────────────────────────

// 성급 10단계: 1~5성(일반 별)·6~10성(태양 별). 배지는 5조각 단위로 채워지며
// 6성부터 별 모양이 태양으로 바뀐다(components.js StarBadge 참조).
export const STAR_MAX = 10;
const STAR_STAT_PER = 0.12; // 성급당 +12% (곱연산). 10성 = ×2.08

// S성 → (S+1)성 골드 비용(고정 표). 중복이 실질 관문, 골드는 보조 소모.
const STAR_GOLD = {
  1: 20000, 2: 60000, 3: 150000, 4: 400000, 5: 1000000,
  6: 2500000, 7: 6000000, 8: 15000000, 9: 35000000,
};

export function starOf(unit) { return unit.star || 1; }

// 성급 스탯 배수 — stats.baseGrownStats가 곱한다.
export function starMult(unit) { return 1 + (starOf(unit) - 1) * STAR_STAT_PER; }

// 별 표시 문자열(★ 채움 / ☆ 빈칸).
export function starLabel(unit) {
  const s = starOf(unit);
  return '★'.repeat(s) + '☆'.repeat(STAR_MAX - s);
}

// S성에서 다음 성급으로 올리는 요구치.
export function starUpReq(star) {
  return { dupes: star, currency: STAR_GOLD[star] || 0 };
}

// 소비 가능한 중복 인스턴스 — 같은 캐릭터, 대상/파티 제외, 약한 순(투자 적은 것부터).
//   proxy 정렬(rank·level)로 stats 순환 의존을 피한다.
export function availableDupes(state, unit) {
  if (!unit || !unit.characterId) return [];
  return (state.units || [])
    .filter((u) => u.uid !== unit.uid && u.characterId === unit.characterId && !state.party.includes(u.uid))
    .sort((a, b) => ((a.rank || 1) * 1000 + (a.level || 1)) - ((b.rank || 1) * 1000 + (b.level || 1)));
}

// 성급 강화 가능 여부 요약(UI/판정 공용).
export function starUpInfo(state, unit) {
  const star = starOf(unit);
  const maxed = star >= STAR_MAX;
  const identified = !!unit.characterId;
  const req = maxed ? null : starUpReq(star);
  const dupes = availableDupes(state, unit);
  const haveDupes = dupes.length;
  const enoughDupes = !maxed && haveDupes >= (req?.dupes || 0);
  const enoughGold = !maxed && (state.wallet.currency || 0) >= (req?.currency || 0);
  return {
    star, maxed, identified, req,
    haveDupes, enoughDupes, enoughGold,
    canUp: !maxed && identified && enoughDupes && enoughGold,
  };
}

// 성급 강화 실행 — 중복 소모(장비·룬 회수) + 골드 소모, 별 +1.
export function starUp(state, uid) {
  const unit = (state.units || []).find((u) => u.uid === uid);
  if (!unit) return { ok: false, reason: '유닛 없음' };
  const star = starOf(unit);
  if (star >= STAR_MAX) return { ok: false, reason: `최고 성급 ${STAR_MAX}★` };
  if (!unit.characterId) return { ok: false, reason: '정체성 없는 유닛은 성급 강화 불가' };
  const req = starUpReq(star);
  const dupes = availableDupes(state, unit);
  if (dupes.length < req.dupes) {
    return { ok: false, reason: `중복 영웅 ${req.dupes}명 필요 (보유 ${dupes.length})`, req };
  }
  if ((state.wallet.currency || 0) < req.currency) {
    return { ok: false, reason: '골드 부족', req };
  }
  spend(state.wallet, { currency: req.currency });
  const consume = dupes.slice(0, req.dupes);
  const cset = new Set(consume.map((u) => u.uid));
  // 소모 유닛의 장비·룬 회수(손실 방지).
  state.inventory = state.inventory || [];
  state.runeBag = state.runeBag || [];
  for (const u of consume) {
    for (const slot of Object.keys(u.gear || {})) { const it = u.gear[slot]; if (it) state.inventory.push(it); }
    for (const r of (u.runes || [])) { if (r) state.runeBag.push(r); }
    if (state.profile && state.profile.avatarUid === u.uid) state.profile.avatarUid = null;
  }
  state.units = state.units.filter((u) => !cset.has(u.uid));
  unit.star = star + 1;
  return { ok: true, star: unit.star, consumed: consume.length, req };
}
