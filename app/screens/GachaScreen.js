import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { T, rarityMeta } from '../theme';
import { Card, Btn, fmt, Portrait, pctW } from '../components';
import { CodeTag } from '../uicode';
import { charImage } from '../charImages';
import { gearIcon } from '../uiIcons';
import { fx } from '../feedback';
import { reducedMotion } from '../motion';
import { summonOne, summonMulti, PULL_COST } from '../../system/core/gacha.mjs';
import { petSummon, PET_PULL_COST, PETS } from '../../system/core/pets.mjs';
import { guardianSummon, GUARDIAN_SUMMON_COST, GUARDIANS } from '../../system/core/guardians.mjs';
import {
  summonGear, summonRune, summonCosmetic,
  GEAR_PULL_COST, RUNE_PULL_COST, COSTUME_PULL_COST,
} from '../../system/core/summon.mjs';
import { RUNE_SETS } from '../../system/core/runes.mjs';
import { identity } from '../../system/concepts/index.mjs';
import { recordMission } from '../../system/core/daily.mjs';
import { isUnlocked, unlockStage } from '../../system/core/unlocks.mjs';
import { isOn } from '../../system/core/features.mjs';
import { LockedPanel } from '../components';
import {
  recordSummon, summonMasteryInfo, claimSummonLevel,
  SUMMON_LEVEL_MAX, SUMMON_LEVEL_THRESHOLDS,
} from '../../system/core/summonMastery.mjs';

const RANK = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };
const SLOT_EMOJI = { weapon: '⚔️', armor: '🛡️', accessory: '💍' };

