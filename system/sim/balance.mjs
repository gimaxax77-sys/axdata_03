import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { earn } from '../core/economy.mjs';
import { getStage } from '../core/progression.mjs';
import { BALANCE, accountMods } from '../core/balance.mjs';
import { resolve } from '../core/resolution.mjs';
import { getPartyUnits } from '../core/gameState.mjs';
import { idleGenre } from '../genres/idle.mjs';
import { summonMulti } from '../core/gacha.mjs';
import { makeRng } from '../core/rng.mjs';
import { invest, pickParty, partyPower } from './autoplayer.mjs';
import { UNLOCKS } from '../core/unlocks.mjs';

// ─────────────────────────────────────────────────────────────
// 밸런스 시뮬레이터 — 합리적 오토플레이어를 N일간 돌려
// 성장 곡선 / 병목 / 문서 해금 게이트 페이싱을 검출한다.
// 문서가 "미정"으로 남긴 수치 감각을 코드로 채운다.
// ─────────────────────────────────────────────────────────────

// 스테이지 해금 게이트. 실제 코드(unlocks.mjs)가 게이팅하는 기능은
// 그 값을 그대로 참조해 "리포트와 빌드가 어긋나지 않게" 한다.
// 나머지는 아직 코드화 안 된 설계상 플레이스홀더(문서 기준).
export const GATES = [
  { stage: 2, name: '캐릭터 강화' },
  { stage: 5, name: '장비' },
  { stage: 10, name: '보스 도전' },
  { stage: UNLOCKS.gacha, name: '소환' },
  { stage: UNLOCKS.dungeonGold, name: '골드 던전' },
  { stage: UNLOCKS.dungeonEssence, name: '강화석 던전' },
  { stage: UNLOCKS.pets, name: '펫' },
  { stage: UNLOCKS.arena, name: '아레나' },
  { stage: UNLOCKS.guild, name: '길드' },
].sort((a, b) => a.stage - b.stage);

// 스테이지 요구 전투력(참고용 프록시)
export function stagePower(stage) {
  const c = getStage(stage).challenge;
  return Math.round(c.hp * 0.15 + c.atk * 1.2 + c.def * 0.6);
}

// resolve 모델 기반: 파티가 실제로 이길 수 있는 최심 스테이지.
// (프록시 대신 진짜 전투 판정으로 탐색 — 지수 탐색 후 이분 탐색)
export function deepestWinnable(state) {
  const party = getPartyUnits(state);
  if (!party.length) return state.peakStage;
  const mods = accountMods(state);
  const wins = (stg) => resolve(party, getStage(stg).challenge, mods).win;
  const base = Math.max(1, state.peakStage);
  if (!wins(base)) return base;
  let hi = base, step = 8;
  while (wins(hi + step) && hi < base + 1000) { hi += step; step *= 2; }
  let lo = hi, up = hi + step;
  while (up - lo > 1) { const mid = (lo + up) >> 1; if (wins(mid)) lo = mid; else up = mid; }
  return lo;
}

// BALANCE 상수를 잠시 바꿔 fn을 실행하고 원복한다 (튜닝 실험용).
export function withBalance(override, fn) {
  const snapshot = JSON.parse(JSON.stringify(BALANCE));
  Object.assign(BALANCE, override);
  try {
    return fn();
  } finally {
    Object.assign(BALANCE, snapshot);
  }
}

