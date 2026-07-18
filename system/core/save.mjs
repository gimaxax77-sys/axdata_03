import { ensureUnitSeq } from './units.mjs';
import { ensureGearSeq, emptyGearSet } from './gear.mjs';
import { ensureRuneSeq } from './runes.mjs';
import { ensureMailSeq } from './mailbox.mjs';
import { createWallet } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 세이브 직렬화 — gameState는 순수 데이터라 JSON으로 그대로 왕복 가능.
// 로드 시 (1) 누락 필드 기본값 보정 (2) uid 시퀀스 동기화를 한다.
// ─────────────────────────────────────────────────────────────

export const SAVE_VERSION = 2;

export function serialize(state) {
  return JSON.stringify({ v: SAVE_VERSION, ts: Date.now(), state });
}

// 누락/구버전 필드 보정 (안전한 로드).
function normalize(state) {
  state.inventory = state.inventory || [];
  state.runeBag = state.runeBag || [];
  state.wallet = { ...createWallet(), ...(state.wallet || {}) };
  state.gacha = state.gacha || { pity: 0 };
  state.relics = state.relics || {};
  state.emblems = state.emblems || {};
  state.guardians = state.guardians || { owned: {}, active: [] };
  state.guardians.owned = state.guardians.owned || {};
  state.guardians.active = state.guardians.active || [];
  state.pets = state.pets || { owned: {}, active: [] };
  state.pets.owned = state.pets.owned || {};
  state.pets.active = state.pets.active || [];
  state.pets.opts = state.pets.opts || {};
  state.daily = state.daily || {};
  state.daily.epochDay = state.daily.epochDay || 0;
  state.daily.streak = state.daily.streak || 0;
  state.daily.claimedDay = state.daily.claimedDay ?? -1;
  state.daily.missions = state.daily.missions || { summon: 0, upgrade: 0, dungeon: 0 };
  state.daily.claimed = state.daily.claimed || {};
  state.daily.dungeon = state.daily.dungeon || { GOLD: 0, ESSENCE: 0 };
  state.daily.ads = state.daily.ads || {};
  state.shop = state.shop || { purchased: {} };
  state.shop.purchased = state.shop.purchased || {};
  state.rentals = state.rentals || {};
  state.admin = state.admin || { overrides: {} };
  state.admin.overrides = state.admin.overrides || {};
  state.materials = state.materials || {};
  // 돌파석 폐지 마이그레이션: 구버전 세이브에 남은 돌파석을 소환석으로 1:1 환급 후 제거.
  if (state.materials.ascendStone) {
    state.wallet.summon = (state.wallet.summon || 0) + state.materials.ascendStone;
    delete state.materials.ascendStone;
  }
  state.materials.elemEssence = state.materials.elemEssence || 0;
  state.materials.petShard = state.materials.petShard || {};
  for (const gr of ['R', 'SR', 'SSR', 'UR']) state.materials.petShard[gr] = state.materials.petShard[gr] || 0;
  state.arena = state.arena || { points: 0, day: -1, entries: 0 };
  state.arena.points = state.arena.points || 0;
  state.arena.day = state.arena.day ?? -1;
  state.arena.entries = state.arena.entries || 0;
  state.ladders = state.ladders || {};
  state.mail = Array.isArray(state.mail) ? state.mail : [];
  state.guild = state.guild || { coins: 0, day: -1, attacks: 0, tier: 1, bossHp: null };
  state.guild.coins = state.guild.coins || 0;
  state.guild.day = state.guild.day ?? -1;
  state.guild.attacks = state.guild.attacks || 0;
  state.guild.tier = state.guild.tier || 1;
  if (state.guild.bossHp === undefined) state.guild.bossHp = null;
  state.meta = state.meta || {};
  state.meta.achv = state.meta.achv || {};
  state.meta.coll = state.meta.coll || {};
  state.meta.season = state.meta.season || { claimed: {}, premium: false };
  state.meta.season.claimed = state.meta.season.claimed || {};
  state.meta.season.premium = !!state.meta.season.premium;
  state.campaign = state.campaign || { cleared: 0 };
  state.campaign.cleared = state.campaign.cleared || 0;
  state.tutorial = state.tutorial || { introSeen: false };
  state.tutorial.introSeen = !!state.tutorial.introSeen;
  state.settings = state.settings || {};
  state.settings.muted = !!state.settings.muted;
  state.settings.haptics = state.settings.haptics !== false; // 기본 on
  state.settings.reduceMotion = !!state.settings.reduceMotion;
  state.settings.skipGachaAnim = !!state.settings.skipGachaAnim; // 가챠 연출 스킵(기본 off)
  state.settings.ecoMode = !!state.settings.ecoMode; // 절전 모드(발열/배터리, 기본 off)
  state.settings.lang = state.settings.lang || 'ko';
  // 낮은 등급 장비 자동 분해 임계: null(끄기) | 'N' | 'R'. 기본 끄기.
  if (state.settings.autoSalvage === undefined) state.settings.autoSalvage = null;
  state.tower = state.tower || { floor: 1, best: 1 };
  state.tower.floor = state.tower.floor || 1;
  state.tower.best = state.tower.best || state.tower.floor || 1;
  state.profile = state.profile || {};
  state.profile.name = state.profile.name || '조련사';
  if (state.profile.avatarUid === undefined) state.profile.avatarUid = null;
  state.profile.frame = state.profile.frame || 'none';
  state.profile.title = state.profile.title || 'none';
  state.profile.premium = !!state.profile.premium;
  state.profile.owned = state.profile.owned || {};
  state.profile.owned.frame = state.profile.owned.frame || {};
  state.profile.owned.title = state.profile.owned.title || {};
  state.summonMastery = state.summonMastery || {};
  for (const bn of ['hero', 'pet', 'gear', 'rune', 'cosmetic']) {
    const m = state.summonMastery[bn] || {};
    state.summonMastery[bn] = { count: m.count || 0, claimed: m.claimed || 0 };
  }
  state.costumes = state.costumes || { owned: {} };
  state.costumes.owned = state.costumes.owned || {};
  state.vip = state.vip || { spend: 0 };
  state.vip.spend = state.vip.spend || 0;
  // 주간 테마 이벤트(미니 로드맵) 진행 상태.
  state.events = state.events || { week: -1, progress: 0, claimed: false };
  state.events.progress = state.events.progress || 0;
  // 시즌 소프트리셋 던전 진행(평준화 랭킹).
  state.season2 = state.season2 || { idx: -1, floor: 0, best: 0 };
  state.season2.floor = state.season2.floor || 0;
  state.season2.best = state.season2.best || 0;
  state.stage = state.stage || 1;
  state.difficulty = state.difficulty || 'normal';
  state.maxStage = state.maxStage || 1;
  state.peakStage = state.peakStage || state.maxStage || 1;
  state.energy = state.energy ?? 60;
  state.prestige = state.prestige || 0;
  state.party = state.party || [];
  // 파티가 비었거나 보유하지 않은 uid만 남았다면 최소 1명 보정.
  const owned = new Set((state.units || []).map((u) => u.uid));
  state.party = state.party.filter((uid) => owned.has(uid));
  if (state.party.length === 0 && state.units && state.units.length) {
    state.party = [state.units[0].uid];
  }
  // 진형: 편성된 유닛만 후열 지정 유지 (미편성 uid 정리).
  state.formation = state.formation || {};
  for (const uid of Object.keys(state.formation)) {
    if (!state.party.includes(uid)) delete state.formation[uid];
  }
  state.formationPresets = state.formationPresets || {};
  for (const u of state.units || []) {
    if (!u.skills) u.skills = [null, null, null];
    if (!u.enhance) u.enhance = { atk: 0, hp: 0, def: 0, crit: 0 };
    // 장비: 전 슬롯 보장(신규 슬롯 backfill). 기존 장착품은 유지.
    u.gear = { ...emptyGearSet(), ...(u.gear || {}) };
    if (u.characterId === undefined) u.characterId = null;
    if (u.signature === undefined) u.signature = null;
    if (u.element === undefined) u.element = null;
    if (u.intimacy === undefined) u.intimacy = 0;
    if (u.costume === undefined) u.costume = null;
    if (!u.costumeBonus) u.costumeBonus = {};
    if (u.skin === undefined) u.skin = null;
    if (!u.sigWeapon) u.sigWeapon = { level: 0 };
    if (u.sigAwaken === undefined) u.sigAwaken = 0;
    if (!u.runes) u.runes = [null, null, null];
    if (!u.star || u.star < 1) u.star = 1; // 성급 기본 1(구버전 세이브 보정)
  }
  return state;
}

