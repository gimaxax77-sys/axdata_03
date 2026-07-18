import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { earn } from '../core/economy.mjs';
import {
  canClaimAttendance, claimAttendance, recordMission, missionList, claimMission,
  enterDungeon, dungeonEntriesLeft, DUNGEONS,
} from '../core/daily.mjs';
import { purchase, adLeft, SHOP } from '../core/shop.mjs';
import { arenaFight, arenaEntriesLeft, ARENA_ENTRIES } from '../core/arena.mjs';
import { guildAttack, guildAttacksLeft, GUILD_ATTACKS } from '../core/guild.mjs';
import { compPurchase } from '../core/compshop.mjs';
import { fightChapter, CAMPAIGN_CHAPTER_COUNT } from '../core/campaign.mjs';
import { claimAchievement, achievementList, seasonTier, claimSeason, buySeasonPremium } from '../core/meta.mjs';
import { nextObjective } from '../core/tutorial.mjs';
import { climbTower, towerChallenge } from '../core/tower.mjs';

function strongState(peak = 60) {
  const units = [
    createUnit('STRIKER', { level: 60, rank: 4, characterId: 'kael', element: 'FIRE' }),
    createUnit('VANGUARD', { level: 60, rank: 4, characterId: 'gwen', element: 'WATER' }),
  ];
  units.forEach((u) => (u.rarity = 'SR'));
  const s = createGameState({ units, party: units.map((u) => u.uid) });
  earn(s.wallet, { currency: 1e8, growth: 1e6, summon: 5000, gem: 5000 });
  s.peakStage = peak; s.maxStage = peak; s.stage = peak;
  return s;
}

test('daily: 출석 수령은 하루 1회', () => {
  const s = strongState();
  assert.equal(canClaimAttendance(s), true);
  assert.equal(claimAttendance(s).ok, true);
  assert.equal(canClaimAttendance(s), false, '재수령 차단');
});

test('daily: 미션 진행→완료→수령', () => {
  const s = strongState();
  const m0 = missionList(s).find((m) => m.id === 'summon');
  recordMission(s, 'summon', m0.goal);
  const m1 = missionList(s).find((m) => m.id === 'summon');
  assert.equal(m1.done, true);
  assert.equal(claimMission(s, 'summon').ok, true);
  assert.equal(claimMission(s, 'summon').ok, false, '중복 수령 차단');
});

test('daily: 던전 일일 입장 제한', () => {
  const s = strongState();
  const type = Object.keys(DUNGEONS)[0];
  const cap = DUNGEONS[type].entriesPerDay;
  let ok = 0;
  while (enterDungeon(s, type).ok) ok++;
  assert.equal(ok, cap);
  assert.equal(dungeonEntriesLeft(s, type), 0);
});

test('shop: 광고 일일 제한 + 다이아 구매', () => {
  const s = strongState();
  const ad = SHOP.ad[0];
  let n = 0; while (purchase(s, ad.id).ok) n++;
  assert.equal(n, ad.limit);
  assert.equal(adLeft(s, ad.id), 0);
  const gemItem = SHOP.gem[0];
  const before = s.wallet.summon;
  assert.equal(purchase(s, gemItem.id).ok, true);
  assert.ok(s.wallet.summon >= before, '보상 지급');
});

test('arena: 일일 입장 소진 + 포인트 변동', () => {
  const s = strongState();
  assert.equal(arenaEntriesLeft(s), ARENA_ENTRIES);
  for (let i = 0; i < ARENA_ENTRIES; i++) assert.equal(arenaFight(s, () => 0.1).ok, true);
  assert.equal(arenaEntriesLeft(s), 0);
  assert.equal(arenaFight(s).ok, false, '소진');
  assert.ok(s.arena.points >= 0);
});

test('guild: 일일 공격 소진 + 보스 피해 누적', () => {
  const s = strongState();
  assert.equal(guildAttacksLeft(s), GUILD_ATTACKS);
  const first = guildAttack(s);
  assert.equal(first.ok, true);
  assert.ok(first.dmg > 0);
  let n = 1; while (guildAttack(s).ok) n++;
  assert.equal(n, GUILD_ATTACKS);
});

