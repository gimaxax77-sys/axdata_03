import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { earn } from '../core/economy.mjs';
import { serialize, deserialize, SAVE_VERSION, exportCode, importCode } from '../core/save.mjs';
import { computePower } from '../core/stats.mjs';

test('save: 전체 상태 왕복 무손실', () => {
  const u = createUnit('STRIKER', { level: 30, rank: 3, characterId: 'kael', signature: 'SIG_FLAME_EDGE', element: 'FIRE' });
  u.rarity = 'SSR'; u.intimacy = 500; u.sigWeapon = { level: 5 }; u.sigAwaken = 2;
  u.runes = [{ uid: 'r1', set: 'RAGE', rarity: 'R', level: 2 }, null, null];
  const s = createGameState({ units: [u], party: [u.uid] });
  earn(s.wallet, { currency: 12345, gem: 67 });
  s.peakStage = 42; s.prestige = 3; s.arena.points = 250; s.guild.tier = 2;
  s.campaign.cleared = 4; s.meta.season.premium = true;

  const back = deserialize(serialize(s));
  assert.equal(back.wallet.currency, 12345);
  assert.equal(back.peakStage, 42);
  assert.equal(back.prestige, 3);
  assert.equal(back.arena.points, 250);
  assert.equal(back.campaign.cleared, 4);
  assert.equal(back.meta.season.premium, true);
  assert.equal(back.units[0].sigWeapon.level, 5);
  assert.equal(back.units[0].sigAwaken, 2);
  assert.equal(computePower(back.units[0]), computePower(u), '전투력 동일');
});

test('save: 이관 코드 왕복(한글 포함) + 잘못된 코드 방어', () => {
  const u = createUnit('STRIKER', { level: 15, rank: 2, characterId: 'kael' });
  u.rarity = 'SR';
  const s = createGameState({ units: [u], party: [u.uid] });
  earn(s.wallet, { currency: 9999, gem: 42 });
  s.peakStage = 33;
  const code = exportCode(s);
  assert.ok(code.startsWith('ELD1:'), '코드 접두어');
  const back = importCode(code);
  assert.ok(back, '코드 복원 성공');
  assert.equal(back.wallet.currency, 9999);
  assert.equal(back.peakStage, 33);
  assert.equal(back.units[0].characterId, 'kael');
  // 방어: 접두어 없음/깨진 base64/빈값
  assert.equal(importCode('garbage'), null);
  assert.equal(importCode('ELD1:@@notbase64@@'), null);
  assert.equal(importCode(''), null);
  assert.equal(importCode(null), null);
});

test('save: 버전 불일치/손상 → null', () => {
  assert.equal(deserialize('not json'), null);
  assert.equal(deserialize(JSON.stringify({ v: 999, state: {} })), null);
  assert.equal(deserialize(JSON.stringify({ v: SAVE_VERSION })), null, 'state 없음');
});

test('save: 구버전(신규 필드 누락) 세이브를 안전하게 정규화', () => {
  // 아주 오래된 세이브: 신규 시스템 필드가 전혀 없음
  const old = {
    units: [{ uid: 'u1', archetype: 'STRIKER', level: 10, rank: 2 }],
    party: ['u1'],
    wallet: { currency: 500 },
    stage: 5, maxStage: 5,
  };
  const back = deserialize(JSON.stringify({ v: SAVE_VERSION, ts: Date.now(), state: old }));
  assert.ok(back, '로드 성공');
  // 신규 필드가 기본값으로 채워짐
  assert.ok(back.arena && back.guild && back.meta && back.campaign && back.tutorial);
  assert.deepEqual(back.runeBag, []);
  assert.equal(back.peakStage, 5, 'peakStage=maxStage 보정');
  const u = back.units[0];
  assert.deepEqual(u.skills, [null, null, null]);
  assert.deepEqual(u.runes, [null, null, null]);
  assert.equal(u.sigAwaken, 0);
  assert.ok(u.sigWeapon && u.sigWeapon.level === 0);
  assert.ok(u.enhance && u.gear);
  // 정규화된 유닛도 스탯 계산 가능(크래시 없음)
  assert.ok(computePower(u) > 0);
});

// 회귀 가드: 최신 세션에서 normalize가 새로 채우는 필드들
// (formation/profile/summonMastery/costumes/vip/ladders/mail/u.skin)이
// 구버전 세이브에서도 안전한 기본값으로 채워지는지 잠근다.
// 라이브 유저의 옛 세이브 로드가 최대 크래시 지점이므로 명시 검증한다.
test('save: 구버전 세이브 → 신규 시스템 필드 정규화(라이브 마이그레이션)', () => {
  const old = {
    units: [{ uid: 'u1', archetype: 'STRIKER', level: 10, rank: 2 }],
    party: ['u1'],
    wallet: { currency: 500, gem: 100 },
    stage: 5, maxStage: 5,
    // formation/profile/summonMastery/costumes/vip/ladders/mail/skin 전부 없음
  };
  const back = deserialize(JSON.stringify({ v: SAVE_VERSION, ts: Date.now(), state: old }));
  assert.ok(back, '로드 성공');
  // 진형: 객체로 존재(빈 편성 허용)
  assert.ok(back.formation && typeof back.formation === 'object');
  // 프로필: 기본 이름/외형/미보유 구조
  assert.equal(back.profile.name, '조련사');
  assert.equal(back.profile.frame, 'none');
  assert.equal(back.profile.title, 'none');
  assert.equal(back.profile.premium, false);
  assert.ok(back.profile.owned.frame && back.profile.owned.title);
  // 소환 마스터리: 배너별 {count,claimed} 기본값
  assert.ok(back.summonMastery && typeof back.summonMastery === 'object');
  for (const bn of Object.keys(back.summonMastery)) {
    assert.equal(back.summonMastery[bn].count, 0);
    assert.equal(back.summonMastery[bn].claimed, 0);
  }
  // 코스튬/VIP/리그/우편
  assert.ok(back.costumes && back.costumes.owned && typeof back.costumes.owned === 'object');
  assert.equal(back.vip.spend, 0);
  assert.ok(back.ladders && typeof back.ladders === 'object');
  assert.ok(Array.isArray(back.mail));
  // 유닛 코스튬(외형) 슬롯 기본값
  assert.equal(back.units[0].skin, null);
  // 정규화 후 전투력 계산/직렬화 왕복 크래시 없음
  assert.ok(computePower(back.units[0]) > 0);
  assert.ok(deserialize(serialize(back)), '재직렬화 왕복 성공');
});

test('save: 빈/유령 파티 최소 1명 보정', () => {
  const st = { units: [{ uid: 'u1', archetype: 'STRIKER', level: 1, rank: 1 }], party: ['ghost'], wallet: {}, stage: 1, maxStage: 1 };
  const back = deserialize(JSON.stringify({ v: SAVE_VERSION, ts: 1, state: st }));
  assert.deepEqual(back.party, ['u1'], '유령 uid 제거 후 첫 유닛으로 보정');
});
