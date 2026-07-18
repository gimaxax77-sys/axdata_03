// 원정(로그라이트) 화면 — 좌→우 진격 런. run.mjs 코어를 호출만 한다(로직 불변).
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { T, SPACE, RADIUS, FONT, WEIGHT, ELEV } from '../theme';
import { Btn, Card, fmt } from '../components';
import { fx } from '../feedback';
import { startRun, fightNode, pickBoon, endRun, RUN_NODES, BOONS } from '../../system/core/run.mjs';

const BOON_LABEL = Object.fromEntries(BOONS.map((b) => [b.id, b.label]));
const NODE_ICON = { battle: '⚔️', elite: '🔶', boss: '💀' };

// 노드맵 한 줄 — 클리어(idx 미만)/현재(idx)/미도달을 점으로.
function NodeMap({ nodes, idx }) {
  return (
    <View style={s.map}>
      {nodes.map((n, i) => {
        const done = i < idx;
        const cur = i === idx;
        return (
          <View key={i} style={[s.node, done && s.nodeDone, cur && s.nodeCur]}>
            <Text style={[s.nodeTxt, (done || cur) && s.nodeTxtOn]}>{NODE_ICON[n.type] || '⚔️'}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function RunScreen({ state, bump }) {
  const [msg, setMsg] = useState(null);
  const r = state.run;

  // ── 원정 없음 → 시작 ─────────────────────────────
  if (!r) {
    return (
      <ScrollView contentContainerStyle={s.wrap}>
        <Card style={s.card}>
          <Text style={s.title}>⚔️ 원정</Text>
          <Text style={s.desc}>파티를 이끌고 {RUN_NODES}개 노드를 진격합니다. 전투마다 보상 3택으로 강해지고, 생명이 다하면 런이 끝납니다. 도달한 만큼 메타 보상을 얻습니다.</Text>
          <Btn label="원정 시작" kind="primary" onPress={() => {
            const res = startRun(state);
            if (!res.ok) { setMsg(res.reason); fx('error'); return; }
            setMsg(null); fx('success'); bump();
          }} />
          {msg && <Text style={s.warn}>{msg}</Text>}
        </Card>
      </ScrollView>
    );
  }

  // ── 런 종료(정산 대기) ───────────────────────────
  if (r.status !== 'active') {
    const won = r.status === 'won';
    return (
      <ScrollView contentContainerStyle={s.wrap}>
        <Card style={s.card}>
          <Text style={s.title}>{won ? '🏆 원정 클리어!' : '☠️ 원정 종료'}</Text>
          <Text style={s.desc}>도달 노드 {r.idx} / {RUN_NODES}{won ? ' · 보스 격파' : ''}</Text>
          <Text style={s.loot}>전리품 · 🪙 {fmt(r.loot.currency)}  💠 {fmt(r.loot.growth)}</Text>
          <Btn label="보상 수령" kind="primary" onPress={() => {
            const res = endRun(state);
            fx('success');
            setMsg(res.ok ? `수령: 💎 ${res.reward.gem} · 🔮 ${res.reward.summon}` : null);
            bump();
          }} />
        </Card>
      </ScrollView>
    );
  }

  // ── 진행 중 ──────────────────────────────────────
  const node = r.nodes[r.idx];
  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Card style={s.card}>
        <View style={s.headRow}>
          <Text style={s.title}>⚔️ 원정 · {r.floor}층</Text>
          <Text style={s.progress}>{r.idx} / {RUN_NODES}</Text>
        </View>
        <NodeMap nodes={r.nodes} idx={r.idx} />
        {/* 생명(runHP) 바 */}
        <View style={s.hpBg}><View style={[s.hpFill, { width: `${Math.max(0, r.runHP) * 100}%` }]} /></View>
        <Text style={s.hpTxt}>생명 {Math.round(r.runHP * 100)}%</Text>
        {r.boons.length > 0 && <Text style={s.boons}>보유 강화 {r.boons.map((id) => BOON_LABEL[id]).join(' · ')}</Text>}
      </Card>

      {/* 보상 3택 — offer 있으면 전투보다 우선 */}
      {r.offer ? (
        <Card style={s.card}>
          <Text style={s.subtitle}>보상 선택</Text>
          {r.offer.map((id) => (
            <Btn key={id} label={BOON_LABEL[id]} kind="ghost" onPress={() => {
              pickBoon(state, id); fx('tap'); bump();
            }} />
          ))}
        </Card>
      ) : node ? (
        <Card style={s.card}>
          <Text style={s.subtitle}>{NODE_ICON[node.type]} 다음: {node.type === 'boss' ? '보스' : node.type === 'elite' ? '엘리트' : '일반'} 전투</Text>
          <Btn label="전투" kind="primary" onPress={() => {
            const res = fightNode(state);
            if (!res.ok) { setMsg(res.reason); fx('error'); bump(); return; }
            fx(res.win ? 'success' : 'error');
            setMsg(res.win ? `승리! (여유 ×${res.margin.toFixed(2)})` : '패배… 원정 종료');
            bump();
          }} />
        </Card>
      ) : null}

      {msg && <Text style={s.warn}>{msg}</Text>}

      <Btn label="원정 포기" kind="ghost" small onPress={() => {
        const res = endRun(state); fx('tap');
        setMsg(res.ok ? '포기 — 현재까지 보상 수령' : null); bump();
      }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: SPACE.lg, gap: SPACE.md },
  card: { gap: SPACE.sm, ...ELEV.card },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: T.text, fontSize: FONT.head, fontWeight: WEIGHT.black },
  subtitle: { color: T.text, fontSize: FONT.label, fontWeight: WEIGHT.heavy, marginBottom: SPACE.xs },
  progress: { color: T.accent, fontSize: FONT.label, fontWeight: WEIGHT.heavy },
  desc: { color: T.muted, fontSize: FONT.body, lineHeight: 18 },
  loot: { color: T.text, fontSize: FONT.label, fontWeight: WEIGHT.bold },
  warn: { color: T.accent, fontSize: FONT.sub, fontWeight: WEIGHT.bold, textAlign: 'center' },
  boons: { color: T.growth, fontSize: FONT.sub, fontWeight: WEIGHT.bold },
  map: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, marginVertical: SPACE.xs },
  node: { width: 28, height: 28, borderRadius: RADIUS.md, backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: T.primary, opacity: 0.6 },
  nodeCur: { backgroundColor: T.accent },
  nodeTxt: { fontSize: FONT.sub, opacity: 0.5 },
  nodeTxtOn: { opacity: 1 },
  hpBg: { height: 12, borderRadius: RADIUS.sm, backgroundColor: T.surface, overflow: 'hidden', marginTop: SPACE.xs },
  hpFill: { height: 12, borderRadius: RADIUS.sm, backgroundColor: T.good },
  hpTxt: { color: T.muted, fontSize: FONT.caption, fontWeight: WEIGHT.bold },
});