test('compshop: 경쟁 재화 소모 환전 + 부족 차단', () => {
  const s = strongState();
  s.arena.points = 400;
  assert.equal(compPurchase(s, 'arena', 'AP_SUMMON').ok, true);
  assert.ok(s.arena.points < 400);
  s.arena.points = 0;
  assert.equal(compPurchase(s, 'arena', 'AP_GEM').ok, false);
});

test('campaign: 챕터 클리어/잠금/보상', () => {
  const s = strongState(60);
  assert.equal(fightChapter(s, 3).ok, false, '이전 챕터 먼저');
  const r = fightChapter(s, 0);
  assert.equal(r.ok, true);
  if (r.win) { assert.equal(s.campaign.cleared, 1); assert.ok(r.reward); }
  assert.ok(CAMPAIGN_CHAPTER_COUNT === 12);
});

test('meta: 업적 수령 1회 + 시즌 프리미엄 게이팅', () => {
  const s = strongState(60);
  const done = achievementList(s).find((a) => a.done && !a.claimed);
  if (done) {
    assert.equal(claimAchievement(s, done.id).ok, true);
    assert.equal(claimAchievement(s, done.id).ok, false, '중복 차단');
  }
  const tier = seasonTier(s);
  if (tier >= 1) {
    assert.equal(claimSeason(s, 1, 'premium').ok, false, '패스 없이 프리미엄 차단');
    buySeasonPremium(s);
    assert.equal(claimSeason(s, 1, 'premium').ok, true);
  }
});

test('tower: 승리 시 전진·보상, 층 난이도 단조 증가', () => {
  const s = strongState(60);
  s.prestige = 200; // 계정 배수로 상위 층 등반 가능
  assert.ok(towerChallenge(10).hp > towerChallenge(1).hp, '층 난이도↑');
  const f0 = s.tower.floor;
  const r = climbTower(s);
  assert.equal(r.ok, true);
  if (r.win) {
    assert.equal(s.tower.floor, f0 + 1, '승리 시 전진');
    assert.ok(s.tower.best >= s.tower.floor);
    assert.ok(r.reward.gem >= 1);
  }
  // 5층 마일스톤 보상
  s.tower.floor = 5;
  const r5 = climbTower(s);
  if (r5.win) assert.ok(r5.milestone && r5.reward.summon, '5층 마일스톤');
});

test('난이도: 배수·해금·playStage 적용', async () => {
  const { DIFFICULTIES, playStage, difficultyUnlocked, setDifficulty, difficultyDef } = await import('../core/difficulty.mjs');
  const { getStage } = await import('../core/progression.mjs');
  assert.equal(DIFFICULTIES[0].id, 'normal');
  const s = strongState(120);
  s.stage = 20;
  const base = getStage(20);
  s.difficulty = 'hell';
  const hell = playStage(s);
  const m = difficultyDef('hell');
  assert.equal(hell.challenge.hp, Math.round(base.challenge.hp * m.enemyMult), '적 배수 반영');
  assert.equal(hell.rewards.currency, Math.round(base.rewards.currency * m.rewardMult), '보상 배수 반영');
  // 해금: peak120 → 지옥(60) 해금, 나락(100) 해금
  assert.equal(difficultyUnlocked(s, 'hell'), true);
  assert.equal(difficultyUnlocked(strongState(50), 'hell'), false, 'peak50<60 미해금');
  assert.equal(setDifficulty(strongState(10), 'abyss').ok, false, '미해금 전환 차단');
});

test('스테이지 속성 구역: 밴드로 나뉜다', async () => {
  const { stageElement, stageZone, STAGE_BAND } = await import('../core/progression.mjs');
  assert.equal(stageElement(1), stageElement(STAGE_BAND), '같은 구역 = 같은 속성');
  assert.notEqual(stageElement(1), stageElement(STAGE_BAND + 1), '다음 구역 = 다른 속성');
  const z = stageZone(1);
  assert.equal(z.start, 1); assert.equal(z.end, STAGE_BAND);
});

