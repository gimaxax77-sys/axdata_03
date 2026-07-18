import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { T } from '../theme';
import { Card, Btn, fmt, MultiToggle, multLabel, repeat, pctW } from '../components';
import { CodeTag } from '../uicode';
import { isUnlocked, unlockStage } from '../../system/core/unlocks.mjs';
import { ARENA_ENTRIES, arenaEntriesLeft, arenaFight, arenaInfo, ladderInfo } from '../../system/core/arena.mjs';
import { GUILD_ATTACKS, guildAttacksLeft, guildAttack, guildBossMaxHp } from '../../system/core/guild.mjs';
import { COMP_SHOP, compPurchase, compGrantPreview } from '../../system/core/compshop.mjs';
import { climbTower, towerChallenge } from '../../system/core/tower.mjs';
import { elementMeta } from '../../system/concepts/index.mjs';
import { fx } from '../feedback';

// 경쟁 재화 상점 섹션 (arena=포인트 / guild=코인 소모)
function CompShop({ state, bump, concept, kind, balance, unit }) {
  const items = COMP_SHOP[kind];
  const [mult, setMult] = useState(1);
  const buy = (id) => { repeat(() => compPurchase(state, kind, id), mult); bump(); };
  return (
    <View style={c.shop}>
      <View style={c.shopHeadRow}>
        <Text style={c.shopHead}>{kind === 'arena' ? '🏅 아레나 상점' : '🎖️ 길드 상점'} <Text style={c.dim}>보유 {unit} {fmt(balance)}</Text></Text>
        <MultiToggle value={mult} onChange={setMult} />
      </View>
      {items.map((p) => {
        const g = compGrantPreview(state, p.grant);
        const txt = Object.entries(g).map(([k, v]) => `${concept.resources[k]?.emoji || ''}${fmt(v)}`).join(' ');
        const afford = balance >= p.cost;
        return (
          <View key={p.id} style={c.shopRow}>
            <View style={{ flex: 1 }}>
              <Text style={c.shopLabel}>{p.label}</Text>
              <Text style={c.shopReward}>{txt}</Text>
            </View>
            <Btn small kind="gold" disabled={!afford} label={`${multLabel(mult)} ${unit} ${mult === 'Max' ? p.cost : p.cost * mult}`} onPress={() => buy(p.id)} />
          </View>
        );
      })}
    </View>
  );
}