// 소환 결과 한 칸 — 등장 시 페이드+스케일 (등급 높을수록 늦게=강조).
const RevealCell = React.memo(function RevealCell({ index, rarity, emoji, image, name, skip }) {
  const showRarity = isOn('rarity');
  const rm = rarityMeta(showRarity ? rarity : 'N');
  const instant = skip || reducedMotion();
  const a = useRef(new Animated.Value(instant ? 1 : 0)).current;
  useEffect(() => {
    if (instant) { a.setValue(1); return; }
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 340, delay: Math.min(index, 12) * 70, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
      <View style={[s.cell, { borderColor: showRarity ? rm.color : T.line }]}>
        {showRarity ? <Text style={[s.cellRarity, { color: rm.color }]}>{rm.label}</Text> : null}
        <Portrait emoji={emoji} image={image} rarity={rarity} size={52} badge />
        <Text style={s.cellName} numberOfLines={1}>{name}</Text>
      </View>
    </Animated.View>
  );
});

export default function GachaScreen({ state, bump, concept }) {
  const [results, setResults] = useState([]);
  const [resultsKey, setResultsKey] = useState(0);
  const [banner, setBanner] = useState('hero');
  const [msg, setMsg] = useState(null);

  const pool = concept.roster;
  const gemE = concept.resources.gem.emoji;
  const sumE = concept.resources.summon.emoji;

  // 배너 정의: 소환 재화·비용·매핑을 한 곳에.
  const BANNERS = {
    hero: {
      label: '영웅', icon: '🦸', curr: 'summon', cost: PULL_COST.summon, multi: true,
      sub: isOn('rarity') ? '확률: N 50 · R 33 · SR 14 · SSR 2.5 · UR 0.5 (%)' : '영웅을 뽑아 로스터를 모으세요',
      note: isOn('rarity') ? '10연차 이상 최소 1개 SR 이상 보장' : '',
    },
    gear: {
      label: '장비', icon: '⚔️', curr: 'gem', cost: GEAR_PULL_COST.gem, multi: true,
      sub: '랜덤 장비 → 인벤토리 · 진행도↑ 상위 등급↑', note: '영웅 탭에서 장착·강화',
    },
    rune: {
      label: '룬', icon: '🔷', curr: 'gem', cost: RUNE_PULL_COST.gem, multi: true,
      sub: '랜덤 룬 → 룬 가방 · 진행도↑ 상위 등급↑', note: '3슬롯 장착 · 세트 보너스',
    },
    pet: {
      label: '펫', icon: '🐾', curr: 'gem', cost: PET_PULL_COST.gem, multi: true,
      sub: '펫 획득(중복은 레벨업) · 최대 3마리 장착', note: '펫은 캐릭터·유물처럼 계정 성장 축',
    },
    guardian: {
      label: '정령', icon: '🧚', curr: 'gem', cost: GUARDIAN_SUMMON_COST.gem, multi: true,
      sub: '정령 획득(중복은 레벨업) · 최대 3체 장착', note: '장착·관리는 영웅 탭 › 성장',
    },
    cosmetic: {
      label: '코스튬', icon: '🎀', curr: 'gem', cost: COSTUME_PULL_COST.gem, multi: true,
      sub: '미보유 외형(프레임·칭호) 무작위 · 능력치 무관', note: '전부 보유 시 다이아 일부 환급(배수뽑기도 자동 환급)',
    },
  };
  const b = BANNERS[banner];
  const bal = state.wallet[b.curr] || 0;
  const skipAnim = !!(state.settings && state.settings.skipGachaAnim);
  const toggleSkip = () => { state.settings = state.settings || {}; state.settings.skipGachaAnim = !state.settings.skipGachaAnim; bump(); };

  // 단일 소환 실행 → { cell, spent }. spent=재화 소모 여부(숙련도 카운트용).
  function pullOnce() {
    if (banner === 'pet') {
      const r = petSummon(state); if (!r.ok) return { cell: null, spent: false };
      const p = PETS[r.pet];
      return { cell: { rarity: r.rarity, emoji: p.emoji, name: `${p.label} Lv.${r.level}` }, spent: true };
    }
    if (banner === 'guardian') {
      const r = guardianSummon(state); if (!r.ok) return { cell: null, spent: false };
      const gd = GUARDIANS[r.guardian];
      return { cell: { rarity: r.rarity, emoji: gd.emoji, name: `${gd.label} Lv.${r.level}` }, spent: true };
    }
    if (banner === 'gear') {
      const r = summonGear(state); if (!r.ok) return { cell: null, spent: false };
      // 무기·방패는 3D 아이콘, 그 외는 슬롯 이모지.
      return { cell: { rarity: r.rarity, image: gearIcon(r.item.blueprint), emoji: SLOT_EMOJI[r.item.slot] || '⚔️', name: r.label }, spent: true };
    }
    if (banner === 'rune') {
      const r = summonRune(state); if (!r.ok) return { cell: null, spent: false };
      const set = RUNE_SETS[r.rune.set];
      return { cell: { rarity: r.rarity, emoji: set?.emoji || '🔷', name: set?.label || r.rune.set }, spent: true };
    }
    if (banner === 'cosmetic') {
      const r = summonCosmetic(state); if (!r.ok) return { cell: null, spent: false };
      if (r.duplicate) { setMsg(`모든 코스튬 보유 · ${gemE}${r.refund.gem} 환급`); return { cell: null, spent: true }; }
      setMsg('영웅 탭 › 꾸미기에서 장착하세요');
      return { cell: { rarity: r.item.rarity || 'SSR', emoji: r.item.emoji, name: r.item.label }, spent: true };
    }
    return { cell: null, spent: false }; // hero handled separately
  }

  const pull = (n) => {
    setMsg(null);
    let cells = [];
    let executed = 0;
    if (banner === 'hero') {
      if (n === 1) { const r = summonOne(state, Math.random, pool); if (r.ok) cells = [r]; }
      else { const r = summonMulti(state, n, Math.random, pool); if (r.ok) cells = r.results; }
      cells = cells.map((r) => ({ rarity: r.rarity, emoji: identity(concept, r.unit).emoji, name: identity(concept, r.unit).name, image: charImage(concept.id, r.unit.characterId) }));
      executed = cells.length;
      if (cells.length) recordMission(state, 'summon', cells.length);
    } else {
      for (let i = 0; i < n; i++) { const { cell, spent } = pullOnce(); if (!spent) break; executed++; if (cell) cells.push(cell); }
    }
    if (executed) recordSummon(state, banner, executed); // 소환 숙련도 누적
    if (cells.length) {
      setResults(cells.slice(-20)); setResultsKey((k) => k + 1);
      fx('summon');
      const best = cells.reduce((m, c) => Math.max(m, RANK[c.rarity] ?? 0), 0);
      const bestFx = () => fx(best >= 3 ? 'ssr' : best >= 2 ? 'sr' : 'success');
      if (skipAnim) bestFx(); else setTimeout(bestFx, 480); // 스킵 시 즉시 결과음
    }
    bump();
  };

  // 정령 배너는 해금 게이트(스테이지) 준수 — 잠금 중엔 소환 불가.
  const bLocked = banner === 'guardian' && !isUnlocked(state, 'guardian');
  const canN = (n) => !bLocked && bal >= b.cost * n;
  const maxN = bLocked ? 0 : Math.min(300, Math.floor(bal / b.cost));

  // 소환 숙련도(소환 레벨) 현황·청구.
  const info = summonMasteryInfo(state, banner);
  const rewardParts = (rw) => {
    const parts = [`${sumE}${fmt(rw.summon)}`, `${gemE}${fmt(rw.gem)}`]; // 기본: 소환권+다이아
    if (rw.type === 'stat') parts.push(`전투력 +${Math.round(rw.power * 100)}%`);
    else { parts.push(`${concept.resources.currency.emoji}${fmt(rw.currency)}`); parts.push(`${concept.resources.growth.emoji}${fmt(rw.growth)}`); }
    return parts;
  };
  const doClaim = () => {
    const r = claimSummonLevel(state, banner);
    if (r.ok) { fx('success'); setMsg([`Lv.${r.level} 보상`, ...rewardParts(r.reward)].join(' · ')); }
    else { fx('error'); }
    bump();
  };
  // 진행 바: 현재 레벨→다음 레벨 문턱 사이 비율.
  const curLv = info.level;
  const prevThr = curLv > 0 ? SUMMON_LEVEL_THRESHOLDS[curLv - 1] : 0;
  const nextThr = curLv < SUMMON_LEVEL_MAX ? SUMMON_LEVEL_THRESHOLDS[curLv] : null;
  const barPct = nextThr ? Math.min(100, ((info.count - prevThr) / (nextThr - prevThr)) * 100) : 100;
  const nr = info.nextReward;
  const nrText = !nr ? '최대 레벨 달성' : rewardParts(nr).join(' ');

  // 배너 전환 시 스크롤 최상단으로.
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: false }); }, [banner]);
  // "차르륵" — 소환 탭 진입 시 하단 배너 서브탭 순차 등장(콘텐츠 탭과 동일 규약).
  const bKeys = Object.keys(BANNERS);
  const bAnims = useRef(bKeys.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (reducedMotion()) { bAnims.forEach((a) => a.setValue(1)); return; }
    bAnims.forEach((a) => a.setValue(0));
    Animated.stagger(60, bAnims.map((a) =>
      Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }),
    )).start();
  }, []);

  if (!isUnlocked(state, 'gacha')) {
    return <LockedPanel concept={concept} title="소환" stage={unlockStage('gacha')} desc="스테이지를 진행하면 소환이 열립니다." />;
  }

  return (
    <View style={s.flex}>
    <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={s.wrap}>
      <Card style={s.banner}>
        <CodeTag id="j1" corner="tl" />
        <Text style={s.bannerTitle}>{b.label} 소환</Text>
        <Text style={s.bannerSub}>{b.sub}</Text>
        <Text style={s.pity}>
          {bLocked ? `🔒 스테이지 ${unlockStage('guardian')} 도달 시 해금 · ` : banner === 'hero' ? `천장까지 ${90 - state.gacha.pity}회 · ` : ''}보유 {b.curr === 'gem' ? gemE : sumE} {fmt(bal)}
        </Text>
      </Card>

      {/* 소환 레벨(숙련도) */}
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="j2" corner="tl" />
        <View style={s.mHead}>
          <Text style={s.mTitle}>소환 레벨 <Text style={s.mLv}>Lv.{info.claimed}/{SUMMON_LEVEL_MAX}</Text></Text>
          <Btn small kind={info.claimable ? 'gold' : 'ghost'} disabled={!info.claimable}
            label={info.claimable ? `Lv.${info.claimed + 1} 보상 받기` : info.maxed ? 'MAX' : '진행 중'}
            onPress={doClaim} />
        </View>
        <View style={s.mBar}><View style={[s.mBarFill, { width: `${pctW(barPct)}%` }]} /></View>
        <Text style={s.mSub}>
          {nextThr ? `누적 ${info.count}/${nextThr}회` : `누적 ${info.count}회 · 최대`}
          {'  ·  '}다음: {nrText}
        </Text>
        <Text style={s.mNote}>기본 소환권+다이아 · 홀수 레벨 능력치 / 짝수 레벨 재화 추가</Text>
      </Card>

      <View style={s.btns}>
        <CodeTag id="j3" corner="tl" />
        <View style={{ flex: 1 }}>
          <Btn label={`단차 (${b.cost})`} disabled={!canN(1)} sfx={false} onPress={() => pull(1)} />
        </View>
        {b.multi && (<>
          <View style={{ flex: 1 }}>
            <Btn label={`10연 (${b.cost * 10})`} kind="gold" disabled={!canN(10)} sfx={false} onPress={() => pull(10)} />
          </View>
          <View style={{ flex: 1 }}>
            <Btn label={maxN > 0 ? `Max (${maxN})` : 'Max'} kind="gold" disabled={maxN < 1} sfx={false} onPress={() => pull(maxN)} />
          </View>
        </>)}
      </View>
      <Text style={s.floor}>{b.note}</Text>
      {msg ? <Text style={s.msg}>{msg}</Text> : null}

      {results.length > 0 && (
        <Card style={{ marginTop: 14 }}>
          <CodeTag id="j4" corner="tl" />
          <View style={s.resHead}>
            <Text style={s.sec}>소환 결과 <Text style={s.floor}>({results.length}건{results.length >= 20 ? ' · 최근 20' : ''})</Text></Text>
            <TouchableOpacity onPress={toggleSkip} activeOpacity={0.8} style={[s.skipToggle, skipAnim && s.skipToggleOn]}>
              <Text style={[s.skipText, skipAnim && s.skipTextOn]}>{skipAnim ? '⚡ 연출 스킵 ON' : '연출 스킵 OFF'}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.grid}>
            {results.map((c, i) => (
              <RevealCell key={`${resultsKey}-${i}`} index={i} rarity={c.rarity} emoji={c.emoji} image={c.image} name={c.name} skip={skipAnim} />
            ))}
          </View>
        </Card>
      )}

      <Text style={s.hint}>소환권은 출석·미션·환생, 다이아는 상점·보상으로 모입니다.</Text>
    </ScrollView>

    {/* 하단 배너 서브탭 바(메인 탭바 위) — 골드 채움 하이라이트 + 차르륵. */}
    <View style={s.subbar}>
      {bKeys.map((key, i) => {
        const on = banner === key;
        const def = BANNERS[key];
        return (
          <Animated.View key={key} style={{ flex: 1, opacity: bAnims[i], transform: [
            { translateY: bAnims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { scale: bAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
          ] }}>
            <TouchableOpacity activeOpacity={0.8}
              onPress={() => { fx('tap'); setBanner(key); setResults([]); setMsg(null); }}
              style={[s.subCell, on && s.subCellOn]}
              accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={def.label}>
              <Text style={[s.subIcon, on && s.subIconOn]}>{def.icon}</Text>
              <Text style={[s.subLabel, on && s.subLabelOn]}>{def.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { padding: 14 },
  // 하단 배너 서브탭 바 — 활성은 골드 채움(강한 하이라이트).
  subbar: { flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4,
    borderTopWidth: 1, borderTopColor: T.line, backgroundColor: T.surface2 },
  subCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: 'transparent' },
  subCellOn: { backgroundColor: T.accent, borderColor: T.accent },
  subIcon: { fontSize: 18, opacity: 0.55 },
  subIconOn: { opacity: 1 },
  subLabel: { color: T.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  subLabelOn: { color: '#241a40' },
  banner: { alignItems: 'center', backgroundColor: T.surface2 },
  bannerTitle: { color: T.text, fontWeight: '900', fontSize: 22, marginTop: 4 },
  bannerSub: { color: T.muted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  pity: { color: T.accent, fontSize: 13, fontWeight: '700', marginTop: 8 },
  btns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  floor: { color: T.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
  msg: { color: T.accent, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  mTitle: { color: T.text, fontWeight: '800', fontSize: 14 },
  mLv: { color: T.accent, fontSize: 13, fontWeight: '900' },
  mBar: { height: 8, backgroundColor: T.surface2, borderRadius: 4, overflow: 'hidden' },
  mBarFill: { height: 8, backgroundColor: T.good, borderRadius: 4 },
  mSub: { color: T.muted, fontSize: 11, marginTop: 6 },
  mNote: { color: T.muted, fontSize: 10, marginTop: 4 },
  sec: { color: T.text, fontWeight: '800', fontSize: 15, marginBottom: 10 },
  resHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skipToggle: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: T.surface2, borderWidth: 1, borderColor: 'transparent', marginBottom: 10 },
  skipToggleOn: { borderColor: T.accent, backgroundColor: T.surface },
  skipText: { color: T.muted, fontSize: 11, fontWeight: '800' },
  skipTextOn: { color: T.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  cell: { width: 90, backgroundColor: T.surface2, borderRadius: 12, borderWidth: 2, padding: 8, alignItems: 'center' },
  cellRarity: { fontSize: 11, fontWeight: '900' },
  cellName: { color: T.text, fontSize: 12, fontWeight: '700' },
  hint: { color: T.muted, fontSize: 12, marginTop: 16, lineHeight: 18, textAlign: 'center' },
});
