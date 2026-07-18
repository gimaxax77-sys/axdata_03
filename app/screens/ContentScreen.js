import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Modal } from 'react-native';
import { T } from '../theme';
import { Card, Btn, fmt, MultiToggle, multLabel, repeat, pctW } from '../components';
import { CodeTag } from '../uicode';
import { fx } from '../feedback';
import { reducedMotion } from '../motion';
import ArenaGuildScreen from './ArenaGuildScreen';
import {
  ATTENDANCE, canClaimAttendance, claimAttendance,
  missionList, claimMission, DUNGEONS, dungeonEntriesLeft, enterDungeon,
  sweepDungeon, claimAllDaily,
} from '../../system/core/daily.mjs';
import { MATERIAL_META, SHARD_META, materialCount } from '../../system/core/materials.mjs';
import { getStage } from '../../system/core/progression.mjs';
import { GEAR_CATALOG, GEAR_RARITY } from '../../system/core/gear.mjs';
import { autoSalvage } from '../../system/core/gearsalvage.mjs';
import { isUnlocked, unlockStage } from '../../system/core/unlocks.mjs';
import { campaignChapters, fightChapter, CAMPAIGN_CHAPTER_COUNT, storyLog } from '../../system/core/campaign.mjs';
import { elementMeta } from '../../system/concepts/index.mjs';
import { weeklyEvent, claimWeekly } from '../../system/core/events.mjs';
import { isOn } from '../../system/core/features.mjs';
import { seasonInfo, seasonChallenge, SEASON_FLOORS } from '../../system/core/season.mjs';

function rewardText(concept, reward) {
  return Object.entries(reward)
    .map(([k, v]) => `${concept.resources[k]?.emoji || ''}${fmt(v)}`)
    .join(' ');
}

// 던전별 해금 게이트 + 표시.
const DUNGEON_META = {
  GOLD: { feature: 'dungeonGold' },
  ESSENCE: { feature: 'dungeonEssence' },
  GEAR: { feature: 'dungeonEssence', label: '⚔️ 장비 던전', drop: '장비 드롭(등급 랜덤)' },
  RUNE: { feature: 'dungeonEssence', label: '🔷 룬 던전', drop: '룬 드롭(등급 랜덤)' },
  WEEKDAY: { feature: 'dungeonGold', label: '📅 요일 던전', drop: '장비/악세 + 소환석' },
  ELEMENT: { feature: 'dungeonEssence', label: '🔷 속성 던전', drop: '속성정수(장비 속성 옵션)' },
  PETSHARD: { feature: 'pets', label: '🧩 펫 던전', drop: '펫조각(등급별)' },
};

// 콘텐츠 서브탭 — 목적별 4묶음(하단 바). 상단 스크롤을 1/3로 줄인다.
const SUBTABS = [
  { key: 'daily', label: '일일', icon: '📅' },
  { key: 'event', label: '이벤트', icon: '🎯' },
  { key: 'arena', label: '경쟁', icon: '⚔️' },
  { key: 'story', label: '스토리', icon: '📖' },
];

