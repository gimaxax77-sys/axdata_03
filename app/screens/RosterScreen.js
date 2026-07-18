import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, useWindowDimensions, Animated, FlatList, Image } from 'react-native';
import { T, rarityMeta } from '../theme';
import { reducedMotion } from '../motion';
import GrowthPanel from './GrowthPanel';
import MetaScreen from './MetaScreen';

// 등급 순위(정렬용) — 인벤토리 상위 우선.
const RARITY_RANK = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };
// 등급 모듈 off면 등급 테두리는 중립색, 등급 라벨은 숨김(display:none).
function rarityColor(r) { return isOn('rarity') ? rarityMeta(r).color : T.line; }
// 등급 인라인 배지 스타일 — 다크 배경의 색텍스트는 대비가 약해, 등급색 배경 +
// 어두운 글자로 시인성을 확보한다(Text 중첩 유지, 레이아웃 영향 없음).
function rarityText(r) {
  if (!isOn('rarity')) return { display: 'none' };
  return { backgroundColor: rarityMeta(r).color, color: '#160f28', fontWeight: '900', fontSize: 11, borderRadius: 4, overflow: 'hidden' };
}
import { Card, Btn, fmt, MultiToggle, multLabel, repeat, Portrait, StarBadge, PowerBadge, pctW } from '../components';
import { isOn } from '../../system/core/features.mjs';
import { CodeTag } from '../uicode';

// 후보를 임시 장착했을 때의 실제 전투력 — 피커의 "변경 전후 비교"용.
//   (loadout.mjs 추천 로직과 동일 기법: 넣어보고 계산 후 원복)
function powerWithGearItem(unit, slot, item) {
  const prev = unit.gear[slot];
  unit.gear[slot] = item || null;
  const p = computePower(unit);
  unit.gear[slot] = prev;
  return p;
}
function powerWithRuneItem(unit, i, rune) {
  if (!unit.runes) unit.runes = [];
  const prev = unit.runes[i];
  unit.runes[i] = rune || null;
  const p = computePower(unit);
  unit.runes[i] = prev;
  return p;
}
// 전후 차이 표시 — 델타를 '채운 배지'로 강조(하향=빨강 배지+흰 글자, 상향=초록 배지).
function DeltaText({ cur, next }) {
  const d = next - cur;
  const up = d > 0, down = d < 0;
  const badge = {
    backgroundColor: up ? T.good : down ? T.danger : T.surface2,
    color: up ? '#0f2a17' : down ? '#ffffff' : T.muted,
    fontWeight: '900', fontSize: 12, borderRadius: 5, overflow: 'hidden',
  };
  return (
    <Text style={{ color: T.muted, fontWeight: '700', fontSize: 12, marginTop: 4 }}>
      전투력 {fmt(cur)} → <Text style={{ color: up ? T.good : down ? T.danger : T.text, fontWeight: '900' }}>{fmt(next)}</Text>
      {'  '}<Text style={badge}> {up ? '▲ +' : down ? '▼ -' : '± '}{fmt(Math.abs(d))} </Text>
    </Text>
  );
}
import { charImage } from '../charImages';
import { gearIcon } from '../uiIcons';
import { fx } from '../feedback';
import { togglePartyMember, MAX_PARTY, getPartyUnits, autoParty } from '../../system/core/gameState.mjs';
import { teamSynergy } from '../../system/core/synergy.mjs';
import { toggleFormation, formationSummary, autoFormation, ROLE_CAP, ROLE_LABEL, FORMATION_ROLES } from '../../system/core/formation.mjs';
import { savePreset, loadPreset, presetInfo, PRESET_SLOTS } from '../../system/core/partyPresets.mjs';
import { computeStats, computePower, powerBreakdown } from '../../system/core/stats.mjs';
import { levelCap } from '../../system/core/units.mjs';
import { skillSlots, SKILL_CATALOG, equippableSkills, skillPower } from '../../system/core/skills.mjs';
import { identity, elementMeta } from '../../system/concepts/index.mjs';
import { GEAR_SLOTS, GEAR_CATALOG, SLOT_META, gearEnhanceCost, gearContribution } from '../../system/core/gear.mjs';
import { levelUp, ascend, ascendCost, enhanceNode, equipSkill, unequipSkill, upgradeSkill, awakenSignature } from '../../system/core/character.mjs';
import { AWAKEN_MAX, awakenCost } from '../../system/core/skills.mjs';
import { craftGear, equipGear, enhanceGear, unequipGear, gearCraftCost, activeGearSets, rerollGearSubs, GEAR_RARITY, grantGearElementOption, ELEM_OPTION_COST, GEAR_SUB_MAX, enchantGear, rerollEnchant, enchantInfo, enchantCost, ENCHANT_MAX } from '../../system/core/gear.mjs';
import { materialCount, MATERIAL_META } from '../../system/core/materials.mjs';
import { optimizeLoadout } from '../../system/core/loadout.mjs';
import { recordMission } from '../../system/core/daily.mjs';
import { intimacyLevel, intimacyProgress, giftCost, giveGift, INTIMACY_MAX } from '../../system/core/intimacy.mjs';
import { seedConditions, seedProgress } from '../../system/core/seed.mjs';
import { starOf, STAR_MAX, starUpInfo, starUp, availableDupes } from '../../system/core/starGrade.mjs';

// 후보 성급으로 올렸을 때의 전투력(성급 강화 델타 미리보기용) — 넣어보고 원복.
function powerWithNextStar(unit) {
  const prev = unit.star;
  unit.star = starOf(unit) + 1;
  const p = computePower(unit);
  unit.star = prev;
  return p;
}
import { linesOf, sigWeaponOf } from '../../system/concepts/index.mjs';
import { costumesFor, equipCostume as equipSkin, unequipCostume as unequipSkin, refreshCostumeUnlocks, SOURCE_LABEL } from '../../system/core/costumes.mjs';
import { combatContributions } from '../../system/core/resolution.mjs';
import { playStage } from '../../system/core/difficulty.mjs';
import { accountMods } from '../../system/core/balance.mjs';
import { exportBuild, encodeBuild, applyBuildCode } from '../../system/core/buildcopy.mjs';
import {
  hasSigWeapon, canOwnSigWeapon, unlockSigWeapon, enhanceSigWeapon,
  sigWeaponUnlockCost, sigWeaponEnhanceCost, sigWeaponBoost, SIGWEAPON_MAX,
} from '../../system/core/sigweapon.mjs';
import {
  RUNE_SLOTS, RUNE_SETS, RUNE_RARITY, summonRune, equipRune, unequipRune,
  enhanceRune, runeMainValue, runeEnhanceCost, RUNE_MAX_LEVEL, RUNE_SUMMON_COST, activeRuneSets, rerollRuneSubs,
} from '../../system/core/runes.mjs';

const SLOT_KO = Object.fromEntries(Object.entries(SLOT_META).map(([k, v]) => [k, v.label]));
// 장비 카드 계열 그룹핑(표시 순서·소제목).
const GEAR_CATS = [
  { cat: 'weapon', label: '무기' },
  { cat: 'armor', label: '방어구' },
  { cat: 'accessory', label: '장신구' },
  { cat: 'mount', label: '탈것' },
];

// 코스튬 미보유 시 획득 조건 안내.
function costumeNeedText(cos, concept) {
  const n = cos.need || {};
  if (cos.source === 'summon') return '코스튬 소환으로 획득';
  if (cos.source === 'quest') return `스토리 ${n.campaign}챕터 클리어`;
  if (cos.source === 'vip') return `과금 등급 VIP ${n.vip}`;
  if (cos.source === 'power') return `영웅 전투력 ${fmt(n.power)}`;
  if (cos.source === 'element') {
    const em = elementMeta(concept, n.element);
    return `${em?.emoji || ''}${em?.name || n.element} 속성 전투력 ${fmt(n.power)}`;
  }
  return SOURCE_LABEL[cos.source] || cos.source;
}

// 스탯 → 아이콘(룬·장비·스킬 표기 일관). 이름 대신 아이콘으로 간결·시각화.
const STAT_ICON = {
  atk: '⚔️', hp: '❤️', def: '🛡️', spd: '👟',
  critChance: '💥', critDamage: '💥💥', lifesteal: '🩸', defPierce: '🏹',
  dmgReduce: '🧱', evasion: '🌀', accuracy: '🎯', trueDamage: '⚡', absDef: '🔰',
};
function statIcon(key) { return STAT_ICON[key] || String(key).toUpperCase(); }
// 치명피해(💥💥)만 겹쳐 보이도록 음수 자간 적용 — 문자열을 Text 자식 배열로 변환.
//   critDamage가 없으면 원문 문자열 그대로 반환(오버헤드 0).
function ov(text) {
  const s = String(text);
  if (!s.includes('💥💥')) return s;
  const segs = s.split('💥💥');
  const out = [];
  segs.forEach((seg, i) => {
    if (seg) out.push(seg);
    if (i < segs.length - 1) out.push(<Text key={`cd${i}`} style={{ letterSpacing: -10 }}>💥💥</Text>);
  });
  return out;
}