test('운영자 조작: adjustField·오버라이드 적용·리셋', async () => {
  const admin = await import('../core/admin.mjs');
  const { BALANCE } = await import('../core/balance.mjs');
  const f = admin.ADMIN_FIELDS.find((x) => x.path === 'enemyGrowth');
  const before = BALANCE.enemyGrowth;
  const lowered = admin.adjustField(f, -1);
  assert.ok(lowered < before, '−1 조정으로 감소');
  assert.equal(BALANCE.enemyGrowth, lowered, 'BALANCE 즉시 반영');
  // 오버라이드 재적용
  admin.setBalanceValue('enemyGrowth', before); // 되돌림
  admin.applyOverrides({ enemyGrowth: 1.05 });
  assert.equal(BALANCE.enemyGrowth, 1.05, '오버라이드 적용');
  admin.resetAll();
  assert.equal(BALANCE.enemyGrowth, admin.DEFAULTS.enemyGrowth, '전체 리셋 복원');
});

test('던전: 장비/룬 파밍 던전이 실제 아이템 드롭', async () => {
  const { enterDungeon, dungeonEntriesLeft, DUNGEONS } = await import('../core/daily.mjs');
  const { makeRng } = await import('../core/rng.mjs');
  const s = strongState(80);
  assert.ok(DUNGEONS.GEAR && DUNGEONS.RUNE, '장비·룬 던전 존재');
  const invBefore = s.inventory.length;
  const rg = enterDungeon(s, 'GEAR', Date.now(), makeRng(1));
  assert.equal(rg.kind, 'gear');
  assert.equal(s.inventory.length, invBefore + 1, '장비 인벤토리 증가');
  const bagBefore = (s.runeBag || []).length;
  const rr = enterDungeon(s, 'RUNE', Date.now(), makeRng(2));
  assert.equal(rr.kind, 'rune');
  assert.equal(s.runeBag.length, bagBefore + 1, '룬 가방 증가');
  // 입장 제한 소진
  let n = 2; while (enterDungeon(s, 'GEAR', Date.now(), makeRng(n++)).ok) {}
  assert.equal(dungeonEntriesLeft(s, 'GEAR'), 0);
});

test('재료 던전: 요일/속성/펫 던전이 재료 지급 + 사용처 소모', async () => {
  const { enterDungeon, DUNGEONS } = await import('../core/daily.mjs');
  const { makeRng } = await import('../core/rng.mjs');
  const { materialCount } = await import('../core/materials.mjs');
  const { ascend } = await import('../core/character.mjs');
  const { grantGearElementOption, craftGear } = await import('../core/gear.mjs');
  const { petShardSummon } = await import('../core/pets.mjs');
  const s = strongState(80);
  assert.ok(DUNGEONS.WEEKDAY && DUNGEONS.ELEMENT && DUNGEONS.PETSHARD, '재료 던전 3종 존재');

  // 요일 던전 → 소환석(돌파 재료 통합)
  const walletBefore = s.wallet.summon || 0;
  const rw = enterDungeon(s, 'WEEKDAY', Date.now(), makeRng(11));
  assert.equal(rw.kind, 'weekday');
  assert.ok(rw.summon > 0 && s.wallet.summon === walletBefore + rw.summon, '소환석 지급');

  // 속성 던전 → 속성정수
  const re = enterDungeon(s, 'ELEMENT', Date.now(), makeRng(12));
  assert.equal(re.kind, 'element');
  assert.ok(re.elemEssence > 0 && materialCount(s, 'elemEssence') === re.elemEssence, '속성정수 지급');

  // 펫 던전 → 등급별 펫조각
  const rp = enterDungeon(s, 'PETSHARD', Date.now(), makeRng(13));
  assert.equal(rp.kind, 'petshard');
  assert.ok(rp.amount > 0 && materialCount(s, 'petShard', rp.grade) === rp.amount, '펫조각 지급');

  // 사용처 1: 소환석으로 돌파
  s.wallet.summon = 100000;
  const u = s.units[0];
  const rankBefore = u.rank;
  const asc = ascend(s, u.uid);
  assert.equal(asc.ok, true);
  assert.equal(asc.used, 'summon', '소환석 우선 소모');
  assert.equal(u.rank, rankBefore + 1);

  // 사용처 2: 속성정수로 장비 속성옵션 부여
  s.materials.elemEssence = 100;
  const cg = craftGear(s, Object.values((await import('../core/gear.mjs')).GEAR_CATALOG)[0].id);
  const subsBefore = (cg.item.subs || []).length;
  const go = grantGearElementOption(s, cg.item.uid, makeRng(14));
  assert.equal(go.ok, true);
  assert.equal(go.subs.length, subsBefore + 1, '부옵션 1개 추가');

  // 사용처 3: 펫조각으로 소환
  s.materials.petShard.SSR = 100;
  const ps = petShardSummon(s, 'SSR', makeRng(15));
  assert.equal(ps.ok, true);
  assert.equal(ps.grade, 'SSR');
  assert.equal(materialCount(s, 'petShard', 'SSR'), 90, '조각 10개 소모');
});

