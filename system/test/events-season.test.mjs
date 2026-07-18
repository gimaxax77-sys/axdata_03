import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { earn } from '../core/economy.mjs';
import {
  WEEKLY_THEMES, currentTheme, weekIndex, recordEvent, weeklyEvent, claimWeekly,
} from '../core/events.mjs';
import {
  seasonInfo, seasonChallenge, seasonIndex, equalizedPower, SEASON_DAYS,
} from '../core/season.mjs';

const WEEK = 7 * 86400000;

function st() {
  const a = createUnit('STRIKER', { level: 40, rank: 3 }); a.rarity = 'SSR';
  const s = createGameState({ units: [a], party: [a.uid] });
  return { s, a };
}

test('주간 이벤트: 테마 순환 + track 적립 + 청구', () => {
  const { s } = st();
  // 소환 테마가 나오는 주를 찾는다.
  let now = 0;
  for (let w = 0; w < WEEKLY_THEMES.length; w++) {
    if (currentTheme(w * WEEK).id === 'summon') { now = w * WEEK; break; }
  }
  const theme = currentTheme(now);
  assert.equal(theme.id, 'summon');
  // track 불일치 적립은 무시, 일치만 카운트.
  recordEvent(s, 'dungeon', 5, now);
  assert.equal(weeklyEvent(s, now).progress, 0, '다른 track 무시');
  recordEvent(s, 'summon', theme.goal, now);
  const e = weeklyEvent(s, now);
  assert.ok(e.done, '목표 달성');
  const before = s.wallet.gem || 0;
  const r = claimWeekly(s, now);
  assert.ok(r.ok, '청구 성공');
  assert.ok((s.wallet.gem || 0) > before, '보상 지급');
  assert.equal(claimWeekly(s, now).ok, false, '중복 청구 방지');
});

test('주간 이벤트: 주 경계에서 진행도 리셋', () => {
  const { s } = st();
  const now = 3 * WEEK;
  const theme = currentTheme(now);
  recordEvent(s, theme.track, theme.goal, now);
  assert.ok(weeklyEvent(s, now).done);
  // 다음 주 → 리셋
  const next = weeklyEvent(s, now + WEEK);
  assert.equal(next.progress, 0, '새 주 진행도 0');
  assert.equal(next.claimed, false);
});

test('시즌: 평준화 전투력은 스펙차를 압축', () => {
  const weak = [createUnit('STRIKER', { level: 10, rank: 1 })];
  const strong = [createUnit('STRIKER', { level: 200, rank: 5 })];
  strong[0].rarity = 'SSR';
  const pw = equalizedPower(weak);
  const ps = equalizedPower(strong);
  assert.ok(ps > pw, '강자가 여전히 높음');
  // 원시 전투력 배수보다 평준화 배수가 훨씬 작아야(압축) 한다.
  assert.ok(ps / pw < 10, '스펙차가 로그 압축됨');
});

test('시즌: 층 도전 클리어 → 층 상승·보상, 주기 정산 우편', () => {
  const { s } = st();
  earn(s.wallet, { growth: 1e6 });
  const now = 5 * SEASON_DAYS * 86400000; // 어떤 시즌 중
  const info0 = seasonInfo(s, now);
  assert.equal(info0.floor, 0);
  const r = seasonChallenge(s, now);
  assert.ok(r.ok, `1층 클리어: ${r.reason || ''}`);
  assert.equal(seasonInfo(s, now).floor, 1);
  // 다음 시즌으로 넘어가면 정산 우편 발송 + 리셋.
  const nextNow = now + SEASON_DAYS * 86400000;
  const info2 = seasonInfo(s, nextNow);
  assert.equal(info2.floor, 0, '새 시즌 층 리셋');
  assert.ok((s.mail || []).some((m) => /시즌/.test(m.title)), '정산 우편 발송');
});
