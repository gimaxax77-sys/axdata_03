import { createWallet } from './economy.mjs';
import { computePower } from './stats.mjs';
import { teamSynergy } from './synergy.mjs';

// ─────────────────────────────────────────────────────────────
// 게임 상태(세이브) — IP의 지속 자산.
// 장르도 컨셉도 여기 없다. 순수하게 "무엇을 가졌고 어디까지 왔나".
// 같은 상태 객체를 RPG 어댑터에도, 방치형 어댑터에도 그대로 넣을 수 있다.
// ─────────────────────────────────────────────────────────────

// 파티 최대 편성 인원(장르 무관 기본 정책). 전투는 파티 전원 합산.
// 진형 정원(전열2·중열3·후열2)과 일치 — formation.ROLE_CAP 참고.
export const MAX_PARTY = 7;

export function createGameState({ units = [], party = [] } = {}) {
  return {
    units, // 보유 유닛 인스턴스 배열
    party, // 편성된 유닛 uid 배열 (최대 정책은 장르가 정함)
    formation: {}, // 진형: uid → 'mid'|'back' (미기재=전열). 후열/중열 1명↑일 때만 발동
    formationPresets: {}, // 편성 프리셋(1~5): slot → { party, formation, savedAt }

    inventory: [], // 미장착 장비 인스턴스 배열
    runeBag: [], // 미장착 룬 인스턴스 배열
    wallet: createWallet(),
    stage: 1, // 현재 도전/진행 스테이지 (환생 시 리셋)
    difficulty: 'normal', // 방치 난이도 (일반/험난/지옥/나락)
    maxStage: 1, // 이번 회차 최고 도달 (환생 시 리셋)
    peakStage: 1, // 역대 최고 도달 (환생해도 유지 — 실제 진행도)
    energy: 60, // RPG 장르가 사용하는 행동력 (방치형은 무시)
    prestige: 0, // 방치형 장르가 사용하는 환생 횟수 (RPG는 무시)
    lastTick: null, // 방치형 오프라인 계산 기준 시각(ms)
    gacha: { pity: 0 }, // 소환 천장 카운터
    // 일일 콘텐츠(출석·미션·던전) 상태
    daily: { epochDay: 0, streak: 0, claimedDay: -1, missions: { summon: 0, upgrade: 0, dungeon: 0 }, claimed: {}, dungeon: { GOLD: 0, ESSENCE: 0 }, ads: {} },
    relics: {}, // 유물 id → 레벨
    emblems: {}, // 엠블럼(문장) id → 레벨 (계정 공유 버프)
    guardians: { owned: {}, active: [] }, // 정령/가디언 보유(id→레벨) + 장착(최대 3)
    pets: { owned: {}, active: [] }, // 펫 보유(id→레벨) + 장착(최대 3)
    shop: { purchased: {} }, // 1회성 패키지 구매 기록
    rentals: {}, // 기간제 대여 { slotId: { tier, expiresAt } }
    admin: { overrides: {} }, // 운영자 밸런스 오버라이드 { path: value }
    materials: { elemEssence: 0, petShard: { R: 0, SR: 0, SSR: 0, UR: 0 } }, // 던전 재료
    arena: { points: 0, day: -1, entries: 0 }, // 아레나(경쟁) 랭크·일일 입장
    ladders: {}, // 3중 리그(주간/격주/월간) 포인트·주기
    mail: [], // 우편함(순위 정산·이벤트 보상)
    guild: { coins: 0, day: -1, attacks: 0, tier: 1, bossHp: null }, // 길드 보스 레이드
    meta: { achv: {}, coll: {}, season: { claimed: {}, premium: false } }, // 도감·업적·시즌패스 청구 기록
    campaign: { cleared: 0 }, // 스토리 캠페인 클리어 챕터 수
    run: null, // 원정(로그라이트) 진행 중 스냅샷 — 없으면 null. run.mjs 참조
    tutorial: { introSeen: false }, // 온보딩: 첫 소개 확인 여부
    settings: { muted: false, haptics: true, reduceMotion: false, lang: 'ko' }, // 사운드·햅틱·전투연출·언어
    tower: { floor: 1, best: 1 }, // 무한의 탑 현재/최고 층
    // 개성(코스메틱) — 능력치 무관. 닉네임·대표영웅·프레임·칭호 + 광고제거 패스
    profile: { name: '조련사', avatarUid: null, frame: 'none', title: 'none', premium: false, owned: { frame: {}, title: {} } },
    // 소환 숙련도 — 배너별 누적 소환 횟수·청구 레벨 (최대 15)
    summonMastery: { hero: { count: 0, claimed: 0 }, pet: { count: 0, claimed: 0 }, gear: { count: 0, claimed: 0 }, rune: { count: 0, claimed: 0 }, cosmetic: { count: 0, claimed: 0 } },
    costumes: { owned: {} }, // 캐릭터 코스튬(스킨) 보유 — 능력치 무관 순수 외형
    vip: { spend: 0 },       // 누적 결제액(원) — 과금 등급(VIP) 코스튬 해금용
  };
}

// party uid → 유닛 인스턴스 배열
export function getPartyUnits(state) {
  const byId = new Map(state.units.map((u) => [u.uid, u]));
  return state.party.map((uid) => byId.get(uid)).filter(Boolean);
}