test('QoL: 던전 소탕이 남은 입장을 한 번에 소진', async () => {
  const { sweepDungeon, dungeonEntriesLeft, DUNGEONS } = await import('../core/daily.mjs');
  const { makeRng } = await import('../core/rng.mjs');
  const s = strongState(80);
  const max = DUNGEONS.WEEKDAY.entriesPerDay;
  const r = sweepDungeon(s, 'WEEKDAY', Date.now(), makeRng(7));
  assert.equal(r.ok, true);
  assert.equal(r.count, max, '남은 입장 전부 소진');
  assert.ok(r.summon > 0 && r.items > 0, '보상 합산');
  assert.equal(dungeonEntriesLeft(s, 'WEEKDAY'), 0);
  assert.equal(sweepDungeon(s, 'WEEKDAY').ok, false, '소진 후 재소탕 불가');
});

test('QoL: 원탭 일일 전체수령(출석+완료미션)', async () => {
  const { claimAllDaily, recordMission, missionList } = await import('../core/daily.mjs');
  const s = strongState();
  // 미션 하나 완료 상태로
  recordMission(s, 'summon', 5);
  const before = { ...s.wallet };
  const r = claimAllDaily(s);
  assert.equal(r.ok, true);
  assert.ok(r.attendance, '출석 수령됨');
  assert.ok(r.missions.length >= 1, '완료 미션 수령됨');
  assert.ok(s.wallet.growth > before.growth || s.wallet.summon > before.summon || s.wallet.currency > before.currency, '지갑 증가');
  // 재수령 없음
  assert.equal(claimAllDaily(s).ok, false, '이미 다 받으면 no-op');
});

test('QoL: 오프라인 2배 보너스', async () => {
  const { idleGenre } = await import('../genres/idle.mjs');
  const s = strongState();
  const before = s.wallet.currency;
  const r = idleGenre.applyOfflineBonus(s, { currency: 1000, growth: 500 }, 1);
  assert.equal(r.ok, true);
  assert.equal(s.wallet.currency, before + 1000, '정산분만큼 추가(=2배)');
});

test('QoL: 자동 펫 합성이 가능한 모든 등급 승급', async () => {
  const { autoFusePets, PETS, PET_FUSE_COST } = await import('../core/pets.mjs');
  const s = strongState();
  s.pets = { owned: {}, active: [], opts: {} };
  // R 등급 펫에 합성 가능 수량 부여
  const rPet = Object.values(PETS).find((p) => p.rarity === 'R');
  s.pets.owned[rPet.id] = PET_FUSE_COST; // 정확히 1회 합성분
  const r = autoFusePets(s, () => 0.5);
  assert.equal(r.ok, true);
  assert.ok(r.fused >= 1, '최소 1회 합성');
});

