import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { T } from '../theme';
import { Card, Btn, fmt, pctW } from '../components';
import { isOn } from '../../system/core/features.mjs';
import { diffIcon } from '../uiIcons';
import { CodeTag } from '../uicode';
import { effectivePower, powerMultOf } from '../useGame';
import { idleGenre } from '../../system/genres/idle.mjs';
import { stageZone } from '../../system/core/progression.mjs';
import { playStage, DIFFICULTIES, difficultyDef, difficultyUnlocked, setDifficulty } from '../../system/core/difficulty.mjs';
import { computePower } from '../../system/core/stats.mjs';
import { identity, elementMeta } from '../../system/concepts/index.mjs';
import { affinityLabel } from '../../system/core/elements.mjs';
import { teamSynergy } from '../../system/core/synergy.mjs';
import { resolve } from '../../system/core/resolution.mjs';
import { getPartyUnits } from '../../system/core/gameState.mjs';
import { formationSummary } from '../../system/core/formation.mjs';
import { accountMods } from '../../system/core/balance.mjs';
import { canClaimAttendance, missionList, claimAllDaily } from '../../system/core/daily.mjs';
import { weeklyEvent, claimWeekly } from '../../system/core/events.mjs';
import { unreadMailCount, claimAllMail } from '../../system/core/mailbox.mjs';
import { spendNudges } from '../../system/core/nudges.mjs';
import { villageTier } from '../../system/core/village.mjs';
import { fx } from '../feedback';
import BattleView from './BattleView';

// 전투 배경 — 10층마다 순환(층÷10). Metro는 정적 require만 되므로 배열로 등록 후 인덱싱.
const BATTLE_BGS = [
  require('../../assets/pixel/bg-battle-0.png'),
  require('../../assets/pixel/bg-battle-1.png'),
  require('../../assets/pixel/bg-battle-2.png'),
  require('../../assets/pixel/bg-battle-3.png'),
  require('../../assets/pixel/bg-battle-4.png'),
  require('../../assets/pixel/bg-battle-5.png'),
  require('../../assets/pixel/bg-battle-6.png'),
  require('../../assets/pixel/bg-battle-7.png'),
  require('../../assets/pixel/bg-battle-8.png'), // 무덤(온전 울타리)
  require('../../assets/pixel/bg-battle-9.png'), // 무덤(파손)
];
// 적 몬스터 스프라이트 키 — 10층마다 순환(배경과 함께 변화). unitSprites 'enemy:<key>' 등록됨.
const ENEMY_KEYS = ['skeleton_minion', 'skeleton_warrior', 'werewolf_wolf', 'skeleton_mage', 'skeleton_golem'];

// 난이도별 색조 오버레이(무대 위에 은은히) — 일반은 없음.
const DIFF_TINT = {
  normal: 'transparent',
  hard: 'rgba(255,150,50,0.12)',
  hell: 'rgba(215,50,50,0.16)',
  abyss: 'rgba(120,50,170,0.20)',
};