// uid("u12"/"g3")를 스캔해 시퀀스를 끌어올린다 → 로드 후 신규 생성 충돌 방지.
function syncSeq(state) {
  let maxU = 0, maxG = 0, maxR = 0;
  const num = (id, pfx) => parseInt(String(id || '').replace(pfx, ''), 10) || 0;
  for (const u of state.units || []) {
    maxU = Math.max(maxU, num(u.uid, 'u'));
    for (const slot of Object.keys(u.gear || {})) {
      const it = u.gear[slot];
      if (it) maxG = Math.max(maxG, num(it.uid, 'g'));
    }
    for (const r of u.runes || []) if (r) maxR = Math.max(maxR, num(r.uid, 'r'));
  }
  for (const it of state.inventory || []) maxG = Math.max(maxG, num(it.uid, 'g'));
  for (const r of state.runeBag || []) maxR = Math.max(maxR, num(r.uid, 'r'));
  let maxM = 0;
  for (const m of state.mail || []) maxM = Math.max(maxM, num(m.id, 'm'));
  ensureUnitSeq(maxU);
  ensureGearSeq(maxG);
  ensureRuneSeq(maxR);
  ensureMailSeq(maxM);
}

// json → state (실패/버전불일치 시 null).
export function deserialize(json) {
  let obj;
  try { obj = JSON.parse(json); } catch { return null; }
  if (!obj || obj.v !== SAVE_VERSION || !obj.state) return null;
  const state = normalize(obj.state);
  syncSeq(state);
  return state;
}

// ─── 세이브 이관 코드 ────────────────────────────────────────
// 백엔드 없이 기기·계정 간 진행을 옮기는 휴대용 코드.
//   내보내기: 현재 세이브 → "ELD1:<base64>" 문자열(클립보드 공유)
//   불러오기: 그 코드 → state (검증 실패 시 null)
// UTF-8 안전 base64 (한글 캐릭터명 포함).
const CODE_PREFIX = 'ELD1:';
function toB64(s) {
  if (typeof Buffer !== 'undefined') return Buffer.from(s, 'utf8').toString('base64');
  const bytes = new TextEncoder().encode(s);
  let bin = ''; bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}
function fromB64(b) {
  if (typeof Buffer !== 'undefined') return Buffer.from(b, 'base64').toString('utf8');
  const bin = atob(b);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function exportCode(state) {
  return CODE_PREFIX + toB64(serialize(state));
}

export function importCode(code) {
  if (typeof code !== 'string') return null;
  const trimmed = code.trim();
  if (!trimmed.startsWith(CODE_PREFIX)) return null;
  let json;
  try { json = fromB64(trimmed.slice(CODE_PREFIX.length)); } catch { return null; }
  return deserialize(json);
}