test('스마트 합성 필터: stopAt/only로 특정 등급 보호', async () => {
  const { autoFusePets, PETS, PET_FUSE_COST } = await import('../core/pets.mjs');
  const rPetId = Object.values(PETS).find((p) => p.rarity === 'R').id;
  const srPetId = Object.values(PETS).find((p) => p.rarity === 'SR').id;
  const mk = () => {
    const s = strongState();
    s.pets = { owned: { [rPetId]: PET_FUSE_COST, [srPetId]: PET_FUSE_COST }, active: [], opts: {} };
    return s;
  };
  // stopAt:'SR' → R만 합성, SR은 보호(그대로).
  const s1 = mk();
  autoFusePets(s1, () => 0.5, { stopAt: 'SR' });
  assert.equal(s1.pets.owned[srPetId], PET_FUSE_COST, 'SR 미소모(보호)');
  assert.ok(!s1.pets.owned[rPetId] || s1.pets.owned[rPetId] < PET_FUSE_COST, 'R은 합성됨');
  // only:['SR'] → SR만 합성, R은 보호.
  const s2 = mk();
  autoFusePets(s2, () => 0.5, { only: ['SR'] });
  assert.equal(s2.pets.owned[rPetId], PET_FUSE_COST, 'R 미소모(보호)');
  assert.ok(!s2.pets.owned[srPetId] || s2.pets.owned[srPetId] < PET_FUSE_COST, 'SR은 합성됨');
});

test('렌트: 결제→활성 배수, 만료→소멸, 업그레이드', async () => {
  const { rent, rentalActive, rentalTier, rentalMods, rentalTierDef } = await import('../core/rentals.mjs');
  const { accountMods } = await import('../core/balance.mjs');
  const s = strongState();
  earn(s.wallet, { gem: 5000 });
  const now = 1_000_000;
  // 미대여: 배수 1
  assert.equal(rentalMods(s, now).power, 1);
  // 티어1 결제
  const r1 = rent(s, 'RENT_WEAPON', 1, now);
  assert.equal(r1.ok, true);
  assert.equal(rentalActive(s, 'RENT_WEAPON', now), true);
  const per1 = rentalTierDef('RENT_WEAPON', 1).per;
  assert.ok(Math.abs(rentalMods(s, now).power - (1 + per1)) < 1e-9, '활성 배수 반영');
  // 만료 후: 소멸
  const later = now + 8 * 86400000;
  assert.equal(rentalActive(s, 'RENT_WEAPON', later), false);
  assert.equal(rentalMods(s, later).power, 1, '만료 시 효과 소멸');
  // 업그레이드 → 상위 티어 + 기간 리셋
  const r2 = rent(s, 'RENT_WEAPON', 3, now);
  assert.equal(rentalTier(s, 'RENT_WEAPON', now), 3);
  // accountMods가 렌트를 곱함(활성 시)
  assert.ok(accountMods(s).powerMult >= 1, 'accountMods 통합');
});

test('유물 확장: 등급별 상한 + 강화', async () => {
  const { RELICS, relicCap, upgradeRelic } = await import('../core/relics.mjs');
  assert.ok(Object.keys(RELICS).length >= 8, '유물 8종+');
  assert.equal(relicCap('R_POWER'), 20);
  assert.equal(relicCap('R_WARLORD'), 30, 'SR 상한 30');
  assert.equal(relicCap('R_TITAN'), 40, 'SSR 상한 40');
  const s = strongState();
  earn(s.wallet, { currency: 1e9 });
  assert.equal(upgradeRelic(s, 'R_TITAN').ok, true);
});

test('펫 확장: 개체 옵션 + 합성(승급) + 옵션 재련', async () => {
  const { PETS, petMods, petFuse, petFuseAvail, PET_FUSE_COST, rerollPetOpt } = await import('../core/pets.mjs');
  const { makeRng } = await import('../core/rng.mjs');
  assert.ok(Object.keys(PETS).length >= 12, '펫 12종+');
  const s = strongState();
  earn(s.wallet, { gem: 1000 });
  // R 펫 레벨을 합성 임계까지 확보
  s.pets.owned = { P_CAT: 3, P_WOLF: 3 };
  s.pets.opts = { P_CAT: { key: 'currency', value: 0.05 } };
  s.pets.active = ['P_CAT'];
  // 개체 옵션이 배수에 반영
  const before = petMods(s).currency;
  assert.ok(before > 1 + PETS.P_CAT.per * 3 - 1e-9, '옵션 포함 배수');
  // 합성: R 6레벨 → SR 1
  assert.equal(petFuseAvail(s, 'R'), 6);
  const f = petFuse(s, 'R', makeRng(3));
  assert.equal(f.ok, true);
  assert.equal(PETS[f.pet].rarity, 'SR', '상위 등급 획득');
  // 옵션 재련
  s.pets.owned.P_FOX = 1;
  assert.equal(rerollPetOpt(s, 'P_FOX', makeRng(9)).ok, true);
  assert.ok(s.pets.opts.P_FOX, '옵션 롤됨');
});