// 효과 객체 → 사람이 읽는 문자열 (scale = 스킬 레벨/랭크 배수)
function describeEffect(e = {}, scale = 1) {
  const p = [];
  const order = ['critChance', 'critDamage', 'lifesteal', 'defPierce', 'dmgReduce', 'evasion', 'accuracy', 'trueDamage', 'absDef'];
  for (const k of order) if (e[k]) p.push(`${statIcon(k)} +${Math.round(e[k] * scale * 100)}%`);
  return p;
}
// scale: 스킬 레벨/랭크 배수. 강화 시 실제 반영되는 수치를 그대로 보여준다.
function describeSkill(id, scale = 1) {
  const s = SKILL_CATALOG[id];
  const p = [];
  if (s.statPct) for (const [k, v] of Object.entries(s.statPct)) p.push(`${statIcon(k)} +${Math.round(v * scale * 100)}%`);
  p.push(...describeEffect(s.effect, scale));
  p.push(...describeTeamBuff(s.teamBuff, scale));
  return p.join(' · ');
}
// 팀버프 3종 표시 (공격/피해경감/치명)
function describeTeamBuff(tb = {}, scale = 1) {
  const p = [];
  if (tb.atk) p.push(`팀 ⚔️ +${Math.round(tb.atk * scale * 100)}%`);
  if (tb.def) p.push(`팀 🛡️ +${Math.round(tb.def * scale * 100)}%`);
  if (tb.critChance) p.push(`팀 🎯 +${Math.round(tb.critChance * scale * 100)}%`);
  return p;
}
// 설계도 기준(강화 전 Lv1) 표시 — 제작 미리보기용.
function describeGear(bp) {
  const p = [];
  for (const [k, v] of Object.entries(bp.flat || {})) p.push(`${statIcon(k)} +${v}`);
  p.push(...describeEffect(bp.effect));
  return p.join(' · ');
}
// 실제 장비 인스턴스(강화 레벨 + 등급 배수 + 부옵션 반영) 표시.
function describeGearItem(item) {
  const c = gearContribution(item);
  const p = [];
  for (const [k, v] of Object.entries(c.flat)) p.push(`${statIcon(k)} +${Math.round(v)}`);
  for (const [k, v] of Object.entries(c.statPct)) p.push(`${statIcon(k)} +${Math.round(v * 100)}%`);
  p.push(...describeEffect(c.effect));
  return p.join(' · ');
}
// 장비 부옵션만 (재련 대상 강조용).
function describeSubs(subs = []) {
  return subs.map((s) => `${statIcon(s.key)} +${Math.round(s.value * 100)}%`).join(' · ');
}
// 시그니처 각성 2차 효과 설명
function describeAwaken(a = {}) {
  const p = [];
  if (a.statPct) for (const [k, v] of Object.entries(a.statPct)) p.push(`${statIcon(k)} +${Math.round(v * 100)}%`);
  p.push(...describeEffect(a.effect));
  p.push(...describeTeamBuff(a.teamBuff));
  return p.join(' · ');
}
// 룬 한 개 요약 (메인스탯 + 등급 + 부옵션)
function describeRune(rune) {
  const set = RUNE_SETS[rune.set];
  const val = runeMainValue(rune);
  const stat = statIcon(set.main.stat);
  const pct = `${(val * 100).toFixed(1)}%`;
  const subTxt = (rune.subs || []).length ? ` · ${describeSubs(rune.subs)}` : '';
  return { title: `${set.emoji} ${set.label} +${rune.level}`, sub: `${stat} ${pct}${subTxt}`, rarity: rune.rarity, rarityLabel: RUNE_RARITY[rune.rarity].label };
}

// 영웅 탭 최상위 서브탭 — 영웅(그리드+상세) · 편성(파티·진형) · 성장(펫·유물·엠블럼·정령).
const ROSTER_TABS = [
  { key: 'heroes', label: '영웅', icon: '🦸' },
  { key: 'party', label: '편성', icon: '⚔️' },
  { key: 'growth', label: '성장', icon: '🌱' },
  { key: 'meta', label: '기록', icon: '📖' },
];

// 캐릭터 상세 서브탭 — 9개 세로 스택을 목적별 4묶음으로.
//   성장: 친밀도·씨앗·성장(레벨/돌파/각인) · 장비: 룬·전용무기·장비
//   스킬: 전용스킬·스킬편성 · 꾸미기: 코스튬
const DETAIL_TABS = [
  { key: 'growth', label: '육성', icon: '📈' },
  { key: 'gear', label: '장비', icon: '⚔️' },
  { key: 'skill', label: '스킬', icon: '✨' },
  { key: 'cosmetic', label: '꾸미기', icon: '🎭' },
];

