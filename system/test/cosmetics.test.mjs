import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { earn } from '../core/economy.mjs';
import { computePower } from '../core/stats.mjs';
import {
  getProfile, setProfileName, setAvatar, buyCosmetic, equipCosmetic,
  ownsCosmetic, hasPremium, grantPremium, PROFILE_NAME_MAX,
} from '../core/cosmetics.mjs';
import { purchase } from '../core/shop.mjs';
import { serialize, deserialize } from '../core/save.mjs';

function fresh() {
  const s = createGameState({ units: [], party: [] });
  const u = createUnit('STRIKER', { level: 10, rank: 2 });
  s.units.push(u); s.party = [u.uid];
  earn(s.wallet, { gem: 10000 });
  return { s, u };
}

test('코스메틱: 닉네임 설정 + 상한', () => {
  const { s } = fresh();
  assert.equal(getProfile(s).name, '조련사', '기본 닉네임');
  assert.equal(setProfileName(s, '  ').ok, false, '공백 거부');
  assert.equal(setProfileName(s, 'x'.repeat(PROFILE_NAME_MAX + 1)).ok, false, '길이 초과 거부');
  assert.equal(setProfileName(s, '미르마스터').ok, true);
  assert.equal(getProfile(s).name, '미르마스터');
});

test('코스메틱: 대표영웅은 보유 유닛만', () => {
  const { s, u } = fresh();
  assert.equal(setAvatar(s, 'nope').ok, false, '미보유 거부');
  assert.equal(setAvatar(s, u.uid).ok, true);
  assert.equal(getProfile(s).avatarUid, u.uid);
});

test('코스메틱: 구매→장착, 다이아 소모, 중복 구매 방지', () => {
  const { s } = fresh();
  const before = s.wallet.gem;
  assert.equal(ownsCosmetic(s, 'frame', 'gold'), false);
  const r = buyCosmetic(s, 'frame', 'gold');
  assert.equal(r.ok, true);
  assert.equal(s.wallet.gem, before - 2000, '다이아 차감');
  assert.equal(ownsCosmetic(s, 'frame', 'gold'), true);
  assert.equal(buyCosmetic(s, 'frame', 'gold').ok, false, '중복 구매 거부');
  assert.equal(equipCosmetic(s, 'frame', 'gold').ok, true);
  assert.equal(getProfile(s).frame, 'gold');
  // 미보유 장착 거부
  assert.equal(equipCosmetic(s, 'frame', 'mythic').ok, false);
});

test('코스메틱: 순수 외형 — 전투력 불변', () => {
  const { s, u } = fresh();
  const p0 = computePower(u);
  buyCosmetic(s, 'frame', 'mythic'); equipCosmetic(s, 'frame', 'mythic');
  buyCosmetic(s, 'title', 'legend'); equipCosmetic(s, 'title', 'legend');
  assert.equal(computePower(u), p0, '코스메틱은 능력치에 영향 없음');
});

test('코스메틱: 다이아 부족 시 구매 실패', () => {
  const s = createGameState({ units: [], party: [] }); // gem 0
  assert.equal(buyCosmetic(s, 'frame', 'gold').ok, false);
  assert.equal(ownsCosmetic(s, 'frame', 'gold'), false);
});

test('광고제거 패스: 상품 구매로 활성화', () => {
  const { s } = fresh();
  assert.equal(hasPremium(s), false);
  const r = purchase(s, 'PKG_ADFREE');
  assert.equal(r.ok, true);
  assert.equal(r.premium, true);
  assert.equal(hasPremium(s), true);
  // once 상품 — 재구매 거부
  assert.equal(purchase(s, 'PKG_ADFREE').ok, false);
});

test('코스메틱: grantPremium 직접 + 세이브 왕복 보존', () => {
  const { s } = fresh();
  grantPremium(s);
  buyCosmetic(s, 'frame', 'silver'); equipCosmetic(s, 'frame', 'silver');
  setProfileName(s, '엘드');
  const loaded = deserialize(serialize(s));
  assert.equal(hasPremium(loaded), true, '패스 보존');
  assert.equal(getProfile(loaded).frame, 'silver', '프레임 보존');
  assert.equal(ownsCosmetic(loaded, 'frame', 'silver'), true, '보유 보존');
  assert.equal(getProfile(loaded).name, '엘드', '닉네임 보존');
});