test('환생 상자: 리셋 전 도달치로 장비·룬·재화 지급', async () => {
  const { idleGenre } = await import('../genres/idle.mjs');
  const { makeRng } = await import('../core/rng.mjs');
  const s = strongState(100);
  s.maxStage = 100;
  const invBefore = s.inventory.length;
  const bagBefore = (s.runeBag || []).length;
  const r = idleGenre.prestige(s, makeRng(99));
  assert.ok(r.prestigeGained >= 1);
  assert.ok(r.box && r.box.rolls >= 1, '상자 롤 존재');
  const gained = (s.inventory.length - invBefore) + ((s.runeBag || []).length - bagBefore) + (r.box.gem > 0 ? 1 : 0) + (r.box.summon > 0 ? 1 : 0);
  assert.ok(gained >= 1, '상자에서 무언가 지급됨');
  assert.equal(s.maxStage, 1, '회차 리셋');
});

test('컨셉 정합성: 로스터 최소필수(이름+원형) + 있을 때만 유효성(어떤 장르·형태 캐릭터도 허용)', async () => {
  const { CONCEPTS } = await import('../concepts/index.mjs');
  const { SKILL_CATALOG } = await import('../core/skills.mjs');
  const { ARCHETYPES } = await import('../core/archetypes.mjs');
  const { isOn } = await import('../core/features.mjs');
  const ELEMENTS = ['FIRE', 'WATER', 'WOOD', 'LIGHT', 'DARK'];
  const ids = {};
  for (const cid of ['fantasy', 'scifi']) {
    const c = CONCEPTS[cid];
    ids[cid] = c.roster.map((x) => x.id).sort();
    for (const ch of c.roster) {
      // 코어 최소 필수 — 이름 + 원형만. (등급·속성·시그니처·코스튬·대사는 옵션)
      assert.ok(ch.name, `${cid}:${ch.id} 이름`);
      assert.ok(ARCHETYPES[ch.archetype], `${cid}:${ch.id} 원형 유효`);
      // 아래는 값이 있을 때만(또는 모듈 켜졌을 때만) 유효성 검사 — 없어도 허용.
      if (ch.signature) assert.ok(SKILL_CATALOG[ch.signature]?.signature, `${cid}:${ch.id} 시그니처 유효`);
      if (isOn('elements') && ch.element != null) assert.ok(ELEMENTS.includes(ch.element), `${cid}:${ch.id} 속성 유효`);
    }
  }
  // 두 스킨이 같은 캐릭터셋을 정의할 때만 패리티 확인(단일/유연 로스터 허용).
  if (ids.fantasy.length === ids.scifi.length) {
    assert.deepEqual(ids.fantasy, ids.scifi, '두 컨셉 캐릭터 id 패리티');
  }
});

test('tutorial: 목표 전이 level→summon→party→완료', () => {
  const u = createUnit('STRIKER', { level: 1, rank: 2, characterId: 'mir' }); u.rarity = 'N';
  const s = createGameState({ units: [u], party: [u.uid] });
  assert.equal(nextObjective(s).id, 'level');
  s.peakStage = 8;
  assert.equal(nextObjective(s).id, 'summon');
  s.units.push(createUnit('VANGUARD', { level: 1, rank: 1 }));
  assert.equal(nextObjective(s).id, 'party');
  s.party.push(s.units[1].uid);
  assert.equal(nextObjective(s), null, '완료');
});