// 파티 편성 토글: 이미 있으면 제거, 없으면 추가(최대 MAX_PARTY, 최소 1명 유지).
export function togglePartyMember(state, uid) {
  const has = state.party.includes(uid);
  if (has) {
    if (state.party.length <= 1) return { ok: false, reason: '최소 1명은 편성해야 합니다' };
    state.party = state.party.filter((x) => x !== uid);
    if (state.formation) delete state.formation[uid]; // 편성 해제 시 진형도 정리
    return { ok: true, inParty: false };
  }
  if (state.party.length >= MAX_PARTY) return { ok: false, reason: `파티는 최대 ${MAX_PARTY}명` };
  if (!state.units.some((u) => u.uid === uid)) return { ok: false, reason: '보유하지 않은 유닛' };
  state.party = [...state.party, uid];
  return { ok: true, inParty: true };
}

const SYNERGY_ARCHETYPES = ['VANGUARD', 'STRIKER', 'SUPPORT'];

// 남은 슬롯을 전투력 상위 순으로 채운다. avoid(x)가 true인 후보는 1순위에서
// 건너뛰되(시너지 유지 목적), 그래도 정원을 못 채우면 2차로 avoid 없이 채운다.
function fillToSize(chosen, pool, size, avoid = () => false) {
  const ids = new Set(chosen.map((x) => x.uid));
  const result = [...chosen];
  const rest = pool.filter((x) => !ids.has(x.uid)).sort((a, b) => b.power - a.power);
  for (const x of rest) {
    if (result.length >= size) break;
    if (avoid(x)) continue;
    result.push(x); ids.add(x.uid);
  }
  if (result.length < size) {
    for (const x of rest) {
      if (result.length >= size) break;
      if (ids.has(x.uid)) continue;
      result.push(x); ids.add(x.uid);
    }
  }
  return result;
}

// 조합의 "시너지 반영 전투력" — 개별 전투력 합 × 팀 시너지 배수(평균).
// resolve()의 실제 배수 구조(atk/hp/def 각각 곱)를 근사해 평가한다.
function evalComposition(scored) {
  const sumPower = scored.reduce((s, x) => s + x.power, 0);
  const syn = teamSynergy(scored.map((x) => x.unit));
  const avgMult = (syn.mult.atk + syn.mult.hp + syn.mult.def) / 3;
  return { score: sumPower * avgMult, syn };
}

// 보유 유닛 중에서 "시너지까지 반영한 전투력"이 가장 높은 조합으로 파티를 채운다.
//   · 단순 전투력 상위 정렬만으로는 삼위일체(3원형)·원형 집중·속성 결속처럼
//     파티 전체에 곱연산으로 붙는 시너지를 놓칠 수 있다(개별 최강이 전체
//     최강은 아님). 몇 가지 유의미한 후보 조합을 만들어 실제로 비교한다.
export function autoParty(state, size = MAX_PARTY) {
  if (!state.units || !state.units.length) return { ok: false, reason: '보유한 유닛 없음' };
  const scored = state.units.map((u) => ({ uid: u.uid, unit: u, power: computePower(u) }));
  const n = Math.min(size, scored.length);

  const candidates = [];

  // 1) 기준선 — 전투력 상위만.
  const baseline = scored.slice().sort((a, b) => b.power - a.power).slice(0, n);
  candidates.push(baseline);

  // 2) 삼위일체 — 3원형 모두 owned라면 각 원형 최강 1명씩을 우선 앉히고 나머지는 전투력 순.
  const byArch = {};
  for (const x of scored) (byArch[x.unit.archetype] ||= []).push(x);
  for (const k of Object.keys(byArch)) byArch[k].sort((a, b) => b.power - a.power);
  if (SYNERGY_ARCHETYPES.every((a) => byArch[a]?.length)) {
    const anchors = SYNERGY_ARCHETYPES.map((a) => byArch[a][0]);
    candidates.push(fillToSize(anchors, scored, n));
  }

  // 3) 원형 집중 — 특정 원형 3명 이상 보유 시, 그 원형 최강 3명을 앉히고 나머지는 전투력 순.
  for (const a of SYNERGY_ARCHETYPES) {
    if ((byArch[a]?.length || 0) >= 3) {
      candidates.push(fillToSize(byArch[a].slice(0, 3), scored, n));
    }
  }

  // 4) 속성 결속 — 가장 많이 겹치는 속성의 최강 그룹(최대 4명)을 앉히고 나머지는 전투력 순.
  const byElem = {};
  for (const x of scored) if (x.unit.element) (byElem[x.unit.element] ||= []).push(x);
  for (const k of Object.keys(byElem)) byElem[k].sort((a, b) => b.power - a.power);
  const dominantElem = Object.keys(byElem).sort((a, b) => byElem[b].length - byElem[a].length)[0];
  if (dominantElem && byElem[dominantElem].length >= 2) {
    candidates.push(fillToSize(byElem[dominantElem].slice(0, 4), scored, n));
  }

  // 5) 오색 결속 — 서로 다른 속성을 최대한 모아 앉히고, 남는 슬롯은 속성 중복을 피해 채운다.
  const distinctElems = Object.keys(byElem);
  if (distinctElems.length >= 3) {
    const rainbow = distinctElems.map((e) => byElem[e][0]);
    const used = new Set(rainbow.map((x) => x.unit.element));
    candidates.push(fillToSize(rainbow, scored, n, (x) => x.unit.element && used.has(x.unit.element)));
  }

  // 후보 중 시너지 반영 전투력이 가장 높은 조합을 채택.
  let best = null, bestEval = null;
  for (const c of candidates) {
    const ev = evalComposition(c);
    if (!bestEval || ev.score > bestEval.score) { best = c; bestEval = ev; }
  }

  state.party = best.map((x) => x.uid);
  return { ok: true, party: [...state.party], synergy: bestEval.syn.list.map((s) => s.label) };
}
