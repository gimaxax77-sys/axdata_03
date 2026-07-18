import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { earn } from '../core/economy.mjs';
import {
  pickOpponent, ARENA_LADDERS, ladderPeriod, ladderSettleReward,
  refreshLadders, recordLadderWin, ladderInfo, arenaFight,
} from '../core/arena.mjs';
import { addMail, mailList, unreadMailCount, claimMail, claimAllMail } from '../core/mailbox.mjs';
import { serialize, deserialize } from '../core/save.mjs';

function player(n = 4) {
  const s = createGameState({ units: [], party: [] });
  for (let i = 0; i < n; i++) { const u = createUnit('STRIKER', { level: 30, rank: 3 }); u.rarity = 'SSR'; s.units.push(u); }
  s.party = s.units.map((u) => u.uid);
  s.peakStage = 100;
  return s;
}
const DAY = 86400000;

// ── 순수 매칭 ──
test('매칭: 같은 리그 + 약자보호 밴드 상대 선택', () => {
  const my = 10000;
  const cands = [
    { id: 'a', power: 9000 },   // 밴드 안
    { id: 'b', power: 11000 },  // my*1.1 (상한 1.12 이내)
    { id: 'c', power: 20000 },  // 너무 강함(제외)
    { id: 'd', power: 3000 },   // 너무 약함(제외)
  ];
  const seen = new Set();
  for (let i = 0; i < 50; i++) { const o = pickOpponent(my, cands, Math.random); if (o) seen.add(o.id); }
  assert.ok(seen.has('a') || seen.has('b'), '밴드 내 상대 선택');
  assert.ok(!seen.has('c') && !seen.has('d'), '밴드 밖 제외');
});

test('매칭: 후보 없으면 null(봇 폴백 신호)', () => {
  assert.equal(pickOpponent(10000, [{ power: 99999 }], Math.random), null);
  assert.equal(pickOpponent(10000, [], Math.random), null);
});

// ── 3중 리그 ──
test('리그: 승리 포인트가 세 리그에 동시 적립', () => {
  const s = player();
  const t0 = 100 * DAY;
  recordLadderWin(s, 25, t0);
  for (const l of ARENA_LADDERS) assert.equal(s.ladders[l.id].points, 25, `${l.id} 적립`);
});

test('리그: 주기 경과 시 정산(우편) + 리셋', () => {
  const s = player();
  const t0 = 100 * DAY;
  recordLadderWin(s, 100, t0);           // 세 리그 100점
  const before = unreadMailCount(s);
  refreshLadders(s, t0 + 8 * DAY);        // 주간(7일) 경과 → 주간만 정산
  assert.equal(s.ladders.weekly.points, 0, '주간 리셋');
  assert.ok(s.ladders.monthly.points > 0, '월간은 아직 유지');
  assert.ok(unreadMailCount(s) > before, '정산 우편 도착');
});

test('리그: 정산 보상 가중치(월간>주간)', () => {
  const w = ladderSettleReward('weekly', 100).gem;
  const m = ladderSettleReward('monthly', 100).gem;
  assert.ok(m > w, '월간 보상이 큼');
  assert.equal(ladderSettleReward('weekly', 0), null, '0점은 정산 없음');
});

test('리그: ladderInfo 남은 시간·포인트', () => {
  const s = player();
  const info = ladderInfo(s, 100 * DAY + 3 * DAY);
  assert.equal(info.length, 3);
  for (const l of info) assert.ok(l.endsInMs > 0 && l.label);
});

// ── 우편함 ──
test('우편함: 지급·수령·전체수령', () => {
  const s = player();
  addMail(s, { title: '테스트', reward: { gem: 100 } });
  addMail(s, { title: '테스트2', reward: { currency: 500 } });
  assert.equal(unreadMailCount(s), 2);
  const gem0 = s.wallet.gem || 0;
  const first = mailList(s).find((m) => !m.claimed);
  claimMail(s, first.id);
  assert.equal(claimMail(s, first.id).ok, false, '중복 수령 불가');
  const r = claimAllMail(s);
  assert.ok(r.ok);
  assert.equal(unreadMailCount(s), 0);
  assert.ok((s.wallet.gem || 0) >= gem0 + 100);
});

// ── 통합: arenaFight가 리그에 적립 ──
test('arenaFight: 승리 시 리그 적립 + 세이브 왕복', () => {
  const s = player();
  let wins = 0;
  for (let i = 0; i < 5; i++) { s.arena.entries = 0; const r = arenaFight(s, () => 0); if (r.win) wins++; }
  assert.ok(wins > 0, '적어도 1승');
  assert.ok(s.ladders.weekly.points > 0, '리그 포인트 적립');
  const loaded = deserialize(serialize(s));
  assert.equal(loaded.ladders.weekly.points, s.ladders.weekly.points, '리그 왕복 보존');
  assert.deepEqual(loaded.mail, s.mail, '우편 왕복 보존');
});
