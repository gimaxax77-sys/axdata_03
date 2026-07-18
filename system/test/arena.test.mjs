import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import {
  arenaPowerTier, arenaFight, arenaInfo, partyPowerEff,
  ARENA_POWER_TIERS, ARENA_ENTRIES,
} from '../core/arena.mjs';

function player({ level = 1, rank = 1, rarity = 'N', n = 1 } = {}) {
  const s = createGameState({ units: [], party: [] });
  for (let i = 0; i < n; i++) {
    const u = createUnit('STRIKER', { level, rank }); u.rarity = rarity;
    s.units.push(u);
  }
  s.party = s.units.map((u) => u.uid);
  return s;
}

test('아레나: 전투력 → 리그 매핑', () => {
  assert.equal(arenaPowerTier(0).name, '브론즈');
  assert.equal(arenaPowerTier(0).index, 0);
  assert.equal(arenaPowerTier(5000).name, '실버');
  assert.equal(arenaPowerTier(1e9).name, ARENA_POWER_TIERS[ARENA_POWER_TIERS.length - 1].name);
  // 구간 [min,max) 정확
  const t = arenaPowerTier(12000);
  assert.equal(t.name, '골드');
  assert.ok(t.max === 40000);
});

test('아레나: 약자 보호 — 상대 전투력이 내 전투력의 1.12배를 넘지 않음', () => {
  const s = player({ level: 30, rank: 3, rarity: 'SSR', n: 4 });
  const my = partyPowerEff(s);
  // 100판 반복해도 상대는 항상 my*1.12 이하
  for (let i = 0; i < 100; i++) {
    s.arena.entries = 0; // 입장 리셋
    const r = arenaFight(s, Math.random);
    assert.ok(r.oppPower <= Math.ceil(my * 1.12), `상대 ${r.oppPower} ≤ ${Math.ceil(my * 1.12)}`);
  }
});

test('아레나: 강자와 약자는 서로 다른 리그', () => {
  const weak = player({ level: 1, rank: 1, rarity: 'N', n: 1 });
  const strong = player({ level: 60, rank: 6, rarity: 'SSR', n: 4 });
  const wt = arenaInfo(weak).tier.index;
  const st = arenaInfo(strong).tier.index;
  assert.ok(st > wt, `강자 리그(${st}) > 약자 리그(${wt})`);
});

test('아레나: 입장 제한 준수', () => {
  const s = player({ level: 20, rank: 2, rarity: 'SR', n: 3 });
  let ok = 0;
  for (let i = 0; i < ARENA_ENTRIES + 3; i++) if (arenaFight(s, Math.random).ok) ok++;
  assert.equal(ok, ARENA_ENTRIES, '하루 입장 제한');
});

test('아레나: 상위 리그일수록 승리 보상↑', () => {
  const low = player({ level: 10, rank: 2, rarity: 'R', n: 2 });
  const high = player({ level: 60, rank: 6, rarity: 'SSR', n: 4 });
  low.peakStage = high.peakStage = 100;
  // 승리가 나올 때까지(내 파워 ≥ 상대) — band 하한 0.80이라 대개 승리
  const rl = arenaFight(low, () => 0); // band=0.80 → 승리
  const rh = arenaFight(high, () => 0);
  assert.ok(rl.win && rh.win);
  assert.ok(rh.reward.gem > rl.reward.gem, '상위 리그 다이아 보상↑');
});