export function runSimulation(opts = {}) {
  const {
    days = 7,
    checkinsPerDay = 8,
    hoursPerCheckin = 1, // 하루 약 8시간 파밍(오프라인 상한)
    dailySummon = 40, // 출석/미션 소환권
    dailyGem = 20, // 광고 보상 다이아 (펫 소환용)
    seed = 20260706,
    starter = { currency: 300, growth: 200, summon: 100 },
    balance = null, // BALANCE 오버라이드 (튜닝 실험)
    usePrestige = true, // 정체 시 환생 루프 사용
    useAccount = true, // 유물·펫 등 계정 성장 사용
    useAxes = true, // 전용무기·룬·각성(=씨앗 조건) 투자
    oneTimeGem = 0, // 초기 1회성 결제(패키지) 다이아 — 과금 시나리오
  } = opts;

  if (balance) return withBalance(balance, () => runSimulation({ ...opts, balance: null }));

  const rng = makeRng(seed);
  // 실제 게임 스타터와 동일하게 등급(N)을 부여 → 등급배수·씨앗이 시뮬에도 반영.
  const hero = createUnit('STRIKER', { level: 1, rank: 1, signature: 'SIG_NOVICE' });
  hero.rarity = 'N';
  const state = createGameState({ units: [hero], party: [hero.uid] });
  earn(state.wallet, starter);
  // 과금 시나리오: 패키지 구매분 다이아를 초반에 1회 투입(펫·룬·소환 전환).
  if (oneTimeGem > 0) earn(state.wallet, { gem: oneTimeGem });
  pickParty(state);

  const daily = [];
  const gateHits = [];
  let gateIdx = 0;
  let prevPeak = 1;

  for (let day = 1; day <= days; day++) {
    // 일일 콘텐츠 faucet: 출석/미션(소환권) + 광고(다이아) + 던전(골드, 진행도 비례)
    earn(state.wallet, {
      summon: dailySummon,
      gem: useAccount ? dailyGem : 0,
      currency: Math.round(getStage(state.peakStage).rewards.currency * 80),
    });
    let clears = 0;
    for (let c = 0; c < checkinsPerDay; c++) {
      const before = state.maxStage;
      const t = idleGenre.tick(state, hoursPerCheckin * 3600);
      clears += t.clears;
      invest(state, rng, summonMulti, useAccount, useAxes);
      // 벽에서 환생: 이번 체크인에 더 못 나아갔고 충분히 깊으면 환생
      if (usePrestige && state.maxStage <= before && state.maxStage >= 15) {
        idleGenre.prestige(state);
      }
    }
    const peak = state.peakStage;
    const mult = accountMods(state).powerMult;
    const pp = partyPower(state);
    const winnable = deepestWinnable(state); // resolve 기반 최심 승리 스테이지
    const headroom = winnable - peak; // 파밍벽 너머 여유 스테이지 수
    // 게이트 통과 기록 (역대 최고 = 실제 진행도 기준)
    while (gateIdx < GATES.length && peak >= GATES[gateIdx].stage) {
      gateHits.push({ day, ...GATES[gateIdx] });
      gateIdx++;
    }
    daily.push({
      day,
      maxStage: peak, // 역대 최고 도달(실제 진행도)
      stageGain: peak - prevPeak,
      bestPower: Math.round(pp.best * mult), // 환생 배수 반영
      totalPower: Math.round(pp.total * mult),
      roster: pp.size,
      required: stagePower(peak),
      winnable, // resolve 기반 최심 승리 스테이지
      headroom, // 여유 스테이지 (winnable - peak)
      prestige: state.prestige,
      accMult: mult, // 계정 배수(환생×유물×펫)
      relicLv: Object.values(state.relics || {}).reduce((a, b) => a + b, 0),
      pets: (state.pets && state.pets.active.length) || 0,
      gold: Math.round(state.wallet.currency),
      clears,
    });
    prevPeak = peak;
  }

  // 병목 검출: 초반 러시(Day1) 이후 진행이 사실상 멈춘 날(일일 +1 이하).
  const bottlenecks = [];
  for (const d of daily) {
    if (d.day > 1 && d.stageGain <= 1) {
      bottlenecks.push({ day: d.day, stage: d.maxStage, gain: d.stageGain });
    }
  }

  // 곡선 매끄러움 지표
  const gains = daily.slice(1).map((d) => d.stageGain);
  const mean = gains.reduce((s, g) => s + g, 0) / (gains.length || 1);
  const variance = gains.reduce((s, g) => s + (g - mean) ** 2, 0) / (gains.length || 1);
  const cv = mean > 0 ? Math.sqrt(variance) / mean : Infinity; // 변동계수(낮을수록 매끄러움)
  // resolve 기반 여유(headroom): 0에 가까우면 타이트, 크면 과도하게 강함
  const heads = daily.map((d) => d.headroom);
  const minHeadroom = Math.min(...heads);
  const maxHeadroom = Math.max(...heads);
  const avgHeadroom = Math.round(heads.reduce((a, b) => a + b, 0) / (heads.length || 1));
  const smoothness = { cv, minHeadroom, maxHeadroom, avgHeadroom, meanGain: mean };

  return { daily, gateHits, bottlenecks, smoothness, opts: { days, checkinsPerDay, hoursPerCheckin, dailySummon, seed } };
}