export default function IdleScreen({ state, bump, lastGain, concept, background }) {
  const [boxMsg, setBoxMsg] = useState(null);
  const power = effectivePower(state);
  const mult = powerMultOf(state);
  const stageDef = playStage(state); // 난이도 배수 반영
  const zone = stageZone(state.stage);
  const curDiff = difficultyDef(state.difficulty);
  const byId = new Map(state.units.map((u) => [u.uid, u]));
  const party = state.party.map((id) => byId.get(id)).filter(Boolean);
  const lead = party.slice().sort((a, b) => computePower(b) - computePower(a))[0];

  const canPrestige = state.maxStage >= 15;
  const nextGain = Math.floor(Math.sqrt(state.maxStage));
  // 받을 보상 집계(출석+미션+주간+우편) — 홈에서 원탭 전체수령.
  const wev = weeklyEvent(state);
  const claimN = (canClaimAttendance(state) ? 1 : 0)
    + missionList(state).filter((m) => m.done && !m.claimed).length
    + (wev.done && !wev.claimed ? 1 : 0)
    + unreadMailCount(state);
  const doClaimAll = () => { claimAllDaily(state); claimWeekly(state); claimAllMail(state); fx('success'); bump(); };
  const nudges = spendNudges(state);
  const synergy = teamSynergy(party);
  const battle = resolve(getPartyUnits(state), stageDef.challenge, accountMods(state), state.formation);
  // 편성(전열2·중열3·후열2)을 전투 화면에 그대로 표시 — 방치 틱마다 새 객체를
  // 만들면 BattleView(React.memo)가 매번 재렌더되므로, 편성이 실제로 바뀔 때만
  // (uid 구성·역할) 재계산해 레퍼런스를 안정시킨다.
  const formKey = `${state.party.join(',')}|${JSON.stringify(state.formation)}`;
  const heroFormation = useMemo(() => {
    const sum = formationSummary(state);
    // 전투 무대 표시용 — 스프라이트 조회 키(cid/key) + 이모지 폴백.
    const slotOf = (uid) => {
      const u = byId.get(uid);
      if (!u) return { emoji: '⚔️' };
      return { emoji: identity(concept, u).emoji, cid: concept.id, key: u.characterId };
    };
    return { front: sum.front.map(slotOf), mid: sum.mid.map(slotOf), back: sum.back.map(slotOf) };
  }, [formKey]);

  return (
    <View style={st.wrap}>
      {/* 원탭 전체수령 — 받을 보상(출석·미션·주간)이 있을 때만 노출. */}
      {claimN > 0 && (
        <TouchableOpacity style={st.claimRow} activeOpacity={0.85} onPress={doClaimAll}
          accessibilityRole="button" accessibilityLabel={`받을 보상 ${claimN}건 한번에 받기`}>
          <CodeTag id="a1" corner="tl" />
          <Text style={st.claimTxt}>🎁 받을 보상 {claimN}건 — 한번에 받기</Text>
          <Text style={st.claimGo}>›</Text>
        </TouchableOpacity>
      )}
      {/* 재화 낭비 알림 — 쌓아두면 손해인 재화가 충분할 때 살짝 안내. */}
      {nudges.map((n) => (
        <Text key={n.key} style={st.nudge}>{n.msg}</Text>
      ))}
      {/* 난이도 선택 */}
      <View style={st.diffRow}>
        <CodeTag id="a2" corner="tl" />
        {DIFFICULTIES.map((d) => {
          const unlocked = difficultyUnlocked(state, d.id);
          const on = curDiff.id === d.id;
          return (
            <TouchableOpacity key={d.id} activeOpacity={0.8} disabled={!unlocked}
              onPress={() => { if (setDifficulty(state, d.id).ok) bump(); }}
              style={[st.diffCell, on && st.diffCellOn, !unlocked && st.diffCellLock]}>
              <View style={st.diffHead}>
                {diffIcon(d.id) ? <Image source={diffIcon(d.id)} style={st.diffIcon} /> : <Text style={st.diffLabel}>{d.emoji}</Text>}
                <Text style={[st.diffLabel, on && st.diffLabelOn]}>{d.label}</Text>
              </View>
              <Text style={st.diffSub}>{unlocked ? `보상 ×${d.rewardMult}` : `${d.unlock}층`}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 자동 전투 무대 — 던전 배경 위에 파티/적이 바닥에 서서 싸운다.
          층·구역은 상단 배너(절대)로, 적 정보·시너지는 카드 밖(아래)로 빼서 전투 영역을 비운다. */}
      <Card style={st.stage}>
        {/* 던전 배경(KayKit 렌더) — 10층마다 순환 + 난이도 색조. 콘텐츠 뒤에 절대배치. */}
        <Image source={BATTLE_BGS[Math.floor(state.stage / 10) % BATTLE_BGS.length]} style={st.stageBg} resizeMode="cover" pointerEvents="none" />
        <View style={[st.stageTint, { backgroundColor: DIFF_TINT[curDiff.id] || 'transparent' }]} pointerEvents="none" />
        <CodeTag id="a3" corner="tl" />
        {/* 상단 배너: 층 + 구역 */}
        <View style={st.banner} pointerEvents="none">
          <Text style={st.stageLabel}>
            {concept.terms.stage} {state.stage}
            {curDiff.id !== 'normal' ? <Text style={st.diffBadge}>  {curDiff.emoji}{curDiff.label} ×{curDiff.rewardMult}</Text> : null}
          </Text>
          <Text style={st.zone}>{isOn('elements') ? `${elementMeta(concept, zone.element)?.emoji}${elementMeta(concept, zone.element)?.name} ` : ''}구역 ({zone.start}~{zone.end}층){isOn('elements') ? ` · 다음 ${elementMeta(concept, zone.nextElement)?.emoji}` : ''}</Text>
          {/* 본진 발전 — 진행할수록 거점이 성장(소유의 만족감). */}
          {(() => {
            const vt = villageTier(state.peakStage || state.maxStage || 1);
            return (
              <Text style={st.village}>{vt.emoji} 본진: {vt.label}
                {vt.next
                  ? <Text style={st.villageDim}>  → {vt.next.label} {Math.round(vt.progress * 100)}%</Text>
                  : <Text style={st.villageDim}>  · 최종</Text>}
              </Text>
            );
          })()}
        </View>
        {/* 전투(무대 꽉 채움, 바닥 정렬) */}
        <BattleView
          party={heroFormation}
          enemyEmoji={elementMeta(concept, stageDef.challenge.element)?.emoji || '👹'}
          enemyKey={ENEMY_KEYS[Math.floor(state.stage / 10) % ENEMY_KEYS.length]}
          win={battle.win}
          margin={battle.margin}
          reduce={state.settings.reduceMotion || background}
        />
        {/* 구역 진행 게이지 — 무대 하단(절대) */}
        <View style={st.zoneBar}>
          <View style={[st.zoneBarFill, { width: `${pctW(((state.stage - zone.start) / Math.max(1, zone.end - zone.start)) * 100)}%` }]} />
        </View>
      </Card>

      {/* 적 정보 + 시너지 — 무대 아래 별도 스트립(전투 영역과 분리). */}
      <View style={st.stageInfo}>
        <Text style={st.enemy}>적 HP {fmt(stageDef.challenge.hp)} · ATK {fmt(stageDef.challenge.atk)}</Text>
        {isOn('elements') && (() => {
          const enemyEl = stageDef.challenge.element;
          const em = elementMeta(concept, enemyEl);
          const lm = lead && lead.element ? elementMeta(concept, lead.element) : null;
          const lab = lead ? affinityLabel(lead.element, enemyEl) : '무관';
          const col = lab === '유리' ? T.good : lab === '불리' ? T.danger : T.muted;
          return (
            <Text style={st.affinity}>
              적 속성 {em.emoji}{em.name}
              {lm ? <Text> · 내 {lm.emoji}{lm.name} → <Text style={{ color: col, fontWeight: '800' }}>{lab}</Text></Text> : null}
            </Text>
          );
        })()}
        {synergy.list.length > 0 && (
          <View style={st.synRow}>
            {synergy.list.map((s) => <Text key={s.id} style={st.synTag}>✦ {s.label}</Text>)}
          </View>
        )}
      </View>

      {/* 핵심 지표 스트립 — 전투력·최고층·초당수입 한 줄(세나키우기식 요약). */}
      <Card style={st.strip}>
        <CodeTag id="a5" corner="tl" />
        <View style={st.stripCell}>
          <Text style={st.mLabel}>전투력</Text>
          <Text style={st.mVal}>{fmt(power)}</Text>
        </View>
        <View style={st.stripDiv} />
        <View style={st.stripCell}>
          <Text style={st.mLabel}>최고 {concept.terms.stage}</Text>
          <Text style={st.mVal}>{state.peakStage}</Text>
        </View>
        <View style={st.stripDiv} />
        <View style={st.stripCell}>
          <Text style={st.mLabel}>초당 수입</Text>
          <Text style={st.gainSm} numberOfLines={1}>{concept.resources.currency.emoji}{fmt(lastGain.currency)}</Text>
          <Text style={st.gainSm} numberOfLines={1}>{concept.resources.growth.emoji}{fmt(lastGain.growth)}</Text>
        </View>
      </Card>

      {/* 환생 — 컴팩트 CTA(요약 + 버튼 한 줄). */}
      <Card style={[st.prestigeRow, { borderColor: canPrestige ? T.accent : T.line }]}>
        <CodeTag id="a6" corner="tl" />
        <View style={{ flex: 1 }}>
          <Text style={st.prestigeStat}>✨ 환생 {state.prestige}회 · <Text style={{ color: T.accent }}>×{mult.toFixed(2)}</Text></Text>
          <Text style={st.hintSm}>{canPrestige ? `지금 환생 시 +${nextGain}P (영구 배수)` : '최고 15층 도달 시 해금'}</Text>
          {boxMsg ? <Text style={st.boxMsg} numberOfLines={1}>{boxMsg}</Text> : null}
        </View>
        <Btn small
          label={canPrestige ? `환생 +${nextGain}` : '🔒 15층'}
          kind="gold"
          disabled={!canPrestige}
          onPress={() => {
            const r = idleGenre.prestige(state);
            if (r.box) {
              const parts = [];
              if (r.box.gear) parts.push(`⚔️장비 ${r.box.gear}`);
              if (r.box.rune) parts.push(`🔷룬 ${r.box.rune}`);
              if (r.box.gem) parts.push(`💎${r.box.gem}`);
              if (r.box.summon) parts.push(`🔮${r.box.summon}`);
              setBoxMsg(parts.length ? `🎁 전리품 상자: ${parts.join(' · ')}` : null);
            }
            bump();
          }}
        />
      </Card>
    </View>
  );
}

const st = StyleSheet.create({
  // 스크롤 없이 한 화면에 고정 — 전투무대(stage)가 남는 세로 공간을 흡수.
  wrap: { flex: 1, padding: 12, gap: 8 },
  stage: { flex: 1, backgroundColor: T.surface2, overflow: 'hidden', padding: 0 },
  banner: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', zIndex: 3 },
  stageInfo: { alignItems: 'center', gap: 3, paddingTop: 2 },
  // 던전 배경 — 무대(Card) 안쪽에 꽉 채우고 둥근 모서리 클립. 콘텐츠는 위에 렌더.
  stageBg: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%', borderRadius: 16, opacity: 0.9 },
  stageTint: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 16 },
  stageLabel: { color: T.accent, fontWeight: '800', fontSize: 18, marginBottom: 2, textShadowColor: '#000', textShadowRadius: 5 },
  diffBadge: { color: T.danger, fontSize: 13, fontWeight: '800' },
  zone: { color: '#d8d0f0', fontSize: 12, marginBottom: 2, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 4 },
  village: { color: T.accent, fontSize: 11, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 4 },
  villageDim: { color: '#c9c0e8', fontSize: 11, fontWeight: '600' },
  diffRow: { flexDirection: 'row', gap: 6 },
  diffCell: { flex: 1, backgroundColor: T.surface2, borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  diffCellOn: { borderColor: T.accent, backgroundColor: T.surface },
  diffCellLock: { opacity: 0.45 },
  diffHead: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  diffIcon: { width: 18, height: 18 },
  diffLabel: { color: T.muted, fontSize: 13, fontWeight: '800' },
  diffLabelOn: { color: T.accent },
  diffSub: { color: T.muted, fontSize: 10, marginTop: 2 },
  enemy: { color: T.muted, fontSize: 12 },
  affinity: { color: T.text, fontSize: 12, fontWeight: '600' },
  synRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, justifyContent: 'center' },
  synTag: { color: T.accent, fontSize: 11, fontWeight: '800', backgroundColor: T.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  mLabel: { color: T.muted, fontSize: 11, marginBottom: 3 },
  mVal: { color: T.text, fontWeight: '900', fontSize: 20 },
  // 지표 스트립(전투력·최고층·수입 한 줄) + 세로 구분선.
  strip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  stripCell: { flex: 1, alignItems: 'center' },
  stripDiv: { width: 1, height: 30, backgroundColor: T.line },
  gainSm: { color: T.good, fontWeight: '800', fontSize: 12 },
  // 환생 컴팩트 행.
  prestigeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  hintSm: { color: T.muted, fontSize: 11, marginTop: 2 },
  // 구역 진행 게이지.
  zoneBar: { position: 'absolute', left: 12, right: 12, bottom: 8, height: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 3, overflow: 'hidden', zIndex: 3 },
  zoneBarFill: { height: 5, backgroundColor: T.accent, borderRadius: 3 },
  // 원탭 전체수령 배너.
  claimRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 12, borderWidth: 1.5, borderColor: T.good, paddingHorizontal: 14, paddingVertical: 10 },
  claimTxt: { color: T.good, fontSize: 13, fontWeight: '900', flex: 1 },
  claimGo: { color: T.good, fontSize: 20, fontWeight: '900' },
  nudge: { color: T.accent, fontSize: 12, fontWeight: '800', paddingHorizontal: 4 },
  prestigeStat: { color: T.text, fontSize: 14, fontWeight: '600' },
  boxMsg: { color: T.accent, fontSize: 13, fontWeight: '800', marginTop: 10, textAlign: 'center' },
});