export default function ArenaGuildScreen({ state, bump, concept, embedded }) {
  const [arenaLog, setArenaLog] = useState(null);
  const [guildLog, setGuildLog] = useState(null);
  const [towerLog, setTowerLog] = useState(null);

  const arenaOpen = isUnlocked(state, 'arena');
  const guildOpen = isUnlocked(state, 'guild');

  const doArena = () => {
    const r = arenaFight(state, Math.random);
    if (r.ok) { setArenaLog(r); fx(r.win ? 'win' : 'error'); }
    bump();
  };
  const doGuild = () => {
    const r = guildAttack(state);
    if (r.ok) { setGuildLog(r); fx(r.killed ? 'ssr' : 'win'); }
    bump();
  };
  const towerOpen = isUnlocked(state, 'tower');
  const doTower = () => {
    const r = climbTower(state);
    if (r.ok) { setTowerLog(r); fx(r.win ? (r.milestone ? 'ssr' : 'win') : 'error'); }
    bump();
  };

  const fmtDur = (ms) => { const h = Math.floor(ms / 3600000); const d = Math.floor(h / 24); return d > 0 ? `${d}일 ${h % 24}시간` : `${h}시간`; };
  const ladders = arenaOpen ? ladderInfo(state) : [];

  const aLeft = arenaOpen ? arenaEntriesLeft(state) : 0;
  const gLeft = guildOpen ? guildAttacksLeft(state) : 0;
  const bossMax = guildOpen ? guildBossMaxHp(state) : 1;
  const bossHp = guildOpen ? (state.guild.bossHp ?? bossMax) : bossMax;

  // embedded면 자체 스크롤 없이 호스트(콘텐츠 탭) ScrollView에 편승.
  const Container = embedded ? View : ScrollView;
  const cProps = embedded ? {} : { style: c.flex, contentContainerStyle: c.wrap };
  return (
    <Container {...cProps}>
      {/* 우편함은 상단 우편 아이콘(전역)으로 이동 — MailboxModal */}

      {/* ── 아레나 ───────────────────────────────── */}
      <Card>
        <CodeTag id="m1" corner="tl" />
        <View style={c.head}>
          <Text style={c.sec}>⚔️ 아레나 <Text style={c.dim}>전투력 리그</Text></Text>
          {arenaOpen && (() => { const ai = arenaInfo(state); return (
            <Text style={c.tier}>{ai.tier.emoji} {ai.tier.name} · {state.arena.points}p</Text>
          ); })()}
        </View>
        {!arenaOpen ? (
          <Text style={c.lock}>🔒 스테이지 {unlockStage('arena')} 도달 시 해금</Text>
        ) : (<>
          {(() => { const ai = arenaInfo(state); return (
            <Text style={c.sub}>내 전투력 <Text style={{ color: T.accent, fontWeight: '800' }}>{fmt(ai.power)}</Text> · {ai.tier.emoji} {ai.tier.name} 리그. 같은 리그 상대와만 매칭되며, 상대 전투력은 내 전투력의 1.12배를 넘지 않습니다(약자 보호). 승리 시 {concept.resources.gem.emoji}다이아 + {concept.resources.currency.emoji}골드.</Text>
          ); })()}
          <Text style={c.left}>오늘 입장 {aLeft}/{ARENA_ENTRIES}</Text>
          {arenaLog && (
            <View style={[c.result, { borderColor: arenaLog.win ? T.good : T.danger }]}>
              <Text style={[c.resultTitle, { color: arenaLog.win ? T.good : T.danger }]}>
                {arenaLog.win ? '승리! +25p' : '패배 −12p'}
              </Text>
              <Text style={c.resultSub}>내 {fmt(arenaLog.myPower)} vs 상대 {fmt(arenaLog.oppPower)} · {arenaLog.tierEmoji} {arenaLog.tier} · {arenaLog.points}p</Text>
              {arenaLog.win && <Text style={c.resultReward}>보상 {concept.resources.gem.emoji}+{arenaLog.reward.gem} {concept.resources.currency.emoji}+{fmt(arenaLog.reward.currency)}</Text>}
            </View>
          )}
          <View style={{ height: 10 }} />
          <Btn label={aLeft > 0 ? '전투 시작' : '오늘 입장 소진'} kind="gold" disabled={aLeft <= 0} sfx={false} onPress={doArena} />

          {/* 3중 리그 — 승리 포인트가 세 리그에 동시 적립, 각자 독립 정산 */}
          <Text style={c.ladderHead}>🏆 리그 <Text style={c.dim}>(승리 시 세 리그 동시 적립 · 종료 시 순위 보상 우편)</Text></Text>
          <View style={c.ladderRow}>
            {ladders.map((l) => (
              <View key={l.id} style={c.ladderCell}>
                <Text style={c.ladderLabel}>{l.label}</Text>
                <Text style={c.ladderPts}>{fmt(l.points)}p</Text>
                <Text style={c.ladderTime}>{fmtDur(l.endsInMs)} 남음</Text>
              </View>
            ))}
          </View>
          <CompShop state={state} bump={bump} concept={concept} kind="arena" balance={state.arena.points} unit="🏅" />
        </>)}
      </Card>

      {/* ── 무한의 탑 ─────────────────────────────── */}
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="m2" corner="tl" />
        <View style={c.head}>
          <Text style={c.sec}>🗼 무한의 탑 <Text style={c.dim}>엔드게임</Text></Text>
          {towerOpen && <Text style={c.tier}>{state.tower.floor}층 · 최고 {state.tower.best}</Text>}
        </View>
        {!towerOpen ? (
          <Text style={c.lock}>🔒 스테이지 {unlockStage('tower')} 도달 시 해금</Text>
        ) : (<>
          <Text style={c.sub}>끝없이 오르는 도전. 각 층은 더 강한 보스입니다. 5층마다 마일스톤 보상.</Text>
          {(() => {
            const boss = towerChallenge(state.tower.floor);
            return <Text style={c.left}>{state.tower.floor}층 보스 {elementMeta(concept, boss.element)?.emoji} · HP {fmt(boss.hp)} · ATK {fmt(boss.atk)}</Text>;
          })()}
          {towerLog && (
            <View style={[c.result, { borderColor: towerLog.win ? T.good : T.danger }]}>
              <Text style={[c.resultTitle, { color: towerLog.win ? (towerLog.milestone ? T.accent : T.good) : T.danger }]}>
                {towerLog.win ? `${towerLog.floor}층 돌파! → ${towerLog.next}층` : `${towerLog.floor}층 실패 (여유 ${towerLog.margin?.toFixed(2)})`}
              </Text>
              {towerLog.win && <Text style={c.resultReward}>보상 {concept.resources.gem.emoji}+{towerLog.reward.gem}{towerLog.reward.summon ? ` ${concept.resources.summon.emoji}+${towerLog.reward.summon}` : ''}{towerLog.milestone ? ' · 마일스톤!' : ''}</Text>}
            </View>
          )}
          <View style={{ height: 10 }} />
          <Btn label={`${state.tower.floor}층 도전`} kind="gold" sfx={false} onPress={doTower} />
        </>)}
      </Card>

      {/* ── 길드 보스 ─────────────────────────────── */}
      <Card style={{ marginTop: 12, marginBottom: 24 }}>
        <CodeTag id="m3" corner="tl" />
        <View style={c.head}>
          <Text style={c.sec}>🛡️ 길드 보스 <Text style={c.dim}>레이드</Text></Text>
          {guildOpen && <Text style={c.tier}>티어 {state.guild.tier} · 🪙{fmt(state.guild.coins)}</Text>}
        </View>
        {!guildOpen ? (
          <Text style={c.lock}>🔒 스테이지 {unlockStage('guild')} 도달 시 해금</Text>
        ) : (<>
          <Text style={c.sub}>매일 파티 딜로 보스를 공격합니다. 처치하면 티어가 오르고 {concept.resources.gem.emoji}다이아 + {concept.resources.summon.emoji}소환권 보너스.</Text>
          <View style={c.bossBar}>
            <View style={[c.bossFill, { width: `${pctW((bossHp / bossMax) * 100)}%` }]} />
            <Text style={c.bossText}>보스 HP {fmt(bossHp)} / {fmt(bossMax)}</Text>
          </View>
          <Text style={c.left}>오늘 공격 {gLeft}/{GUILD_ATTACKS}</Text>
          {guildLog && (
            <View style={[c.result, { borderColor: guildLog.killed ? T.accent : T.line }]}>
              <Text style={[c.resultTitle, { color: guildLog.killed ? T.accent : T.text }]}>
                {guildLog.killed ? `보스 처치! 티어 ${guildLog.tier}` : `피해 ${fmt(guildLog.dmg)}`}
              </Text>
              <Text style={c.resultSub}>기여 🪙+{guildLog.coin} · {concept.resources.currency.emoji}+{fmt(guildLog.reward.currency)}</Text>
              {guildLog.killed && <Text style={c.resultReward}>처치 보너스 {concept.resources.gem.emoji}+{guildLog.bonus.gem} {concept.resources.summon.emoji}+{guildLog.bonus.summon}</Text>}
            </View>
          )}
          <View style={{ height: 10 }} />
          <Btn label={gLeft > 0 ? '보스 공격' : '오늘 공격 소진'} disabled={gLeft <= 0} sfx={false} onPress={doGuild} />
          <CompShop state={state} bump={bump} concept={concept} kind="guild" balance={state.guild.coins} unit="🎖️" />
        </>)}
      </Card>
    </Container>
  );
}