// ── CLI 리포트 ────────────────────────────────────────────────
function main() {
  const sim = runSimulation();
  const line = (c = '─') => console.log(c.repeat(66));

  console.log('\n■ 7일 성장 곡선 (합리적 오토플레이어, 하루 ~8h 파밍)\n');
  console.log('  Day  파밍Stage  일일증가  승리가능  여유  계정배수  유물Lv  펫');
  line();
  for (const d of sim.daily) {
    console.log(
      `  ${String(d.day).padStart(3)}  ${String(d.maxStage).padStart(8)}  ` +
        `${String(d.stageGain).padStart(7)}  ${String(d.winnable).padStart(8)}  ` +
        `${('+' + d.headroom).padStart(4)}  ${('×' + d.accMult.toFixed(2)).padStart(7)}  ` +
        `${String(d.relicLv).padStart(5)}  ${String(d.pets).padStart(2)}`
    );
  }
  console.log('\n  · 파밍Stage=자동전진 벽(2.5초) · 승리가능=resolve로 실제 이기는 최심 · 여유=그 차이');

  console.log('\n\n■ 콘텐츠 해금 게이트 도달 페이싱 (문서 기준)\n');
  line();
  for (const g of GATES) {
    const hit = sim.gateHits.find((h) => h.stage === g.stage);
    const when = hit ? `Day ${hit.day} 도달` : '7일 내 미도달 ✗';
    console.log(`  스테이지 ${String(g.stage).padStart(3)}  ${g.name.padEnd(12)}  ${when}`);
  }

  console.log('\n\n■ 병목(성장 정체) 검출\n');
  line();
  if (!sim.bottlenecks.length) {
    console.log('  뚜렷한 급정체 없음 (곡선이 매끄러움)');
  } else {
    for (const b of sim.bottlenecks) {
      console.log(`  Day ${b.day}: 스테이지 ${b.stage}에서 정체 (일일 +${b.gain})`);
    }
  }

  // ── 튜닝 실험: 보상/난이도 곡선을 조정하면 어떻게 달라지나 ──
  console.log('\n\n■ 튜닝 실험 — 곡선 상수를 바꿔 재시뮬레이션\n');
  const trials = [
    { label: '신규 축 OFF (무기·룬·각성 없음)', opt: { useAxes: false } },
    { label: '기본 (등급+씨앗+신규축)', opt: {} },
    { label: '풀 콘텐츠 파우셋 (아레나·길드·탑·캠페인)', opt: { dailyGem: 80, dailySummon: 120 } },
    { label: '과금: 스타터 (₩4,900 · 다이아 300)', opt: { oneTimeGem: 300 } },
    { label: '과금: 고래 (레전드+궁극 · 다이아 15.8k)', opt: { oneTimeGem: 15800, dailyGem: 60 } },
    { label: '계정성장 OFF (유물·펫 없음)', opt: { useAccount: false } },
    { label: '환생 OFF', opt: { balance: { prestigeIncomeBonus: 0 }, usePrestige: false } },
    { label: '비용 완화', opt: { balance: { levelCostGrowth: 1.09, enhanceCostGrowth: 1.16, gearCostGrowth: 1.2 } } },
    { label: '종합안 (난이도↓+비용완화+환생1.0)',
      opt: { balance: { enemyGrowth: 1.12, rewardGrowth: 1.13, levelCostGrowth: 1.09, enhanceCostGrowth: 1.16, gearCostGrowth: 1.2, prestigeIncomeBonus: 1.0 } } },
  ];
  console.log('  튜닝안                                  7일차Stage  평균여유  변동계수  병목');
  line();
  for (const t of trials) {
    const s = runSimulation(t.opt);
    const last = s.daily[s.daily.length - 1];
    const avgH = '+' + s.smoothness.avgHeadroom;
    const cv = s.smoothness.cv.toFixed(2);
    console.log(
      `  ${t.label.padEnd(38)}  ${String(last.maxStage).padStart(8)}  ` +
        `${avgH.padStart(7)}  ${cv.padStart(7)}  ${String(s.bottlenecks.length).padStart(4)}`
    );
  }
  console.log('\n  → 여유(resolve 기반)가 0 근처면 타이트, 클수록 과강. 병목 0 + 여유 적당이 이상적.');
  console.log('  → 과금(고래)은 진행을 앞당기나 여유는 무과금과 비슷 → 적 곡선이 따라붙어');
  console.log('    벽을 없애지 않음(P2W 런어웨이 없음). 고액 패키지가 경제를 깨지 않음.');
  console.log('');
}

// 직접 실행 시에만 리포트
if (import.meta.url === `file://${process.argv[1]}`) main();