export default function RosterScreen({ state, bump, concept }) {
  const [selId, setSel] = useState(state.party[0] || state.units[0]?.uid);
  const [rtab, setRtab] = useState('heroes'); // 영웅 탭 최상위 서브탭
  const [dtab, setDtab] = useState('growth'); // 상세 서브탭
  const [picker, setPicker] = useState(null); // {mode:'skill'|'gear', slot}
  const [bubble, setBubble] = useState(null); // 현재 대사
  const [mult, setMult] = useState(1); // 성장 배수 (×1/×10/×100)
  const [recMsg, setRecMsg] = useState(null); // 추천 장착 결과 메시지
  const [showBd, setShowBd] = useState(false); // 전투력 분해 표 펼침
  const [expand, setExpand] = useState(null); // 육성 요약 타일 펼침: 'inti' | 'seed' | null
  const [showDps, setShowDps] = useState(false); // DPS 미터 펼침
  const [deckMsg, setDeckMsg] = useState(null); // 덱 복사/붙여넣기 결과
  const [starMsg, setStarMsg] = useState(null); // 성급 강화 결과(육성 탭 성급 카드 내 표시)
  const [deckCode, setDeckCode] = useState(''); // 붙여넣기 입력 코드
  // 영웅 그리드 5열 고정 — 화면폭에서 좌우 패딩(14×2)·열간격(10×4)을 뺀 뒤 5등분.
  const { width: winW } = useWindowDimensions();
  const GRID_COLS = 5, GRID_GAP = 8;
  const chipW = Math.floor((winW - 28 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
  // 무거운 하단 카드(씨앗·전용무기·룬·스킬·장비·성장)는 첫 페인트 뒤에 렌더
  // → 탭 전환 시 상단(파티·상세)이 즉시 뜨고 렉이 사라진다.
  const [heavy, setHeavy] = useState(false);
  useEffect(() => { const t = setTimeout(() => setHeavy(true), 0); return () => clearTimeout(t); }, []);
  const unit = state.units.find((u) => u.uid === selId) || state.units[0];
  const lines = unit && linesOf(concept, unit);
  // 선택 캐릭터가 바뀌면 인사 대사로 초기화
  useEffect(() => { setBubble(lines ? lines.greet : null); }, [selId]);
  // 서브탭 전환 시 스크롤 최상단으로.
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: false }); }, [rtab]);
  // 캐릭터 전환 시 성급 강화 결과 메시지 초기화(이전 캐릭 메시지 잔류 방지).
  useEffect(() => { setStarMsg(null); }, [unit.uid]);
  // "차르륵" — 영웅 탭 진입 시 최상위 서브탭(영웅/편성)이 순차 등장.
  const rAnims = useRef(ROSTER_TABS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (reducedMotion()) { rAnims.forEach((a) => a.setValue(1)); return; }
    rAnims.forEach((a) => a.setValue(0));
    Animated.stagger(70, rAnims.map((a) =>
      Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }),
    )).start();
  }, []);
  // "차르륵" — 캐릭터 선택 시 상세 서브탭이 좌→우로 순차 등장(콘텐츠 탭과 동일 규약).
  const dAnims = useRef(DETAIL_TABS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (reducedMotion()) { dAnims.forEach((a) => a.setValue(1)); return; }
    dAnims.forEach((a) => a.setValue(0));
    Animated.stagger(55, dAnims.map((a) =>
      Animated.timing(a, { toValue: 1, duration: 280, useNativeDriver: true }),
    )).start();
  }, [selId]); // 유닛이 바뀔 때마다 재생.
  // 전투력 정렬 — computePower를 유닛당 1회만 계산(캐시)해 O(n log n) 중복 제거.
  // 매 렌더 최신 반영하되 계산은 유닛 수(N)회로 고정.
  const list = (() => {
    const pw = new Map();
    const powerOf = (u) => { let v = pw.get(u.uid); if (v === undefined) { v = computePower(u); pw.set(u.uid, v); } return v; };
    return state.units.slice().sort((a, b) => powerOf(b) - powerOf(a));
  })();
  // 동일 캐릭터는 한 슬롯으로 묶고 수량 표기(대표=최강 인스턴스).
  const grouped = [];
  const seen = new Map();
  for (const u of list) {
    const key = u.characterId || u.uid;
    if (seen.has(key)) seen.get(key).count++;
    else { const gitem = { rep: u, count: 1 }; seen.set(key, gitem); grouped.push(gitem); }
  }
  // 정렬: 편성된 영웅을 맨 앞으로, 그 외는 등급(높은 순) → 전투력 순.
  const partyChars = new Set(state.party.map((uid) => {
    const u = state.units.find((x) => x.uid === uid);
    return u ? (u.characterId || u.uid) : null;
  }));
  const powCache = new Map();
  const powOf = (u) => { let v = powCache.get(u.uid); if (v === undefined) { v = computePower(u); powCache.set(u.uid, v); } return v; };
  grouped.sort((a, b) => {
    const ap = partyChars.has(a.rep.characterId || a.rep.uid) ? 1 : 0;
    const bp = partyChars.has(b.rep.characterId || b.rep.uid) ? 1 : 0;
    if (ap !== bp) return bp - ap; // 편성 영웅 우선
    const ar = RARITY_RANK[a.rep.rarity] || 0;
    const br = RARITY_RANK[b.rep.rarity] || 0;
    if (ar !== br) return br - ar; // 등급 높은 순
    return powOf(b.rep) - powOf(a.rep); // 전투력 순
  });
  const inParty = state.party.includes(unit.uid);
  refreshCostumeUnlocks(state); // 조건 충족 코스튬 자동 지급(퀘스트/VIP/전투력)

  const act = (fn) => { fn(); bump(); };
  // 덱 복사(내 편성 → 코드) / 붙여넣기(코드 → 내 파티 위치별 적용).
  const doCopyDeck = () => {
    const code = encodeBuild(exportBuild(state));
    setDeckCode(code); setDeckMsg('📋 현재 덱 코드를 아래 칸에 생성 — 복사해 공유하세요');
    fx('success');
  };
  const doPasteDeck = () => {
    const r = applyBuildCode(state, deckCode.trim());
    if (r.ok) { fx('success'); setDeckMsg(`✅ 덱 적용 · 자리 ${r.applied} · 스킬 ${r.skills}`); }
    else { fx('error'); setDeckMsg('❌ 잘못된 덱 코드'); }
    bump();
  };
  // 성장 액션은 일일 미션(강화) 진행에 카운트. mult 배수만큼 반복 실행.
  const grow = (fn) => { const n = repeat(fn, mult); if (n > 0) { recordMission(state, 'upgrade', n); fx('success'); } else { fx('error'); } bump(); };
  // 레벨업/돌파 탭 카드용 — 배수 선택 없이 탭한 수량(n)만큼 바로 실행.
  const growN = (fn, n) => { const c = repeat(fn, n); if (c > 0) { recordMission(state, 'upgrade', c); fx('success'); } else { fx('error'); } bump(); };
  // 추천 장착 — 결과를 명확히 메시지로 알려준다("왜 안 됐는지" 포함).
  const runRecommend = (scope) => {
    const r = optimizeLoadout(state, unit.uid, scope);
    const c = r.ok ? r.changed : { skills: 0, gear: 0, runes: 0 };
    const parts = [];
    if (c.skills) parts.push(`스킬 ${c.skills}`);
    if (c.gear) parts.push(`장비 ${c.gear}`);
    if (c.runes) parts.push(`룬 ${c.runes}`);
    if (parts.length) { setRecMsg(`✅ ${parts.join(' · ')} 최적 장착!`); fx('success'); }
    else {
      const emptyGear = GEAR_SLOTS.filter((s) => !unit.gear[s]).length;
      if (scope !== 'skill' && emptyGear > 0) setRecMsg('⚠ 골드가 부족해 장비를 제작할 수 없어요');
      else setRecMsg('이미 최적입니다 · 던전/제작으로 더 나은 장비를 구해보세요');
      fx('error');
    }
    bump();
  };
  const st8 = computeStats(unit);
  const meta = identity(concept, unit);
  const arch = concept.archetypes[unit.archetype] || { name: unit.archetype, emoji: '❔' };
  const em = meta.element && elementMeta(concept, meta.element);
  const atCap = unit.level >= levelCap(unit);
  const slots = skillSlots(unit);

  return (
    <View style={g.flex}>
    <ScrollView ref={scrollRef} style={g.flex} contentContainerStyle={g.wrap}>
      {rtab === 'party' && (
      /* 파티 편성 — 전투는 편성된 전원 합산 */
      <Card style={{ marginBottom: 12 }}>
        <CodeTag id="g1" corner="tl" />
        <View style={g.intiHead}>
          <Text style={g.sec}>파티 편성 <Text style={g.dim}>{state.party.length}/{MAX_PARTY}</Text></Text>
          <Btn small kind="ghost" label="🎯 자동편성" onPress={() => {
            // 편성(누가 들어갈지)까지 새로 채운다 — 기존 수동 편성을 덮어씀.
            const rp = autoParty(state);
            const r = rp.ok ? autoFormation(state) : rp;
            const synTxt = rp.ok && rp.synergy?.length ? ` · ✦${rp.synergy.join('·')}` : '';
            setDeckMsg(r.ok ? `🎯 자동편성 완료 · 보유영웅 중 ${state.party.length}명 선발${synTxt}` : `⚠ ${r.reason}`);
            fx(r.ok ? 'success' : 'error'); bump();
          }} />
        </View>
        <Text style={g.dim}>전투는 편성 전원 합산 · 자동편성은 현재 편성을 대체합니다</Text>
        <View style={g.partyRow}>
          {Array.from({ length: MAX_PARTY }).map((_, i) => {
            const uid = state.party[i];
            const pu = uid && state.units.find((u) => u.uid === uid);
            const pm = pu && identity(concept, pu);
            return (
              <TouchableOpacity key={i} activeOpacity={0.8}
                onPress={() => pu && setSel(pu.uid)}
                style={[g.partySlot, pu && g.partySlotOn, pu && pu.uid === unit.uid && g.partySlotSel]}>
                {pu ? (<>
                  <Portrait emoji={pm.emoji} image={charImage(concept.id, pu.characterId)} rarity={pu.rarity} size={44} />
                  <Text style={g.partyName} numberOfLines={1}>{pm.name}</Text>
                </>) : <Text style={g.partyEmpty}>＋</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
        {/* 팀 시너지 — 편성 구성 보너스 */}
        {(() => {
          const syn = teamSynergy(getPartyUnits(state));
          if (!syn.list.length) return <Text style={g.synNone}>시너지 없음 — 3원형/동일 속성/전원 다른 속성으로 보너스</Text>;
          return (
            <View style={g.synWrap}>
              <CodeTag id="g2" corner="tr" />
              {syn.list.map((s) => (
                <View key={s.id} style={g.synChip}><Text style={g.synChipText}>✦ {s.label}</Text><Text style={g.synChipDesc}>{s.desc}</Text></View>
              ))}
            </View>
          );
        })()}
        {/* 진형 — 전열(방어벽)·중열(균형)·후열(보호받는 딜러). 전열2·중열3·후열2 정원. */}
        {(() => {
          const sum = formationSummary(state);
          const groups = { front: sum.front, mid: sum.mid, back: sum.back };
          const chipStyle = { front: g.formFront, mid: g.formMid, back: g.formBack };
          return (
            <View style={g.formWrap}>
              <CodeTag id="g3" corner="tr" />
              <View style={g.intiHead}>
                <Text style={g.formTitle}>⚔️ 진형</Text>
                <Btn small kind="ghost" label="🪄 위치 재배치" onPress={() => {
                  // 편성(누가 들어갈지)은 그대로 두고, 이미 편성된 인원의 위치만 재배치한다.
                  const r = autoFormation(state);
                  setDeckMsg(r.ok ? '🪄 위치 재배치 완료 · 탱커 전열 · 딜러 후열' : `⚠ ${r.reason}`);
                  fx(r.ok ? 'success' : 'error'); bump();
                }} />
              </View>
              <Text style={g.dim}>전열 방어↑ · 중열 균형 · 후열 공격↑</Text>
              {FORMATION_ROLES.map((role) => (
                <View key={role} style={g.formGroup}>
                  <Text style={g.formGroupLabel}>{ROLE_LABEL[role]} <Text style={g.dim}>{groups[role].length}/{ROLE_CAP[role]}</Text></Text>
                  <View style={g.formRow}>
                    {groups[role].length === 0 && <Text style={g.formEmpty}>비어있음</Text>}
                    {groups[role].map((uid) => {
                      const u = state.units.find((x) => x.uid === uid);
                      if (!u) return null;
                      const pm = identity(concept, u);
                      return (
                        <TouchableOpacity key={uid} activeOpacity={0.8}
                          onPress={() => {
                            const r = toggleFormation(state, uid);
                            if (!r.ok) { fx('error'); setDeckMsg(`⚠ ${r.reason}`); }
                            bump();
                          }}
                          style={[g.formChip, chipStyle[role]]}>
                          <Text style={g.formName} numberOfLines={1}>{pm.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              {sum.exposed
                ? <Text style={g.formWarn}>⚠️ 전열이 없어 중열·후열이 노출됨 — 공격 보너스 상실</Text>
                : sum.active
                  ? <Text style={g.formOk}>진형 발동 · 탭하여 전열→중열→후열 순환</Text>
                  : <Text style={g.dim}>전원 전열(균형). 탭하여 배치 변경</Text>}
            </View>
          );
        })()}
        {/* DPS 미터 — 누가 딜/생존을 담당하는지 분석(덱 수정 근거) */}
        {getPartyUnits(state).length > 0 && (
          <View style={g.dpsWrap}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowDps((v) => !v)}>
              <Text style={g.dpsToggle}>📊 전투 통계(DPS) {showDps ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showDps && (() => {
              const cc = combatContributions(getPartyUnits(state), playStage(state).challenge, accountMods(state), state.formation);
              return (
                <View style={{ marginTop: 6 }}>
                  {cc.units.map((r) => {
                    const u = state.units.find((x) => x.uid === r.uid);
                    const pm = u && identity(concept, u);
                    return (
                      <View key={r.uid} style={g.dpsRow}>
                        <Text style={g.dpsName} numberOfLines={1}>{pm ? pm.name : r.uid}</Text>
                        <View style={g.dpsBarTrack}><View style={[g.dpsBarFill, { width: `${pctW(r.dpsShare * 100)}%` }]} /></View>
                        <Text style={g.dpsPct}>{pctW(Math.round(r.dpsShare * 100))}%</Text>
                      </View>
                    );
                  })}
                  <Text style={g.dim}>딜 비중 · 상성 반영. 낮은 딜러는 육성/교체 대상.</Text>
                </View>
              );
            })()}
          </View>
        )}
        {/* 편성 프리셋(1~5) — 탭하면 불러오기, 길게 누르면 현재 편성을 저장 */}
        <View style={g.presetWrap}>
          <CodeTag id="g4" corner="tr" />
          <Text style={g.formGroupLabel}>💾 편성 프리셋 <Text style={g.dim}>탭=불러오기 · 길게=저장</Text></Text>
          <View style={g.presetRow}>
            {Array.from({ length: PRESET_SLOTS }, (_, i) => i + 1).map((slot) => {
              const info = presetInfo(state, slot);
              return (
                <TouchableOpacity key={slot} activeOpacity={0.8}
                  style={[g.presetChip, info.exists && g.presetChipOn]}
                  onPress={() => {
                    const r = loadPreset(state, slot);
                    if (r.ok) setDeckMsg(`📥 ${slot}번 편성 불러옴 · ${r.applied}명${r.missing ? ` (제외 ${r.missing}명)` : ''}`);
                    else setDeckMsg(`⚠ ${r.reason}`);
                    fx(r.ok ? 'success' : 'error'); bump();
                  }}
                  onLongPress={() => {
                    const r = savePreset(state, slot);
                    setDeckMsg(r.ok ? `💾 ${slot}번에 현재 편성(${r.count}명) 저장` : `⚠ ${r.reason}`);
                    fx(r.ok ? 'success' : 'error'); bump();
                  }}>
                  <Text style={[g.presetNum, info.exists && g.presetNumOn]}>{slot}</Text>
                  <Text style={g.presetSub}>{info.exists ? `${info.count}명` : '비어있음'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        {/* 원클릭 덱 복사/붙여넣기(로컬) */}
        <View style={g.deckWrap}>
          <CodeTag id="g5" corner="tr" />
          <View style={g.deckBtns}>
            <Btn small kind="ghost" label="📋 덱 복사" onPress={doCopyDeck} />
            <Btn small kind="ghost" label="📥 덱 적용" disabled={!deckCode.trim()} onPress={doPasteDeck} />
          </View>
          <TextInput style={g.deckInput} value={deckCode} onChangeText={setDeckCode}
            placeholder="덱 코드 붙여넣기(DECK1:...)" placeholderTextColor={T.muted} autoCapitalize="none" />
          {deckMsg ? <Text style={g.deckMsg}>{deckMsg}</Text> : null}
        </View>
      </Card>
      )}

      {rtab === 'heroes' && (<>
      {/* 보유 유닛 — 6열 아이콘 그리드(줄바꿈, 가로 스크롤 없음). 종 단위로 묶여 밀도 유지. */}
      <Text style={g.sec}>보유 {concept.terms.unit} <Text style={g.dim}>({grouped.length}종{list.length > grouped.length ? ` · ${list.length}` : ''})</Text></Text>
      <View style={g.rosterGrid}>
        <CodeTag id="b1" corner="tl" />
        {grouped.map(({ rep: u, count }) => {
          const m = identity(concept, u);
          const on = u.uid === unit.uid;
          const party = state.party.includes(u.uid);
          return (
            <View key={u.uid} style={g.rosterCell}>
              <TouchableOpacity onPress={() => setSel(u.uid)} style={[g.rosterTile, on && g.rosterTileOn]} activeOpacity={0.8}>
                {party && <Text style={g.rosterStar}>⭐</Text>}
                {count > 1 && <Text style={g.rosterCount}>×{count}</Text>}
                <Portrait emoji={m.emoji} image={charImage(concept.id, u.characterId)} rarity={u.rarity} size={44} badge />
                <Text style={g.rosterTileLv} numberOfLines={1}>Lv.{u.level}{starOf(u) > 1 ? `·${starOf(u)}★` : ''}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* 상세 */}
      <Card style={{ marginTop: 6 }}>
        <View style={g.head}>
          <View style={{ flex: 1 }}>
            {/* 이름 옆 빈 공간에 전투력 배지를 배치(별도 카드로 한 줄 차지하지 않음) */}
            <View style={g.nameRow}>
              <View style={g.nameWrap}>
                <CodeTag id="b2" corner="tl" />
                <Text style={g.headName} numberOfLines={1}>{meta.name}</Text>
                {isOn('rarity') && unit.rarity ? (
                  <View style={[g.rarPill, { backgroundColor: rarityMeta(unit.rarity).color }]}>
                    <Text style={g.rarPillText}>{unit.rarity}</Text>
                  </View>
                ) : null}
              </View>
              <CodeTag id="b3" corner="tr" />
              <PowerBadge power={computePower(unit)} expanded={showBd} onPress={() => setShowBd((v) => !v)} />
            </View>
            {/* 별 배지 + 성급·레벨·랭크를 한 줄로 압축(이전엔 별도 줄이었음) */}
            <View style={g.starRow}>
              <CodeTag id="b4" corner="tl" />
              <StarBadge tier={starOf(unit)} size={22} />
              <Text style={g.starRowNum}>{starOf(unit)}성급{starOf(unit) >= STAR_MAX ? ' MAX' : ''}<Text style={g.starRowSub}> · Lv.{unit.level}/{levelCap(unit)} · R{unit.rank}</Text></Text>
            </View>
          </View>
          {/* 편성 버튼 옆 빈 공간에 칭호·성격·속성을 배치(별도 줄로 빼지 않음) */}
          <View style={g.headSide}>
            <CodeTag id="b5" corner="tr" />
            <Btn small kind={inParty ? 'ghost' : 'gold'}
              label={inParty ? '편성 해제' : '편성'}
              disabled={!inParty && state.party.length >= MAX_PARTY}
              onPress={() => act(() => togglePartyMember(state, unit.uid))} />
            {(meta.title || meta.personality || meta.element) && (
              <Text style={g.headTitle} numberOfLines={1}>
                {meta.element ? `${elementMeta(concept, meta.element).emoji} ` : ''}
                {meta.title}{meta.personality ? ` · ${meta.personality}` : ''}
              </Text>
            )}
          </View>
        </View>
        <View style={g.statGrid}>
          <CodeTag id="b6" corner="tl" />
          {[['HP', st8.hp], ['ATK', st8.atk], ['DEF', st8.def], ['SPD', st8.spd]].map(([k, v]) => (
            <View key={k} style={g.stat}><Text style={g.statK}>{k}</Text><Text style={g.statV}>{fmt(v)}</Text></View>
          ))}
        </View>
        {deckMsg ? <Text style={g.deckMsg}>{deckMsg}</Text> : null}

        {/* 전투력 수치비례표 — 각 요소가 전투력에 기여하는 점수·비율(회피성 효과 포함) */}
        {showBd && (() => {
          const bd = powerBreakdown(unit);
          const EFF_KO = { critChance: '치명', critDamage: '치명피해', lifesteal: '흡혈', defPierce: '관통', dmgReduce: '피해감소', evasion: '회피', accuracy: '명중', trueDamage: '절대공격', absDef: '절대방어' };
          const rows = [
            ['체력', bd.stats.hp], ['공격', bd.stats.atk], ['방어', bd.stats.def], ['속도', bd.stats.spd],
            ...Object.entries(bd.effects).filter(([, v]) => v > 0).map(([k, v]) => [EFF_KO[k] || k, v]),
          ].sort((a, b) => b[1] - a[1]);
          return (
            <View style={g.bdBox}>
              <Text style={g.bdTitle}>전투력 기여 분해 <Text style={g.dim}>· 합계 {fmt(bd.total)}</Text></Text>
              {rows.map(([label, val]) => {
                const pct = bd.total > 0 ? (val / bd.total) * 100 : 0;
                return (
                  <View key={label} style={g.bdRow}>
                    <Text style={g.bdLabel}>{label}</Text>
                    <View style={g.bdBarTrack}><View style={[g.bdBarFill, { width: `${pctW(pct)}%` }]} /></View>
                    <Text style={g.bdVal}>{fmt(Math.round(val))}</Text>
                    <Text style={g.bdPct}>{pct.toFixed(0)}%</Text>
                  </View>
                );
              })}
            </View>
          );
        })()}

        {/* 레벨업/돌파/각인 — 영웅 카드 안에서 바로(탭 전환 없이). 직업 소개 카드는 제거(이름줄과 중복). */}
        <View style={g.growBox}>
          {/* 배수 선택 없이 레벨업 x1/x10/x100/Max·돌파를 탭 카드 5개로 바로 실행(높이는 기존 버튼 줄과 동일). */}
          <View style={g.btnRow}>
            <CodeTag id="b7" corner="tl" />
            {atCap ? (
              <View style={{ flex: 1 }}><Btn small tiny kind="gold" label="상한" disabled /></View>
            ) : [
              ['Lv. up', 1], ['x10', 10], ['x100', 100], ['Max', 'Max'],
            ].map(([label, n]) => (
              <View key={label} style={{ flex: 1 }}>
                <Btn small tiny kind="gold" label={label} onPress={() => growN(() => levelUp(state, unit.uid), n)} />
              </View>
            ))}
            <View style={{ flex: 1 }}><Btn small tiny kind="primary" label="Ascend" onPress={() => growN(() => ascend(state, unit.uid), 1)} /></View>
          </View>
          {(() => {
            const need = ascendCost(unit).summon;
            const have = state.wallet.summon || 0;
            const dupeN = availableDupes(state, unit).length;
            return (
              <Text style={g.ascHint}>
                🎟️ 소환석 {fmt(have)} · 이번 돌파 필요 {fmt(need)}
                {have < need ? ` (부족 시 동일 영웅 중복 소모 · 보유 ${dupeN}명)` : ''}
              </Text>
            );
          })()}
          <View style={g.btnRow}>
            <CodeTag id="b8" corner="tl" />
            {['atk', 'hp', 'def', 'crit'].map((s2) => (
              <View key={s2} style={{ flex: 1 }}>
                <Btn small kind="ghost" label={`${statIcon(s2 === 'crit' ? 'critChance' : s2)}+${unit.enhance[s2]}`} onPress={() => grow(() => enhanceNode(state, unit.uid, s2))} />
              </View>
            ))}
          </View>
        </View>
      </Card>

      {/* 상세 서브탭 바 — 성장/장비/스킬/꾸미기. 선택 캐릭터 진입 시 차르륵 순차 등장. */}
      <View style={g.dtabBar}>
        <CodeTag id="b10" corner="tl" />
        {DETAIL_TABS.map((tb, i) => {
          const on = dtab === tb.key;
          return (
            <Animated.View key={tb.key} style={{ flex: 1, opacity: dAnims[i], transform: [
              { translateY: dAnims[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
              { scale: dAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            ] }}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => { fx('tap'); setDtab(tb.key); }}
                style={[g.dtabCell, on && g.dtabCellOn]}
                accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tb.label}>
                <Text style={[g.dtabIcon, on && g.dtabIconOn]}>{tb.icon}</Text>
                <Text style={[g.dtabLabel, on && g.dtabLabelOn]}>{tb.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* 성급 강화 — 육성 요소로 이동(레벨업 아래에서 옮김). 요약 타일보다 위에 둬야
          친밀도·씨앗 아코디언이 타일 바로 아래에서 열린다. */}
      {dtab === 'growth' && (() => {
        const si = starUpInfo(state, unit);
        const curP = computePower(unit);
        return (
          <Card style={{ marginTop: 8 }}>
            <CodeTag id="c3" corner="tr" />
            <View style={g.intiHead}>
              <View style={g.starPreviewRow}>
                <Text style={g.sec}>⭐ 성급 {si.star}★{si.maxed ? '' : ` → ${si.star + 1}★`}</Text>
                {!si.maxed && <StarBadge tier={si.star + 1} size={22} />}
              </View>
              <Text style={g.dim}>{si.maxed ? `최고 ${STAR_MAX}★` : `중복 ${si.haveDupes}/${si.req.dupes} · 🪙${fmt(si.req.currency)}`}</Text>
            </View>
            {!si.maxed && si.identified && <DeltaText cur={curP} next={powerWithNextStar(unit)} />}
            <View style={{ height: 6 }} />
            <Btn small kind="gold" disabled={!si.canUp}
              label={si.maxed ? `MAX ${STAR_MAX}★` : !si.identified ? '성급 강화 불가(정체성 없음)'
                : !si.enoughDupes ? `중복 영웅 ${si.req.dupes}명 필요`
                : !si.enoughGold ? '골드 부족' : `성급 강화 (${si.star}★ → ${si.star + 1}★)`}
              onPress={() => {
                const r = starUp(state, unit.uid);
                setStarMsg(r.ok ? `⭐ ${r.star}★ 달성! 중복 ${r.consumed}명 합성` : `⚠ ${r.reason}`);
                fx(r.ok ? 'success' : 'error'); bump();
              }} />
            {starMsg ? <Text style={g.starResult}>{starMsg}</Text> : null}
            {!si.maxed && si.identified && <Text style={g.starHint}>중복 영웅을 합성해 별을 올립니다 · 약한 중복부터 소모(장비·룬은 회수)</Text>}
          </Card>
        );
      })()}

      {/* 친밀도·씨앗 — 한 줄 반반 요약 타일. 탭하면 아래로 상세 펼침(아코디언). */}
      {dtab === 'growth' && (() => {
        const sp = seedProgress(unit);
        const hasInti = !!lines;
        if (!hasInti && !sp.hasSeed) return null;
        const iLv = intimacyLevel(unit);
        return (
          <View style={g.halfRow}>
            {hasInti && (
              <TouchableOpacity style={[g.halfTile, expand === 'inti' && g.halfTileOn]} activeOpacity={0.8}
                onPress={() => setExpand(expand === 'inti' ? null : 'inti')}
                accessibilityRole="button" accessibilityLabel={`친밀도 레벨 ${iLv}, 탭하여 ${expand === 'inti' ? '접기' : '펼치기'}`}>
                <CodeTag id="c1" corner="tl" />
                <Text style={g.halfTitle}>💗 친밀도 {expand === 'inti' ? '▲' : '▼'}</Text>
                <Text style={g.halfSub}>Lv.{iLv}/{INTIMACY_MAX} · +{iLv * 2}%</Text>
              </TouchableOpacity>
            )}
            {sp.hasSeed && (
              <TouchableOpacity style={[g.halfTile, sp.fullyUnlocked && { borderColor: T.good }, expand === 'seed' && g.halfTileOn]} activeOpacity={0.8}
                onPress={() => setExpand(expand === 'seed' ? null : 'seed')}
                accessibilityRole="button" accessibilityLabel={`씨앗 발현 ${sp.met}/${sp.total}, 탭하여 ${expand === 'seed' ? '접기' : '펼치기'}`}>
                <CodeTag id="c2" corner="tr" />
                <Text style={g.halfTitle}>🌱 씨앗 {expand === 'seed' ? '▲' : '▼'}</Text>
                <Text style={[g.halfSub, sp.fullyUnlocked && { color: T.good }]}>{sp.fullyUnlocked ? '완전 발현' : `${sp.met}/${sp.total} · 최대 +${Math.round(sp.full * 100)}%`}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })()}

      {/* 친밀도 상세(펼침) */}
      {dtab === 'growth' && expand === 'inti' && lines && (
        <Card style={{ marginTop: 8 }}>
          <View style={g.bubble}>
            <Text style={g.bubbleEmoji}>{meta.emoji}</Text>
            <Text style={g.bubbleText}>“{bubble || lines.greet}”</Text>
          </View>
          <View style={g.intiHead}>
            <Text style={g.sec}>💗 친밀도 <Text style={g.dim}>Lv.{intimacyLevel(unit)}/{INTIMACY_MAX} · 전 스탯 +{intimacyLevel(unit) * 2}%</Text></Text>
            <Btn small kind="gold" disabled={intimacyLevel(unit) >= INTIMACY_MAX}
              label={intimacyLevel(unit) >= INTIMACY_MAX ? 'MAX' : `선물 ${multLabel(mult)} ${concept.resources.currency.emoji}${fmt(giftCost(unit).currency)}`}
              onPress={() => {
                let last = null;
                const n = repeat(() => { const r = giveGift(state, unit.uid); if (r.ok) last = r; return r; }, mult);
                if (last) setBubble(last.leveledUp ? lines.levelup : lines.bond);
                fx(n > 0 ? 'success' : 'error');
                bump();
              }} />
          </View>
          <View style={g.bar}><View style={[g.barFill, { width: `${pctW(intimacyProgress(unit).ratio * 100)}%` }]} /></View>
        </Card>
      )}

      {/* 코스튬(스킨) — 캐릭터 외형 변경. 순수 외형(능력치 무관) */}
      {dtab === 'cosmetic' && (
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="f1" corner="tl" />
        <Text style={g.sec}>🎭 코스튬 <Text style={g.dim}>(외형 · 능력치 무관)</Text></Text>
        {costumesFor(state, unit).map((cos) => {
          const needTxt = costumeNeedText(cos, concept);
          return (
            <View key={cos.id} style={g.slotRow}>
              <Text style={g.cosEmoji}>{cos.owned ? cos.emoji : '🔒'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={g.slotName}>{cos.label} <Text style={rarityText(cos.rarity)}> {cos.rarity} </Text>{cos.char ? <Text style={g.dim}>  전용</Text> : null}</Text>
                <Text style={g.slotDesc}>{cos.owned ? `획득: ${cos.sourceLabel}` : `🔒 ${needTxt}`}</Text>
              </View>
              <Btn small kind={cos.equipped ? 'ghost' : cos.owned ? 'gold' : 'ghost'} disabled={!cos.owned}
                label={cos.equipped ? '해제' : cos.owned ? '장착' : '미보유'}
                onPress={() => act(() => (cos.equipped ? unequipSkin(unit) : equipSkin(state, unit, cos.id)))} />
            </View>
          );
        })}
      </Card>
      )}

      {!heavy && <Text style={g.loadingHint}>불러오는 중…</Text>}

      {heavy && (<>
      {/* 씨앗 상세(펼침) — 서사 발현 조건 목록 */}
      {dtab === 'growth' && expand === 'seed' && (() => {
        const sp = seedProgress(unit);
        if (!sp.hasSeed) return null;
        const conds = seedConditions(unit);
        const STAT_KO = { atk: '공격', hp: '체력', def: '방어', spd: '속도' };
        return (
          <Card style={{ marginTop: 8, borderColor: sp.fullyUnlocked ? T.good : T.line }}>
            <Text style={g.slotDesc}>{isOn('rarity') ? `${unit.rarity || '?'}등급 · ` : ''}완전 발현 시 전 스탯 최대 +{Math.round(sp.full * 100)}%.{isOn('rarity') ? ' 낮은 등급일수록 보정이 크지만, 완전 발현해도 최고등급을 살짝 넘지 못합니다.' : ''}</Text>
            <View style={{ height: 8 }} />
            {conds.map((c) => (
              <View key={c.id} style={[g.seedRow, c.met && g.seedRowMet]}>
                <Text style={g.seedIcon}>{c.met ? '🌸' : '🔒'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={g.seedLabel}>{c.label} <Text style={g.dim}>· {c.narrative}</Text></Text>
                  <Text style={g.seedSub}>{c.unitLabel} {c.cur}/{c.need} · {STAT_KO[c.stat]} +{(c.value * 100).toFixed(1)}%</Text>
                </View>
                <View style={c.met ? g.seedBadgeOn : g.seedBadgeOff}><Text style={c.met ? g.seedBadgeTextOn : g.seedBadgeTextOff}>{c.met ? '발현' : `${c.cur}/${c.need}`}</Text></View>
              </View>
            ))}
          </Card>
        );
      })()}

      {/* 전용 스킬 (시그니처) — 항상 발동, 교체 불가. 각성으로 2차 효과 개방 */}
      {dtab === 'skill' && unit.signature && (() => {
        const sig = SKILL_CATALOG[unit.signature];
        const aw = unit.sigAwaken || 0;
        const boost = sigWeaponBoost(unit);
        const awCost = awakenCost(aw);
        const canAwaken = aw < AWAKEN_MAX && (state.wallet.summon || 0) >= awCost.summon && (state.wallet.gem || 0) >= awCost.gem;
        return (
          <Card style={{ marginTop: 12, borderColor: T.accent }}>
            <CodeTag id="e1" corner="tl" />
            <View style={g.sigHead}>
              <Text style={g.sec}>⭐ 전용 스킬</Text>
              <Text style={g.sigBadge}>시그니처</Text>
            </View>
            <Text style={g.slotName}>{sig.label} <Text style={g.dim}>(R{unit.rank} 강도{boost ? ` · 무기 +${Math.round(boost * 100)}%` : ''})</Text></Text>
            <Text style={g.slotDesc}>{ov(describeSkill(unit.signature, skillPower(unit.rank) * (1 + boost)))}</Text>
            {/* 각성 */}
            <View style={g.awHead}>
              <Text style={g.subsec2}>각성 <Text style={g.dim}>{aw}/{AWAKEN_MAX}</Text></Text>
              <Btn small kind={aw >= AWAKEN_MAX ? 'ghost' : 'gold'} disabled={!canAwaken}
                label={aw >= AWAKEN_MAX ? 'MAX' : `각성 ${concept.resources.summon.emoji}${awCost.summon} ${concept.resources.gem.emoji}${awCost.gem}`}
                onPress={() => act(() => awakenSignature(state, unit.uid))} />
            </View>
            {sig.awaken && <Text style={[g.slotDesc, aw > 0 && { color: T.good }]}>2차 효과: {ov(describeAwaken(sig.awaken))}{aw > 0 ? ` ×${aw}` : ' (각성 시 개방)'}</Text>}
          </Card>
        );
      })()}

      {/* 전용무기 — 캐릭터 전용 슬롯 (일반 장비와 별개). 시그니처 증폭 */}
      {dtab === 'gear' && canOwnSigWeapon(unit) && (() => {
        const w = sigWeaponOf(concept, unit);
        const owned = hasSigWeapon(unit);
        const lv = owned ? unit.sigWeapon.level : 0;
        const unlockCost = sigWeaponUnlockCost();
        const enhCost = sigWeaponEnhanceCost(lv);
        const canUnlock = (state.wallet.gem || 0) >= unlockCost.gem;
        const maxed = lv >= SIGWEAPON_MAX;
        const canEnh = owned && !maxed && (state.wallet.currency || 0) >= enhCost.currency;
        return (
          <Card style={{ marginTop: 12 }}>
            <CodeTag id="d1" corner="tl" />
            <Text style={g.sec}>🗡️ 전용무기</Text>
            <View style={g.slotRow}>
              <Text style={g.cosEmoji}>{owned ? w.emoji : '🔒'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={g.slotName}>{w.name} {owned ? <Text style={g.dim}>Lv.{lv}/{SIGWEAPON_MAX}</Text> : null}</Text>
                <Text style={g.slotDesc}>{owned
                  ? `원형 전용 스탯 · 5레벨마다 시그니처 +10% (현재 +${Math.round(sigWeaponBoost(unit) * 100)}%)`
                  : `획득 시 전용 스탯 + 시그니처 증폭`}</Text>
              </View>
              {owned
                ? <Btn small kind="gold" disabled={!canEnh} label={maxed ? 'MAX' : `강화 ${concept.resources.currency.emoji}${fmt(enhCost.currency)}`}
                    onPress={() => grow(() => enhanceSigWeapon(state, unit.uid))} />
                : <Btn small kind="gold" disabled={!canUnlock} label={`획득 ${concept.resources.gem.emoji}${unlockCost.gem}`}
                    onPress={() => act(() => unlockSigWeapon(state, unit.uid))} />}
            </View>
          </Card>
        );
      })()}

      {/* 룬 — 소켓형 서브스탯 + 세트 보너스 */}
      {dtab === 'gear' && (
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="d2" corner="tl" />
        <View style={g.intiHead}>
          <Text style={g.sec}>🔩 룬 <Text style={g.dim}>({(unit.runes || []).filter(Boolean).length}/{RUNE_SLOTS})</Text></Text>
          <MultiToggle value={mult} onChange={setMult} />
        </View>
        <Btn small kind="gold" disabled={(state.wallet.currency || 0) < RUNE_SUMMON_COST.currency}
          label={`발굴 ${multLabel(mult)} ${concept.resources.currency.emoji}${mult === 'Max' ? '' : fmt(RUNE_SUMMON_COST.currency * mult)}`}
          onPress={() => { const n = repeat(() => summonRune(state, Math.random), mult); fx(n > 0 ? 'success' : 'error'); bump(); }} />
        {(state.runeBag || []).length > 0 && <Text style={g.dim}>가방 보유 {state.runeBag.length}개</Text>}
        {/* 룬 슬롯 — 한 줄 아이콘 타일(세트 이모지+레벨+등급). 탭하면 상세/교체 피커. */}
        <View style={g.runeSlots}>
          {[0, 1, 2].map((i) => {
            const rune = (unit.runes || [])[i];
            const set = rune && RUNE_SETS[rune.set];
            return (
              <TouchableOpacity key={i} onPress={() => setPicker({ mode: 'rune', slot: i })}
                accessibilityRole="button" accessibilityLabel={rune ? `${set.label} 룬 +${rune.level} ${rune.rarity}` : `룬 슬롯 ${i + 1} 비어있음`}
                style={[g.runeTile, rune && { borderColor: rarityColor(rune.rarity) }]} activeOpacity={0.8}>
                {rune ? (<>
                  <Text style={g.runeEmoji}>{set.emoji}</Text>
                  <Text style={g.runeLv}>+{rune.level}</Text>
                  <Text style={[rarityText(rune.rarity), g.runeRar]}> {rune.rarity} </Text>
                </>) : <Text style={g.runeEmptyBig}>＋</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
        {activeRuneSets(unit.runes).filter((s) => s.active2).map((s) => (
          <Text key={s.set} style={g.setBonus}>{s.emoji} {s.label} {s.active3 ? '3세트' : '2세트'} 보너스 활성</Text>
        ))}
      </Card>
      )}

      {/* 스킬 편성 (수동) */}
      {dtab === 'skill' && (
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="e2" corner="tl" />
        <View style={g.intiHead}>
          <Text style={g.sec}>✨ 스킬 편성 <Text style={g.dim}>({unit.skills.filter(Boolean).length}/{slots})</Text></Text>
          <Btn small kind="gold" label="✨ 추천 전체" sfx={false} onPress={() => runRecommend('all')} />
        </View>
        {recMsg && <Text style={g.recMsg}>{recMsg}</Text>}
        {/* 스킬 슬롯 — 한 줄 아이콘 타일(✨+이름+레벨). 탭하면 상세/교체 피커. */}
        <View style={g.runeSlots}>
          {[0, 1, 2].map((i) => {
            const locked = i >= slots;
            const sk = unit.skills[i];
            return (
              <TouchableOpacity key={i} disabled={locked} onPress={() => setPicker({ mode: 'skill', slot: i })}
                accessibilityRole="button" accessibilityLabel={locked ? `스킬 슬롯 ${i + 1} 잠김` : sk ? `${SKILL_CATALOG[sk.id].label} +${sk.level}` : `스킬 슬롯 ${i + 1} 비어있음`}
                style={[g.runeTile, locked && g.slotLocked, sk && { borderColor: T.accent }]} activeOpacity={0.8}>
                {locked ? <Text style={g.runeEmptyBig}>🔒</Text>
                  : sk ? (<>
                    <Text style={g.runeEmoji}>✨</Text>
                    <Text style={g.skillTileName} numberOfLines={1}>{SKILL_CATALOG[sk.id].label}</Text>
                    <Text style={g.runeLv}>+{sk.level}</Text>
                  </>) : <Text style={g.runeEmptyBig}>＋</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>
      )}

      {/* 장비 (수동) */}
      {dtab === 'gear' && (
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="d3" corner="tl" />
        <View style={g.intiHead}>
          <Text style={g.sec}>⚔️ 장비</Text>
          <Btn small kind="gold" label="✨ 추천 장착" sfx={false} onPress={() => runRecommend('gear')} />
        </View>
        {recMsg && <Text style={g.recMsg}>{recMsg}</Text>}
        {(() => {
          const equipped = GEAR_SLOTS.filter((s) => unit.gear[s]).length;
          return <Text style={g.slotDesc}>장착 {equipped}/{GEAR_SLOTS.length}</Text>;
        })()}
        {/* 장비 슬롯 — 부위별 아이콘 타일(부위 이모지+레벨+등급). 탭하면 상세/교체 피커. */}
        {GEAR_CATS.map(({ cat, label }) => (
          <View key={cat}>
            <Text style={g.gearCat}>{label}</Text>
            <View style={g.gearGrid}>
              {GEAR_SLOTS.filter((slot) => SLOT_META[slot].cat === cat).map((slot) => {
                const item = unit.gear[slot];
                return (
                  <TouchableOpacity key={slot} onPress={() => setPicker({ mode: 'gear', slot })}
                    accessibilityRole="button" accessibilityLabel={item ? `${SLOT_META[slot].label} ${GEAR_CATALOG[item.blueprint].label} +${item.level - 1}` : `${SLOT_META[slot].label} 비어있음`}
                    style={[g.gearTile, item && item.rarity && { borderColor: rarityColor(item.rarity) }]} activeOpacity={0.8}>
                    {item && gearIcon(item.blueprint)
                      ? <Image source={gearIcon(item.blueprint)} style={g.gearTileIcon} resizeMode="contain" />
                      : <Text style={g.gearTileEmoji}>{SLOT_META[slot].emoji}</Text>}
                    {item ? (<>
                      <Text style={g.runeLv}>+{item.level - 1}</Text>
                      {item.rarity ? <Text style={[rarityText(item.rarity), g.runeRar]}> {item.rarity} </Text> : null}
                    </>) : <Text style={g.gearTileEmpty}>{SLOT_META[slot].label}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
        {activeGearSets(unit).map((s) => (
          <Text key={s.set} style={g.setBonus}>⚔️ {s.label} 세트 {s.active3 ? '3피스(풀)' : '2피스'} 보너스 활성</Text>
        ))}
      </Card>
      )}

      </>)}

      </>)}

      {/* 성장 — 계정 성장 시스템(콘텐츠 탭에서 이전) */}
      {rtab === 'growth' && (
        <GrowthPanel state={state} bump={bump} concept={concept} />
      )}

      {/* 기록 — 시즌패스·업적·도감(기존 기록 탭 흡수) */}
      {rtab === 'meta' && (
        <MetaScreen embedded state={state} bump={bump} concept={concept} />
      )}

      {/* 편성 모달 */}
      <PickerModal picker={picker} unit={unit} state={state} concept={concept}
        onClose={() => setPicker(null)} onChange={bump} key={picker ? picker.mode + picker.slot : 'none'} />
    </ScrollView>

    {/* 영웅 탭 하위 서브탭 바(메인 탭바 위) — 영웅 ↔ 편성. */}
    <View style={g.rtabBar}>
      {ROSTER_TABS.map((tb, i) => {
        const on = rtab === tb.key;
        return (
          <Animated.View key={tb.key} style={{ flex: 1, opacity: rAnims[i], transform: [
            { translateY: rAnims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { scale: rAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
          ] }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => { fx('tap'); setRtab(tb.key); }}
              style={[g.rtabCell, on && g.rtabCellOn]}
              accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tb.label}>
              <Text style={[g.rtabIcon, on && g.rtabIconOn]}>{tb.icon}</Text>
              <Text style={[g.rtabLabel, on && g.rtabLabelOn]}>{tb.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
    </View>
  );
}

// ── 모달: 스킬/장비/룬 선택 ───────────────────────────────────
function PickerModal({ picker, unit, state, onClose, onChange, concept }) {
  const [emult, setEmult] = useState(1); // 강화 배수 (×1/×10/×100/Max)
  const [dmsg, setDmsg] = useState(null); // 강화 결과(전투력 증가) 표시
  if (!picker) return null;
  const apply = (fn) => { fn(); onChange(); };
  // 강화 전용 — 선택 배수만큼 반복 + 전투력 증가분을 명확히 표시.
  const applyN = (fn) => {
    const before = computePower(unit);
    const n = repeat(fn, emult);
    const gained = computePower(unit) - before;
    if (n > 0) { setDmsg(`⚔️ 전투력 +${fmt(gained)} (강화 ${n}회)`); fx('success'); }
    else { setDmsg('재화 부족 또는 상한'); fx('error'); }
    onChange();
  };

  let body;
  if (picker.mode === 'rune') {
    const i = picker.slot;
    const equipped = (unit.runes || [])[i];
    const curP = computePower(unit); // 변경 전 전투력(후보별 비교 기준)
    // 가방: 등급↓ → 메인값↓ 정렬(상위 우선).
    const bag = (state.runeBag || []).slice()
      .sort((a, b) => (RARITY_RANK[b.rarity] || 0) - (RARITY_RANK[a.rarity] || 0) || (runeMainValue(b) - runeMainValue(a)));
    body = (
      <>
        <Text style={m.title}>룬 선택 · 슬롯 {i + 1} <Text style={m.optDesc}>(가방 {bag.length})</Text></Text>
        {equipped && (() => {
          const d = describeRune(equipped);
          const maxed = equipped.level >= RUNE_MAX_LEVEL;
          const cost = runeEnhanceCost(equipped.level);
          return (
            <View style={[m.equippedRow, { borderWidth: 1.5, borderColor: rarityColor(equipped.rarity) }]}>
              <View style={m.equippedHead}>
                <Text style={m.equippedBadge}>✅ 장착중</Text>
                <Text style={m.equippedName}>{d.title} <Text style={rarityText(equipped.rarity)}> {d.rarityLabel} </Text></Text>
              </View>
              <Text style={m.equippedDesc}>{ov(d.sub)}</Text>
              {!maxed && <MultiToggle value={emult} onChange={setEmult} />}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn small kind="gold" disabled={maxed || (state.wallet.currency || 0) < cost.currency}
                  label={maxed ? 'MAX' : `강화 ${multLabel(emult)} ${fmt(cost.currency)}`} onPress={() => applyN(() => enhanceRune(state, equipped.uid))} />
                {(equipped.subs || []).length > 0 && <Btn small kind="primary" label="재련 💎15" onPress={() => apply(() => rerollRuneSubs(state, equipped.uid))} />}
                <Btn small kind="ghost" label="해제" onPress={() => apply(() => unequipRune(state, unit.uid, i))} />
              </View>
            </View>
          );
        })()}
        {/* 가상화(FlatList) — 가방이 수백 개여도 보이는 행만 렌더(렉 제거). */}
        <FlatList style={{ maxHeight: 360 }} data={bag} keyExtractor={(r) => r.uid}
          initialNumToRender={10} maxToRenderPerBatch={10} windowSize={5}
          ListEmptyComponent={<Text style={m.optDesc}>가방이 비었습니다. 룬 카드에서 발굴하세요.</Text>}
          renderItem={({ item: r }) => {
            const d = describeRune(r);
            return (
              <TouchableOpacity onPress={() => apply(() => { equipRune(state, unit.uid, i, r.uid); onClose(); })}
                style={[m.opt, { borderColor: rarityColor(r.rarity) }]} activeOpacity={0.8}>
                <Text style={m.optName}>{d.title} <Text style={rarityText(r.rarity)}> {RUNE_RARITY[r.rarity].label} </Text></Text>
                <Text style={m.optDesc}>{ov(d.sub)}</Text>
                <DeltaText cur={curP} next={powerWithRuneItem(unit, i, r)} />
              </TouchableOpacity>
            );
          }} />
      </>
    );
  } else if (picker.mode === 'skill') {
    const i = picker.slot;
    const equipped = unit.skills[i];
    body = (
      <>
        <Text style={m.title}>스킬 선택 · 슬롯 {i + 1}</Text>
        {equipped && (
          <View style={m.equippedRow}>
            <View style={m.equippedHead}>
              <Text style={m.equippedBadge}>✅ 장착중</Text>
              <Text style={m.equippedName}>{SKILL_CATALOG[equipped.id].label} +{equipped.level}</Text>
            </View>
            <Text style={m.equippedDesc}>{ov(describeSkill(equipped.id, skillPower(equipped.level)))}</Text>
            <MultiToggle value={emult} onChange={setEmult} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn small kind="gold" label={`강화 ${multLabel(emult)}`} onPress={() => applyN(() => upgradeSkill(state, unit.uid, i))} />
              <Btn small kind="ghost" label="해제" onPress={() => apply(() => unequipSkill(state, unit.uid, i))} />
            </View>
          </View>
        )}
        <ScrollView style={{ maxHeight: 360 }}>
          {equippableSkills().map((s) => {
            const on = equipped && equipped.id === s.id;
            const dupOther = unit.skills.some((x, j) => x && x.id === s.id && j !== i);
            return (
              <TouchableOpacity key={s.id} disabled={dupOther} onPress={() => apply(() => { equipSkill(state, unit.uid, i, s.id); onClose(); })}
                style={[m.opt, on && m.optOn, dupOther && m.optDim]} activeOpacity={0.8}>
                <Text style={m.optName}>{s.label} {on ? '✓' : ''}{dupOther ? ' (다른 슬롯 장착중)' : ''}</Text>
                <Text style={m.optDesc}>{ov(describeSkill(s.id))}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </>
    );
  } else {
    const slot = picker.slot;
    const item = unit.gear[slot];
    const curP = computePower(unit); // 변경 전 전투력(후보별 비교 기준)
    const bps = Object.values(GEAR_CATALOG).filter((b) => b.slot === slot);
    // 인벤토리: 등급↓ → 강화레벨↓ 로 정렬(상위 우선).
    const owned = state.inventory.filter((g2) => g2.slot === slot)
      .sort((a, b) => (RARITY_RANK[b.rarity] || 0) - (RARITY_RANK[a.rarity] || 0) || (b.level - a.level));
    body = (
      <>
        <Text style={m.title}>{SLOT_KO[slot]} 선택</Text>
        {item && (
          <View style={[m.equippedRow, item.rarity && { borderWidth: 1.5, borderColor: rarityColor(item.rarity) }]}>
            <View style={m.equippedHead}>
              <Text style={m.equippedBadge}>✅ 장착중</Text>
              <Text style={m.equippedName}>
                {GEAR_CATALOG[item.blueprint].label} +{item.level - 1}
                {item.rarity ? <Text style={rarityText(item.rarity)}> {(GEAR_RARITY[item.rarity] || {}).label || item.rarity} </Text> : null}
              </Text>
            </View>
            <Text style={m.equippedDesc}>{ov(describeGearItem(item))}</Text>
            {(item.subs || []).length > 0 && <Text style={m.subLine}>부옵션: {ov(describeSubs(item.subs))}</Text>}
            {(() => {
              const en = enchantInfo(item);
              return en
                ? <Text style={m.subLine}>✨ 인챈트: {en.label} +{Math.round(en.value * 100)}% <Text style={g.dim}>Lv.{en.level}/{ENCHANT_MAX}</Text></Text>
                : <Text style={m.subLine}>✨ 인챈트: 없음</Text>;
            })()}
            <MultiToggle value={emult} onChange={setEmult} />
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Btn small kind="gold" label={`강화 ${multLabel(emult)} (${fmt(gearEnhanceCost(item.level).currency)})`} onPress={() => applyN(() => enhanceGear(state, item.uid))} />
              {(item.subs || []).length > 0 && <Btn small kind="primary" label="재련 💎20" onPress={() => apply(() => rerollGearSubs(state, item.uid))} />}
              {isOn('elements') && <Btn small kind="gold" disabled={materialCount(state, 'elemEssence') < ELEM_OPTION_COST || (item.subs || []).length >= GEAR_SUB_MAX}
                label={`속성 부여 ${MATERIAL_META.elemEssence.emoji}${ELEM_OPTION_COST}`}
                onPress={() => apply(() => { const r = grantGearElementOption(state, item.uid); setDmsg(r.ok ? `${MATERIAL_META.elemEssence.emoji} 속성옵션 부여 (부옵션 ${r.subs.length})` : (r.reason || '실패')); })} />}
              {(() => {
                const en = enchantInfo(item);
                const lv = en ? en.level : 0;
                const c = enchantCost(lv).elemEssence;
                return (<>
                  <Btn small kind="primary" disabled={lv >= ENCHANT_MAX || materialCount(state, 'elemEssence') < c}
                    label={`인챈트 ${MATERIAL_META.elemEssence.emoji}${c}`}
                    onPress={() => apply(() => { const r = enchantGear(state, item.uid); setDmsg(r.ok ? `✨ ${r.info.label} 인챈트 Lv.${r.info.level}` : (r.reason || '실패')); })} />
                  {en && <Btn small kind="ghost" label="효과변경 💎25" onPress={() => apply(() => { const r = rerollEnchant(state, item.uid); setDmsg(r.ok ? `✨ 인챈트 변경: ${r.info.label}` : (r.reason || '실패')); })} />}
                </>);
              })()}
              <Btn small kind="ghost" label="해제" onPress={() => apply(() => unequipGear(state, unit.uid, slot))} />
            </View>
          </View>
        )}
        {/* 가상화 — 보유 장비가 많아도 보이는 행만 렌더. 제작 목록은 헤더로. */}
        <FlatList style={{ maxHeight: 340 }} data={owned} keyExtractor={(it) => it.uid}
          initialNumToRender={8} maxToRenderPerBatch={10} windowSize={5}
          ListHeaderComponent={(
            <>
              <Text style={m.group}>제작</Text>
              {bps.map((b) => (
                <TouchableOpacity key={b.id} onPress={() => apply(() => { const c = craftGear(state, b.id); if (c.ok) { equipGear(state, unit.uid, c.item.uid); onClose(); } })}
                  style={m.opt} activeOpacity={0.8}>
                  <View style={m.optHead}>
                    {gearIcon(b.id) && <Image source={gearIcon(b.id)} style={m.optIcon} resizeMode="contain" />}
                    <Text style={m.optName}>{b.label} <Text style={m.optCost}>🪙{fmt(gearCraftCost(b.id).currency)}</Text></Text>
                  </View>
                  <Text style={m.optDesc}>{describeGear(b)}</Text>
                </TouchableOpacity>
              ))}
              {owned.length > 0 && <Text style={m.group}>보유 장비</Text>}
            </>
          )}
          renderItem={({ item: it }) => (
            <TouchableOpacity onPress={() => apply(() => { equipGear(state, unit.uid, it.uid); onClose(); })}
              style={[m.opt, it.rarity && { borderColor: rarityColor(it.rarity) }]} activeOpacity={0.8}>
              <View style={m.optHead}>
                {gearIcon(it.blueprint) && <Image source={gearIcon(it.blueprint)} style={m.optIcon} resizeMode="contain" />}
                <Text style={m.optName}>{GEAR_CATALOG[it.blueprint].label} +{it.level - 1}
                  {it.rarity ? <Text style={rarityText(it.rarity)}> {(GEAR_RARITY[it.rarity] || {}).label || it.rarity} </Text> : null}</Text>
              </View>
              <Text style={m.optDesc}>{ov(describeGearItem(it))}</Text>
              <DeltaText cur={curP} next={powerWithGearItem(unit, slot, it)} />
            </TouchableOpacity>
          )} />
      </>
    );
  }

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <TouchableOpacity style={m.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={m.sheet}>
          {body}
          {dmsg && <Text style={m.dmsg}>{dmsg}</Text>}
          <View style={{ height: 8 }} />
          <Btn label="닫기" kind="ghost" onPress={onClose} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const g = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { padding: 14, paddingBottom: 30 },
  sec: { color: T.text, fontWeight: '800', fontSize: 15, marginBottom: 8 },
  // 보유 유닛 — 세로 목록(행 단위, 가로 스크롤 없음).
  // 보유 유닛 — 6열 아이콘 그리드(줄바꿈, 세로로 자람. 가로 스크롤 없음).
  // 6열 그리드 — 각 셀을 화면폭 1/6로 고정해 6개가 가로폭에 꽉 차게 배치.
  rosterGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  rosterCell: { width: '16.666%', padding: 2 },
  rosterTile: { alignItems: 'center', paddingVertical: 5, borderRadius: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  rosterTileOn: { borderColor: T.accent, backgroundColor: T.surface2 },
  rosterStar: { position: 'absolute', top: 2, right: 3, fontSize: 10, zIndex: 2 },
  rosterCount: { position: 'absolute', top: 2, left: 3, fontSize: 9, fontWeight: '900', color: T.accent, backgroundColor: T.surface2, borderRadius: 5, paddingHorizontal: 3, zIndex: 2, overflow: 'hidden' },
  rosterTileLv: { color: T.muted, fontSize: 8, marginTop: 2 },
  // 7슬롯(전열2·중열3·후열2) — 줄바꿈 그리드로 4열 배치.
  partyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  partySlot: { width: '22%', aspectRatio: 1, backgroundColor: T.surface2, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', padding: 4 },
  partySlotOn: { borderColor: T.line },
  partySlotSel: { borderColor: T.accent },
  partyName: { color: T.text, fontSize: 10, fontWeight: '700', marginTop: 5 },
  partyEmpty: { color: T.muted, fontSize: 24, fontWeight: '400' },
  formWrap: { marginTop: 12, borderTopWidth: 1, borderTopColor: T.line, paddingTop: 10 },
  formTitle: { color: T.text, fontWeight: '800', fontSize: 13 },
  // 진형 3그룹(전열/중열/후열) — 그룹별 정원 표기 + 소속 칩.
  formGroup: { marginTop: 10 },
  formGroupLabel: { color: T.accent, fontWeight: '800', fontSize: 12 },
  formRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  formChip: { minWidth: 64, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1 },
  formFront: { backgroundColor: T.surface2, borderColor: T.line },
  formMid: { backgroundColor: T.surface2, borderColor: T.growth },
  formBack: { backgroundColor: T.surface2, borderColor: T.accent },
  formName: { color: T.text, fontSize: 10, fontWeight: '700', maxWidth: '100%' },
  formEmpty: { color: T.muted, fontSize: 11, marginTop: 6 },
  formWarn: { color: T.danger, fontSize: 11, fontWeight: '700', marginTop: 8 },
  formOk: { color: T.good, fontSize: 11, marginTop: 8 },
  // 편성 프리셋(1~5) 슬롯.
  presetWrap: { marginTop: 12, borderTopWidth: 1, borderTopColor: T.line, paddingTop: 10 },
  presetRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  presetChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: T.surface2, borderWidth: 1, borderColor: T.line },
  presetChipOn: { borderColor: T.accent },
  presetNum: { color: T.muted, fontWeight: '900', fontSize: 15 },
  presetNumOn: { color: T.accent },
  presetSub: { color: T.muted, fontSize: 9, marginTop: 2 },
  synNone: { color: T.muted, fontSize: 12, marginTop: 10 },
  dpsWrap: { marginTop: 12, borderTopWidth: 1, borderTopColor: T.line, paddingTop: 10 },
  dpsToggle: { color: T.accent, fontSize: 12, fontWeight: '800' },
  dpsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  dpsName: { color: T.text, fontSize: 12, fontWeight: '700', width: 78 },
  dpsBarTrack: { flex: 1, height: 8, backgroundColor: T.surface2, borderRadius: 4, overflow: 'hidden' },
  dpsBarFill: { height: 8, backgroundColor: T.accent, borderRadius: 4 },
  dpsPct: { color: T.muted, fontSize: 11, fontWeight: '800', width: 36, textAlign: 'right' },
  deckWrap: { marginTop: 12, borderTopWidth: 1, borderTopColor: T.line, paddingTop: 10 },
  deckBtns: { flexDirection: 'row', gap: 8 },
  deckInput: { marginTop: 8, backgroundColor: T.surface2, borderRadius: 8, borderWidth: 1, borderColor: T.line, color: T.text, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12 },
  deckMsg: { color: T.accent, fontSize: 11, fontWeight: '700', marginTop: 8 },
  synWrap: { marginTop: 10, gap: 6 },
  synChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: T.accent },
  synChipText: { color: T.accent, fontWeight: '800', fontSize: 12 },
  synChipDesc: { color: T.muted, fontSize: 11, flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  headName: { color: T.text, fontWeight: '900', fontSize: 20, flexShrink: 1 },
  // 캐릭터명 옆 등급 칩 — 등급 글자수(N~SSR)와 무관하게 동일 규격(고정폭·중앙정렬).
  rarPill: { minWidth: 30, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rarPillText: { color: '#160f28', fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  // 편성 버튼 + 칭호/성격/속성 캡션을 오른쪽 한 컬럼에 묶어, 이름 옆 남는
  // 세로 공간을 그냥 비워두지 않고 활용한다(별도 줄로 빼지 않음).
  headSide: { alignItems: 'flex-end', gap: 4, maxWidth: 110 },
  headTitle: { color: T.primary, fontSize: 10, fontWeight: '700', textAlign: 'right', lineHeight: 13 },
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface2, borderRadius: 12, padding: 12, marginBottom: 12 },
  bubbleEmoji: { fontSize: 26 },
  cosEmoji: { fontSize: 26, width: 34, textAlign: 'center' },
  bubbleText: { flex: 1, color: T.text, fontSize: 14, fontStyle: 'italic' },
  intiHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bar: { height: 6, backgroundColor: T.surface2, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: T.accent, borderRadius: 3 },
  sigHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sigBadge: { color: '#3a2a05', backgroundColor: T.accent, fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  awHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  subsec2: { color: T.text, fontSize: 13, fontWeight: '700' },
  setBonus: { color: T.good, fontSize: 12, fontWeight: '700', marginTop: 6 },
  seedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.line },
  seedRowMet: {},
  seedIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  seedLabel: { color: T.text, fontWeight: '700', fontSize: 13 },
  seedSub: { color: T.muted, fontSize: 12, marginTop: 2 },
  seedBadgeOn: { backgroundColor: T.good, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  seedBadgeOff: { backgroundColor: T.surface2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  seedBadgeTextOn: { color: '#183a1d', fontWeight: '800', fontSize: 11 },
  seedBadgeTextOff: { color: T.muted, fontWeight: '700', fontSize: 11 },
  statGrid: { flexDirection: 'row', gap: 6, marginTop: 8 },
  stat: { flex: 1, backgroundColor: T.surface2, borderRadius: 10, paddingVertical: 4, alignItems: 'center' },
  statK: { color: T.muted, fontSize: 10 },
  statV: { color: T.text, fontWeight: '800', fontSize: 14, marginTop: 1 },
  ascHint: { color: T.muted, fontSize: 11, marginTop: 6 },
  bdBox: { marginTop: 12, backgroundColor: T.surface2, borderRadius: 12, padding: 12 },
  bdTitle: { color: T.text, fontWeight: '800', fontSize: 13, marginBottom: 8 },
  bdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  bdLabel: { color: T.muted, fontSize: 12, width: 84 },
  bdBarTrack: { flex: 1, height: 8, backgroundColor: T.surface, borderRadius: 4, overflow: 'hidden' },
  bdBarFill: { height: 8, backgroundColor: T.accent, borderRadius: 4 },
  bdVal: { color: T.text, fontSize: 12, fontWeight: '700', width: 52, textAlign: 'right' },
  bdPct: { color: T.muted, fontSize: 11, width: 34, textAlign: 'right' },
  slotRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface2, borderRadius: 12, padding: 12, marginBottom: 8 },
  slotLocked: { opacity: 0.5 },
  slotName: { color: T.text, fontWeight: '800', fontSize: 14 },
  slotDesc: { color: T.muted, fontSize: 12, marginTop: 2 },
  // 룬 아이콘 타일 — 한 줄에 3개(세트 이모지 + 레벨 + 등급).
  runeSlots: { flexDirection: 'row', gap: 8, marginTop: 8 },
  runeTile: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: T.surface2, borderWidth: 1.5, borderColor: T.line, gap: 3 },
  runeEmoji: { fontSize: 26 },
  runeLv: { color: T.text, fontSize: 12, fontWeight: '800' },
  runeRar: { fontSize: 9 },
  runeEmptyBig: { color: T.primary, fontSize: 26, fontWeight: '400' },
  skillTileName: { color: T.text, fontSize: 10, fontWeight: '700', maxWidth: 62, textAlign: 'center' },
  // 장비 아이콘 타일(부위별) — 줄바꿈 그리드.
  gearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2, marginBottom: 4 },
  gearTile: { width: 64, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: T.surface2, borderWidth: 1.5, borderColor: T.line, gap: 2 },
  gearTileEmoji: { fontSize: 22 },
  gearTileIcon: { width: 34, height: 34 },
  gearTileEmpty: { color: T.muted, fontSize: 9, textAlign: 'center' },
  gearCat: { color: T.muted, fontSize: 12, fontWeight: '800', marginTop: 10, marginBottom: 2 },
  dim: { color: T.muted, fontSize: 12, fontWeight: '400' },
  btnRow: { flexDirection: 'row', gap: 8 },
  loadingHint: { color: T.muted, fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  // 헤더 카드 내 성장(레벨업/돌파/각인) 박스.
  growBox: { marginTop: 12, backgroundColor: T.surface2, borderRadius: 12, padding: 12 },
  // 성급(별) 표시 — 헤더 이름줄 아래 금색 별.
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  starRowNum: { color: T.accent, fontSize: 12, fontWeight: '900' },
  starRowSub: { color: T.muted, fontSize: 11, fontWeight: '700' },
  starHint: { color: T.muted, fontSize: 10, lineHeight: 14 },
  starResult: { color: T.accent, fontSize: 12, fontWeight: '800', marginTop: 6 },
  starPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // 친밀도·씨앗 반반 요약 타일(한 줄) — 탭하면 아래 상세 펼침.
  halfRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  halfTile: { flex: 1, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1.5, borderColor: T.line, paddingVertical: 10, paddingHorizontal: 12 },
  halfTileOn: { borderColor: T.accent, backgroundColor: T.surface2 },
  halfTitle: { color: T.text, fontWeight: '800', fontSize: 13 },
  halfSub: { color: T.muted, fontSize: 11, fontWeight: '700', marginTop: 3 },
  // 영웅 탭 하위 서브탭 바(메인 탭바 위) — 영웅 ↔ 편성.
  rtabBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4,
    borderTopWidth: 1, borderTopColor: T.line, backgroundColor: T.surface2 },
  rtabCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: 'transparent' },
  rtabCellOn: { backgroundColor: T.accent, borderColor: T.accent },
  rtabIcon: { fontSize: 18, opacity: 0.55 },
  rtabIconOn: { opacity: 1 },
  rtabLabel: { color: T.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  rtabLabelOn: { color: '#241a40' },
  // 상세 서브탭 바 — 헤더 요약 바로 아래(성장/장비/스킬/꾸미기).
  dtabBar: { flexDirection: 'row', gap: 6, marginTop: 10 },
  dtabCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10,
    backgroundColor: T.surface2, borderWidth: 1, borderColor: 'transparent' },
  dtabCellOn: { backgroundColor: T.accent, borderColor: T.accent },
  dtabIcon: { fontSize: 18, opacity: 0.55 },
  dtabIconOn: { opacity: 1 },
  dtabLabel: { color: T.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  dtabLabelOn: { color: '#241a40' },
  recMsg: { color: T.accent, fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 2 },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, borderTopWidth: 1, borderColor: T.line },
  title: { color: T.text, fontWeight: '900', fontSize: 18, marginBottom: 12 },
  equippedRow: { backgroundColor: T.surface2, borderRadius: 12, padding: 12, marginBottom: 10, gap: 8 },
  equippedBadge: { color: '#0f2a17', backgroundColor: T.good, fontSize: 11, fontWeight: '900', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 1, alignSelf: 'flex-start', overflow: 'hidden' },
  equippedHead: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  equippedName: { color: T.text, fontWeight: '700', fontSize: 14 },
  equippedDesc: { color: T.muted, fontSize: 12 },
  subLine: { color: T.accent, fontSize: 11, fontWeight: '600' },
  group: { color: T.muted, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  opt: { backgroundColor: T.surface2, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  optOn: { borderColor: T.accent },
  optDim: { opacity: 0.4 },
  optHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optIcon: { width: 30, height: 30 },
  optName: { color: T.text, fontWeight: '800', fontSize: 14, flexShrink: 1 },
  optCost: { color: T.accent, fontWeight: '700', fontSize: 12 },
  optDesc: { color: T.muted, fontSize: 12, marginTop: 2 },
  dmsg: { color: T.accent, fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 8 },
});