const c = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { padding: 14 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sec: { color: T.text, fontWeight: '800', fontSize: 16 },
  dim: { color: T.muted, fontSize: 12, fontWeight: '400' },
  tier: { color: T.accent, fontWeight: '800', fontSize: 13 },
  sub: { color: T.muted, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  lock: { color: T.muted, fontSize: 13, paddingVertical: 12 },
  left: { color: T.text, fontSize: 12, fontWeight: '700' },
  result: { marginTop: 12, backgroundColor: T.surface2, borderRadius: 12, padding: 12, borderWidth: 1 },
  resultTitle: { fontWeight: '900', fontSize: 15 },
  resultSub: { color: T.muted, fontSize: 12, marginTop: 4 },
  resultReward: { color: T.good, fontSize: 12, fontWeight: '700', marginTop: 4 },
  ladderHead: { color: T.text, fontWeight: '800', fontSize: 13, marginTop: 14, marginBottom: 6 },
  ladderRow: { flexDirection: 'row', gap: 8 },
  ladderCell: { flex: 1, backgroundColor: T.surface2, borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: T.line },
  ladderLabel: { color: T.muted, fontSize: 11, fontWeight: '700' },
  ladderPts: { color: T.accent, fontSize: 15, fontWeight: '900', marginTop: 2 },
  ladderTime: { color: T.muted, fontSize: 9, marginTop: 2 },
  bossBar: { height: 26, backgroundColor: T.surface2, borderRadius: 8, overflow: 'hidden', justifyContent: 'center', marginBottom: 8 },
  bossFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: T.danger, opacity: 0.5 },
  bossText: { color: T.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  shop: { marginTop: 14, borderTopWidth: 1, borderTopColor: T.line, paddingTop: 12 },
  shopHead: { color: T.text, fontWeight: '800', fontSize: 13, marginBottom: 4 },
  shopHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  shopLabel: { color: T.text, fontWeight: '700', fontSize: 13 },
  shopReward: { color: T.muted, fontSize: 12, marginTop: 2 },
});