export default function ContentScreen({ state, bump, concept }) {
  const [mult, setMult] = useState(1);
  const [grp, setGrp] = useState('daily'); // 현재 서브탭
  const [camResult, setCamResult] = useState(null);
  const [dropMsg, setDropMsg] = useState(null);
  const [dunSel, setDunSel] = useState(null); // 던전 상세 팝업 대상 타입
  const act = (fn) => { fn(); bump(); };
  const actN = (fn) => { repeat(fn, mult); bump(); };
  const salvagePref = state.settings.autoSalvage; // null | 'N' | 'R'
  // 설정이 켜져 있으면 하급 장비를 자동 분해하고 결과 문구 조각을 돌려준다.
  const runAutoSalvage = () => {
    if (!salvagePref) return null;
    const r = autoSalvage(state, salvagePref);
    return r.ok ? `♻️분해 ${r.removed}개 🪙${fmt(r.refund.currency)}` : null;
  };
  // 아이템/재료 던전: mult회 입장 → 마지막 드롭 요약 표시.
  const runDungeon = (type) => {
    let last = null, count = 0, sm = 0, ess = 0; const shards = {};
    repeat(() => {
      const r = enterDungeon(state, type);
      if (r.ok) { count++; last = r; sm += r.summon || 0; ess += r.elemEssence || 0; if (r.kind === 'petshard') shards[r.grade] = (shards[r.grade] || 0) + r.amount; }
      return r;
    }, mult);
    if (!last) { setDropMsg(null); bump(); return; }
    if (last.kind === 'gear') setDropMsg(`⚔️ 장비 ${count}개 · 최근 ${isOn('rarity') ? `[${(GEAR_RARITY[last.rarity] || {}).label || last.rarity}] ` : ''}${GEAR_CATALOG[last.item.blueprint].label}`);
    else if (last.kind === 'rune') setDropMsg(`🔷 룬 ${count}개${isOn('rarity') ? ` · 최근 [${last.rarity}]` : ''}`);
    else if (last.kind === 'weekday') setDropMsg(`📅 장비 ${count}개 + 🎟️소환석 ${sm}`);
    else if (last.kind === 'element') setDropMsg(`🔷 속성정수 +${ess}`);
    else if (last.kind === 'petshard') setDropMsg(`🧩 펫조각 ${Object.entries(shards).map(([g, n]) => `${g} ${n}`).join(' · ')}`);
    const sv = runAutoSalvage();
    if (sv && (last.kind === 'gear' || last.kind === 'weekday')) setDropMsg((m) => `${m} · ${sv}`);
    bump();
  };
  // QoL: 소탕 — 남은 입장 전부 한 번에.
  const doSweep = (type) => {
    const r = sweepDungeon(state, type);
    if (!r.ok) { setDropMsg('입장 횟수 소진'); bump(); return; }
    const parts = [`🧹 소탕 ${r.count}회`];
    if (r.items) parts.push(`⚔️${r.items}`);
    if (r.runes) parts.push(`🔷룬${r.runes}`);
    if (r.summon) parts.push(`🎟️${r.summon}`);
    if (r.elemEssence) parts.push(`🔷정수${r.elemEssence}`);
    const sh = Object.entries(r.shards || {}).map(([g, n]) => `🧩${g}${n}`);
    if (sh.length) parts.push(sh.join(' '));
    if (r.currency) parts.push(`🪙${fmt(r.currency)}`);
    if (r.growth) parts.push(`💠${fmt(r.growth)}`);
    const sv = runAutoSalvage();
    if (sv) parts.push(sv);
    setDropMsg(parts.join(' · '));
    bump();
  };
  // QoL: 전체 던전 일괄 소탕 — 해금·입장 남은 던전을 한 번에.
  const doSweepAll = () => {
    let total = 0, dungeons = 0;
    for (const type of Object.keys(DUNGEONS)) {
      if (!isUnlocked(state, DUNGEON_META[type].feature)) continue;
      if (dungeonEntriesLeft(state, type) <= 0) continue;
      const r = sweepDungeon(state, type);
      if (r.ok) { total += r.count; dungeons++; }
    }
    const sv = runAutoSalvage();
    const base = total > 0 ? `🧹 전체 소탕 — 던전 ${dungeons}곳 · ${total}회 완료` : '소탕할 던전이 없습니다';
    setDropMsg(sv ? `${base} · ${sv}` : base);
    fx(total > 0 ? 'success' : 'error');
    bump();
  };
  // QoL: 원탭 일일 전체수령.
  const doClaimAll = () => {
    const r = claimAllDaily(state);
    if (r.ok) { fx('success'); } else { fx('error'); }
    bump();
  };
  // 주간 테마 이벤트 보상 청구.
  const doClaimWeekly = () => {
    const r = claimWeekly(state);
    if (r.ok) { fx('success'); setDropMsg('🎁 주간 이벤트 보상 획득'); } else { fx('error'); }
    bump();
  };
  // 시즌 던전 다음 층 도전(평준화 조건).
  const doSeasonFight = () => {
    const r = seasonChallenge(state);
    if (r.ok) { fx('success'); setDropMsg(`🏔️ 시즌 ${r.floor}층 클리어!`); }
    else { fx('error'); setDropMsg(r.reason || '시즌 도전 실패'); }
    bump();
  };

  // 던전 표시 정보(타일·팝업 공용) — 이모지/이름/드롭/남은 입장.
  const dungeonInfo = (type, d) => {
    const meta = DUNGEON_META[type];
    const unlocked = isUnlocked(state, meta.feature);
    const left = dungeonEntriesLeft(state, type);
    const isItem = ['gear', 'rune', 'weekday', 'element', 'petshard'].includes(d.kind);
    const res = d.resource ? concept.resources[d.resource] : null;
    const emoji = isItem ? meta.label.split(' ')[0] : res.emoji;
    const name = isItem ? meta.label.split(' ').slice(1).join(' ').replace(' 던전', '') : res.name;
    const amount = res ? Math.round(getStage(state.peakStage).rewards[d.resource] * 40) : 0;
    const drop = isItem ? meta.drop : `1회 ${res.emoji}+${fmt(amount)}`;
    return { unlocked, left, isItem, emoji, name, drop, feature: meta.feature };
  };

  const chapters = campaignChapters(state, concept.campaign || []);
  const nextCh = chapters.find((c) => c.isNext);
  const allClear = state.campaign.cleared >= CAMPAIGN_CHAPTER_COUNT;
  const doFight = () => { const r = fightChapter(state, nextCh.index); setCamResult(r); bump(); };
  const streakIdx = state.daily.streak % ATTENDANCE.length;
  const canAtt = canClaimAttendance(state);
  const missions = missionList(state);
  const wev = weeklyEvent(state);
  const sInfo = seasonInfo(state);
  const sLog = storyLog(state, concept.campaign || []);
  const [showStory, setShowStory] = useState(false);
  const hrs = (ms) => Math.max(0, Math.floor(ms / 3600000));
  const days = (ms) => Math.max(0, Math.floor(ms / 86400000));

  // "차르륵 펼쳐지듯이" — 콘텐츠 탭 진입 시 하단 서브탭이 좌→우로 순차 등장.
  //   가챠 연출과 동일 규약(Animated.timing · useNativeDriver · stagger delay).
  //   연출끔/절전이면 즉시 완료 상태로 렌더(발열·접근성).
  const anims = useRef(SUBTABS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (reducedMotion()) { anims.forEach((a) => a.setValue(1)); return; }
    anims.forEach((a) => a.setValue(0));
    Animated.stagger(60, anims.map((a) =>
      Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }),
    )).start();
  }, []); // 마운트 1회(탭 진입) — App이 탭 전환 시 화면을 새로 마운트한다.

  // 서브탭 전환 시 스크롤 최상단으로 — 이전 위치가 남아 헤매지 않게.
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: false }); }, [grp]);

  // 서브탭별 "받을 것 있음" 점(●) — 눈이 먼저 찾도록.
  const dots = {
    daily: canAtt || missions.some((m) => m.done && !m.claimed),
    event: wev.done && !wev.claimed,
    growth: false,
    story: false,
  };

  return (
    <View style={c.flex}>
    <ScrollView ref={scrollRef} style={c.flex} contentContainerStyle={c.wrap}>
      {/* 경쟁 — 아레나·무한의 탑·길드(기존 경쟁 탭 흡수) */}
      {grp === 'arena' && <ArenaGuildScreen embedded state={state} bump={bump} concept={concept} />}
      {grp === 'story' && (
      /* 스토리 캠페인 */
      <Card style={{ borderColor: T.accent }}>
        <CodeTag id="n1" corner="tl" />
        <Text style={c.sec}>📖 스토리 <Text style={c.dim}>챕터 {state.campaign.cleared}/{CAMPAIGN_CHAPTER_COUNT}</Text></Text>
        {allClear ? (
          <Text style={c.storyText}>모든 챕터를 완결했습니다. 새로운 서사가 곧 이어집니다…</Text>
        ) : (<>
          <Text style={c.chTitle}>Ch.{nextCh.index + 1} · {nextCh.title}</Text>
          <Text style={c.storyText}>{nextCh.story}</Text>
          <View style={c.bossRow}>
            <Text style={c.bossInfo}>
              보스 {isOn('elements') ? `${elementMeta(concept, nextCh.boss.element)?.emoji} · ` : ''}HP {fmt(nextCh.boss.hp)} · ATK {fmt(nextCh.boss.atk)}
            </Text>
            <Text style={c.bossReward}>보상 {concept.resources.gem.emoji}{nextCh.reward.gem} {concept.resources.summon.emoji}{nextCh.reward.summon}</Text>
          </View>
          {camResult && (
            <Text style={[c.camResult, { color: camResult.win ? T.good : T.danger }]}>
              {camResult.win
                ? `승리! ${camResult.reward ? '챕터 클리어 · 보상 획득' : '(이미 클리어)'}`
                : `패배 — 더 강해진 뒤 다시 도전 (여유 ${camResult.margin?.toFixed(2)})`}
            </Text>
          )}
          <View style={{ height: 10 }} />
          <Btn label="보스 도전" kind="gold" onPress={doFight} />
        </>)}
        {/* 진행 도트 */}
        <View style={c.dots}>
          <CodeTag id="n2" corner="tr" />
          {chapters.map((ch) => (
            <View key={ch.index} style={[c.dot, ch.cleared && c.dotDone, ch.isNext && c.dotNext]} />
          ))}
        </View>
        {/* 스토리 정주행 도감 */}
        {sLog.readable.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <CodeTag id="n3" corner="tr" />
            <Btn small kind="ghost" label={showStory ? '스토리 도감 닫기 ▲' : `📚 스토리 정주행 (${sLog.readable.length}) ▼`} onPress={() => setShowStory((v) => !v)} />
            {showStory && sLog.readable.map((e) => (
              <View key={e.index} style={c.logEntry}>
                <Text style={c.logTitle}>Ch.{e.index + 1} · {e.title}</Text>
                <Text style={c.logStory}>{e.story}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
      )}

      {grp === 'event' && (<>
      {/* 주간 테마 이벤트(미니 로드맵) */}
      <Card style={{ marginTop: 12, borderColor: T.accent }}>
        <CodeTag id="l1" corner="tl" />
        <Text style={c.sec}>{wev.emoji} 이번 주 · {wev.label} <Text style={c.dim}>{days(wev.endsInMs)}일 남음</Text></Text>
        <Text style={c.sub}>{wev.hint}</Text>
        <View style={c.mBar}><View style={[c.mBarFill, { width: `${pctW((wev.progress / wev.goal) * 100)}%` }]} /></View>
        <Text style={c.sub}>진행 {wev.progress}/{wev.goal}</Text>
        <View style={{ height: 8 }} />
        <Btn kind={wev.done && !wev.claimed ? 'gold' : 'ghost'} disabled={!wev.done || wev.claimed}
          label={wev.claimed ? '이번 주 수령 완료' : wev.done ? '🎁 보상 받기' : '목표 진행 중'} onPress={doClaimWeekly} />
      </Card>

      {/* 시즌 소프트리셋 던전(평준화 랭킹) */}
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="l2" corner="tl" />
        <Text style={c.sec}>🏔️ 시즌 던전 <Text style={c.dim}>시즌 {sInfo.season} · {days(sInfo.endsInMs)}일 남음</Text></Text>
        <Text style={c.sub}>모두 평준화된 조건에서 겨루는 층 등반 — 스펙보다 편성·운영. (계정 배수 미적용)</Text>
        <Text style={c.sub}>도달 {sInfo.floor}/{SEASON_FLOORS}층 · 최고 {sInfo.best}층 · 평준화 전투력 {fmt(sInfo.power)}</Text>
        <View style={c.mBar}><View style={[c.mBarFill, { width: `${pctW((sInfo.floor / SEASON_FLOORS) * 100)}%` }]} /></View>
        <View style={{ height: 8 }} />
        <Btn kind="gold" disabled={sInfo.floor >= SEASON_FLOORS} label={sInfo.floor >= SEASON_FLOORS ? '최고 층 달성' : `${sInfo.floor + 1}층 도전`} onPress={doSeasonFight} />
      </Card>
      </>)}

      {grp === 'daily' && (<>
      {/* 출석 */}
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="k1" corner="tl" />
        <Text style={c.sec}>✅ 출석 체크</Text>
        <Text style={c.sub}>연속 {state.daily.streak}일 · 오늘 보상 {rewardText(concept, ATTENDANCE[streakIdx])}</Text>
        <View style={c.attRow}>
          {ATTENDANCE.map((r, i) => (
            <View key={i} style={[c.attCell, i === streakIdx && canAtt && c.attToday, i < streakIdx % ATTENDANCE.length && c.attDone]}>
              <Text style={c.attDay}>{i + 1}</Text>
              <Text style={c.attEmoji}>{concept.resources[Object.keys(r)[0]]?.emoji}</Text>
            </View>
          ))}
        </View>
        <Btn label={canAtt ? '출석 보상 받기' : '오늘 수령 완료'} kind="gold" disabled={!canAtt}
          onPress={() => act(() => claimAttendance(state))} />
      </Card>

      {/* 일일 미션 */}
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="k2" corner="tl" />
        <View style={c.rowBetween}>
          <Text style={c.sec}>📋 일일 미션</Text>
          <Btn small kind="gold" label="⚡ 전체 수령"
            disabled={!canAtt && !missions.some((m) => m.done && !m.claimed)}
            onPress={doClaimAll} />
        </View>
        {missions.map((m) => (
          <View key={m.id} style={c.mRow}>
            <View style={{ flex: 1 }}>
              <Text style={c.mLabel}>{m.label} <Text style={c.dim}>{m.progress}/{m.goal}</Text></Text>
              <View style={c.bar}><View style={[c.barFill, { width: `${pctW((m.progress / m.goal) * 100)}%` }]} /></View>
              <Text style={c.mReward}>보상 {rewardText(concept, m.reward)}</Text>
            </View>
            <Btn small kind={m.claimed ? 'ghost' : 'gold'} disabled={!m.done || m.claimed}
              label={m.claimed ? '완료' : '받기'} onPress={() => act(() => claimMission(state, m.id))} />
          </View>
        ))}
      </Card>

      {/* 던전 */}
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="k3" corner="tl" />
        <View style={c.rowBetween}>
          <Text style={c.sec}>🗝️ 던전</Text>
          <MultiToggle value={mult} onChange={setMult} />
        </View>
        <Text style={c.sub}>자원·아이템 파밍 · 하루 입장 제한 · 탭하여 입장</Text>
        {/* 던전 아이콘 타일(가로열 대신) — 탭하면 상세 팝업에서 입장/소탕. */}
        <View style={c.dunGrid}>
          {Object.entries(DUNGEONS).map(([type, d]) => {
            const info = dungeonInfo(type, d);
            return (
              <TouchableOpacity key={type} onPress={() => setDunSel(type)} activeOpacity={0.8}
                accessibilityRole="button" accessibilityLabel={info.unlocked ? `${info.name} 던전, 남은 입장 ${info.left}` : `${info.name} 던전 잠김`}
                style={[c.dunTile, !info.unlocked && c.dunLock, info.left <= 0 && info.unlocked && c.dunSpent]}>
                <Text style={c.dunEmoji}>{info.unlocked ? info.emoji : '🔒'}</Text>
                <Text style={c.dunName} numberOfLines={1}>{info.name}</Text>
                <Text style={[c.dunLeft, info.left <= 0 && { color: T.muted }]}>{info.unlocked ? `${info.left}/${d.entriesPerDay}` : `${unlockStage(info.feature)}층`}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ marginTop: 8 }}>
          <Btn small kind="gold" label="🧹 모두 소탕 (해금·입장 남은 던전 전부)" onPress={doSweepAll} />
        </View>
        {/* 낮은 등급 장비 자동 분해 — 소탕/던전 드롭 후 하급 장비를 재화로 정리. */}
        <View style={c.salvageRow}>
          <Text style={c.salvageLabel}>♻️ 하급 장비 자동 분해</Text>
          {[{ v: null, t: '끄기' }, { v: 'N', t: '노멀↓' }, { v: 'R', t: '레어↓' }].map((o) => {
            const on = salvagePref === o.v;
            return (
              <TouchableOpacity key={o.t} activeOpacity={0.8}
                onPress={() => { state.settings.autoSalvage = o.v; fx('tap'); bump(); }}
                style={[c.salvageChip, on && c.salvageChipOn]}>
                <Text style={[c.salvageChipTxt, on && c.salvageChipTxtOn]}>{o.t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* 보유 재료 */}
        <View style={c.matBar}>
          <Text style={c.matChip}>{MATERIAL_META.elemEssence.emoji} {MATERIAL_META.elemEssence.label} {fmt(materialCount(state, 'elemEssence'))}</Text>
          {['R', 'SR', 'SSR', 'UR'].map((g) => (
            <Text key={g} style={c.matChip}>{SHARD_META.emoji}{g} {fmt(materialCount(state, 'petShard', g))}</Text>
          ))}
        </View>
      </Card>
      </>)}

    </ScrollView>

    {/* 던전 상세 팝업 — 타일 탭 시 입장/소탕 액션. */}
    <Modal transparent animationType="fade" visible={!!dunSel} onRequestClose={() => setDunSel(null)}>
      <TouchableOpacity style={c.backdrop} activeOpacity={1} onPress={() => setDunSel(null)}>
        <TouchableOpacity style={c.dunModal} activeOpacity={1} onPress={() => {}}>
          {dunSel && (() => {
            const d = DUNGEONS[dunSel];
            const info = dungeonInfo(dunSel, d);
            return (<>
              <View style={c.dunHead}>
                <CodeTag id="k4" corner="tl" />
                <Text style={c.dunHeadEmoji}>{info.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={c.dunHeadName}>{info.name} 던전</Text>
                  <Text style={c.sub}>{info.unlocked ? `${info.drop} · 남은 입장 ${info.left}/${d.entriesPerDay}` : `🔒 스테이지 ${unlockStage(info.feature)} 도달 시 해금`}</Text>
                </View>
                {info.unlocked && <MultiToggle value={mult} onChange={setMult} />}
              </View>
              {dropMsg ? <Text style={c.dropMsg}>{dropMsg}</Text> : null}
              <View style={{ height: 10 }} />
              <Btn kind="gold" disabled={!info.unlocked || info.left <= 0}
                label={info.unlocked ? `입장 ${multLabel(mult)}` : '잠김'}
                onPress={() => (info.isItem ? runDungeon(dunSel) : actN(() => enterDungeon(state, dunSel)))} />
              <View style={{ height: 8 }} />
              <Btn kind="primary" disabled={!info.unlocked || info.left <= 0}
                label={`🧹 소탕 (남은 ${info.left}회 전부)`} onPress={() => doSweep(dunSel)} />
              <View style={{ height: 8 }} />
              <Btn kind="ghost" label="닫기" onPress={() => setDunSel(null)} />
            </>);
          })()}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>

    {/* 작업 결과 배너 — 어느 그룹에서 눌러도 보이도록 서브탭 바 위에 공용 배치. */}
    {dropMsg ? <Text style={c.dropBanner} numberOfLines={2}>{dropMsg}</Text> : null}

    {/* 하단 서브탭 바 — 메인 탭바 바로 위. 콘텐츠 진입 시 좌→우로 차르륵 펼쳐진다. */}
    <View style={c.subbar}>
      {SUBTABS.map((tb, i) => {
        const on = grp === tb.key;
        return (
          <Animated.View key={tb.key} style={{
            flex: 1,
            opacity: anims[i],
            transform: [
              { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              { scale: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            ],
          }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => { fx('tap'); setGrp(tb.key); }}
              style={[c.subCell, on && c.subCellOn]}
              accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tb.label}>
              <View>
                <Text style={[c.subIcon, on && c.subIconOn]}>{tb.icon}</Text>
                {dots[tb.key] ? <View style={c.subDot} /> : null}
              </View>
              <Text style={[c.subLabel, on && c.subLabelOn]}>{tb.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
    </View>
  );
}

const c = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { padding: 14 },
  sec: { color: T.text, fontWeight: '800', fontSize: 15, marginBottom: 4 },
  sub: { color: T.muted, fontSize: 12, marginBottom: 12 },
  dim: { color: T.muted, fontSize: 12, fontWeight: '400' },
  mBar: { height: 8, backgroundColor: T.surface2, borderRadius: 4, overflow: 'hidden', marginVertical: 6 },
  mBarFill: { height: 8, backgroundColor: T.good, borderRadius: 4 },
  logEntry: { backgroundColor: T.surface2, borderRadius: 10, padding: 10, marginTop: 8 },
  logTitle: { color: T.accent, fontWeight: '800', fontSize: 13, marginBottom: 4 },
  logStory: { color: T.text, fontSize: 12, lineHeight: 18 },
  attRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  attCell: { flex: 1, backgroundColor: T.surface2, borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  attToday: { borderColor: T.accent },
  attDone: { opacity: 0.4 },
  attDay: { color: T.muted, fontSize: 10 },
  attEmoji: { fontSize: 16, marginTop: 2 },
  mRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.line },
  mLabel: { color: T.text, fontWeight: '700', fontSize: 14 },
  mReward: { color: T.muted, fontSize: 12, marginTop: 3 },
  dropMsg: { color: T.accent, fontSize: 12, fontWeight: '700', marginTop: 8 },
  salvageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  salvageLabel: { color: T.muted, fontSize: 12, fontWeight: '700', flex: 1 },
  salvageChip: { backgroundColor: T.surface2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'transparent' },
  salvageChipOn: { borderColor: T.accent, backgroundColor: T.surface },
  salvageChipTxt: { color: T.muted, fontSize: 12, fontWeight: '800' },
  salvageChipTxtOn: { color: T.accent },
  bar: { height: 6, backgroundColor: T.surface2, borderRadius: 3, marginTop: 5, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: T.good, borderRadius: 3 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  chTitle: { color: T.accent, fontWeight: '800', fontSize: 14, marginTop: 6 },
  storyText: { color: T.text, fontSize: 13, lineHeight: 19, marginTop: 6, fontStyle: 'italic' },
  bossRow: { marginTop: 10 },
  bossInfo: { color: T.muted, fontSize: 12 },
  bossReward: { color: T.good, fontSize: 12, fontWeight: '700', marginTop: 3 },
  camResult: { fontSize: 13, fontWeight: '800', marginTop: 10 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 12, justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: T.surface2 },
  dotDone: { backgroundColor: T.good },
  dotNext: { backgroundColor: T.accent },
  // 하단 서브탭 바(메인 탭바 위) — 목적별 4묶음 전환.
  subbar: { flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4,
    borderTopWidth: 1, borderTopColor: T.line, backgroundColor: T.surface2 },
  subCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: 'transparent' },
  subCellOn: { backgroundColor: T.accent, borderColor: T.accent },
  subIcon: { fontSize: 18, opacity: 0.55, textAlign: 'center' },
  subIconOn: { opacity: 1 },
  subLabel: { color: T.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  subLabelOn: { color: '#241a40' },
  subDot: { position: 'absolute', top: -1, right: -5, width: 7, height: 7, borderRadius: 4, backgroundColor: T.danger },
  dropBanner: { color: T.accent, fontSize: 12, fontWeight: '800', textAlign: 'center',
    paddingHorizontal: 14, paddingVertical: 6, backgroundColor: T.surface2 },
  // 던전 아이콘 타일 그리드 + 상세 팝업.
  dunGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dunTile: { width: 76, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: T.surface2, borderWidth: 1.5, borderColor: T.line, gap: 2 },
  dunLock: { opacity: 0.45 },
  dunSpent: { opacity: 0.6 },
  dunEmoji: { fontSize: 24 },
  dunName: { color: T.text, fontSize: 10, fontWeight: '700', maxWidth: 70, textAlign: 'center' },
  dunLeft: { color: T.good, fontSize: 10, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dunModal: { backgroundColor: T.surface, borderRadius: 20, padding: 20, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: T.line },
  dunHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dunHeadEmoji: { fontSize: 38 },
  dunHeadName: { color: T.text, fontSize: 17, fontWeight: '900' },
});
